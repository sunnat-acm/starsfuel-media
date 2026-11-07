"""One live call: mic audio in -> VAD turns -> STT -> DeepSeek (stream) -> sentence TTS -> audio out.

Client protocol (WebSocket):
  client -> server  binary: PCM16 mono 16 kHz mic audio (any chunk size, ~20 ms)
                    text:   {"type":"hangup"} | {"type":"mute","on":bool} | {"type":"idle","seq":n}
  server -> client  binary: PCM16 mono 24 kHz speech
                    text:   {"type":"state","state":"ringing|connected|listening|thinking|speaking|ended"}
                            {"type":"seq","seq":n}           (new AI utterance starts; client echoes in "idle")
                            {"type":"clear"}                  (barge-in: drop queued audio now)
                            {"type":"transcript","role":"user|ai","text":...,"final":bool}
                            {"type":"metrics", ...}           (per-turn latency in ms)
"""
import asyncio, json, logging, re, time
from . import config as C
from .prompts import RULES, greeting, FAREWELL, STILL_THERE, MENU, CONNECTING, TOPICS, TOPIC_HINT, RULES_END, is_abusive
from .vad import TurnDetector

log = logging.getLogger("call")


def providers():
    if C.STT_PROVIDER == "mock" or C.TTS_PROVIDER == "mock" or C.LLM_PROVIDER == "mock":
        from .providers import mock
    stt = tts = None
    if C.STT_PROVIDER in ("groq", "whisper", "hybrid"):
        from .providers import whisper as stt
    elif C.STT_PROVIDER == "voicelab":
        from .providers import voicelab as stt
    elif C.STT_PROVIDER == "voicestudio":
        from .providers import voicestudio as stt
    else:
        stt = mock
    if C.TTS_PROVIDER == "edge":
        from .providers import edgetts as tts
    elif C.TTS_PROVIDER == "voicelab":
        from .providers import voicelab as tts
    elif C.TTS_PROVIDER == "voicestudio":
        from .providers import voicestudio as tts
    else:
        tts = mock
    if C.LLM_PROVIDER == "deepseek":
        from .providers.deepseek import llm_stream
    else:
        llm_stream = mock.llm_stream
    return stt, tts, llm_stream


SENT_END = re.compile(r"([.!?…]+)(\s|$)")


def split_ready(buf: str, first: bool):
    """Return (chunk, rest) when buf holds a speakable piece; first chunk may break at a comma for speed."""
    m = None
    for m_ in SENT_END.finditer(buf):
        if m_.end() >= 12:
            m = m_
            break
    if m:
        return buf[:m.end()].strip(), buf[m.end():]
    if first and len(buf) > 28:
        i = buf.rfind(",", 14)
        if i > 0:
            return buf[:i + 1].strip(), buf[i + 1:]
    return None, buf


PROMPT_CACHE: dict = {}      # fixed IVR lines -> PCM (synthesized once)


async def synth_all(TTS, text, lang="uz", timeout=10, **kw):
    buf = bytearray()

    async def go():
        job = TTS.TTSJob()
        async for ch in job.stream(text, lang, **kw):
            buf.extend(ch)
    await asyncio.wait_for(go(), timeout)
    return bytes(buf)


async def cached(TTS, text):
    if text not in PROMPT_CACHE:
        kw = {"rate": C.IVR_RATE, "pitch": C.IVR_PITCH} if C.TTS_PROVIDER == "edge" else {}
        PROMPT_CACHE[text] = await synth_all(TTS, text, timeout=15, **kw)
    return PROMPT_CACHE[text]


async def warm_prompts():
    _, TTS, _ = providers()
    for t in (MENU, CONNECTING):
        try:
            await cached(TTS, t)
        except Exception as e:
            log.warning("prompt cache failed: %r", e)


class Call:
    def __init__(self, ws, user: dict | None):
        self.ws = ws
        self.user = user or {}
        self.STT, self.TTS, self.llm = providers()
        self.td = TurnDetector(f"{C.MODEL_DIR}/silero_vad.onnx", threshold=C.VAD_THRESHOLD,
                               min_speech_ms=C.VAD_MIN_SPEECH_MS, silence_ms=C.VAD_SILENCE_MS)
        self.state = "ringing"
        self.lang = "uz"
        self.history = []
        self.muted = False
        self.reply_task = None       # current STT->LLM->TTS task
        self.audio_started = False   # has the current reply sent any audio?
        self.spoken = ""             # text of the current reply already sent to TTS
        self.pending_user = ""       # user text of a reply cancelled before it spoke (merge with the next part)
        self.stt_pre = None          # STT connection pre-opened at speech start
        self.seq = 0
        self.client_busy = False     # client still playing our audio
        self.barge_armed = False
        self.end_after = False
        self.last_activity = time.monotonic()
        self.t0 = time.monotonic()
        self.closed = False
        self.out_lock = asyncio.Lock()
        self.digit_fut = None
        self.topic = "general"

    # ---------- send helpers ----------
    async def jsend(self, **m):
        if not self.closed:
            try:
                await self.ws.send_text(json.dumps(m, ensure_ascii=False))
            except Exception:
                self.closed = True

    async def asend(self, pcm: bytes):
        if not self.closed:
            try:
                await self.ws.send_bytes(pcm)
            except Exception:
                self.closed = True

    async def set_state(self, s):
        if s != self.state:
            self.state = s
            await self.jsend(type="state", state=s)

    @property
    def ai_talking(self):
        return (self.reply_task is not None and not self.reply_task.done() and self.audio_started) or self.client_busy

    # ---------- main ----------
    async def run(self):
        recv = asyncio.create_task(self.recv_loop())
        watchdog = None
        try:
            await self.ivr()
            if not self.closed:
                await self.set_state("listening")
                watchdog = asyncio.create_task(self.watchdog())
            await recv
        finally:
            if watchdog:
                watchdog.cancel()
            recv.cancel()
            await self.cancel_reply()
            self.closed = True

    async def play(self, pcm: bytes):
        await self.begin_utterance()
        for i in range(0, len(pcm), 9600):
            await self.asend(pcm[i:i + 9600])
        return len(pcm) / 48000          # seconds of audio

    async def ivr(self):
        """Ring once -> recorded menu -> digit (or wait) -> 'connecting' line -> ringback -> operator greeting."""
        await self.set_state("ringing")
        menu_pcm = asyncio.create_task(cached(self.TTS, MENU))
        await asyncio.sleep(1.5)                                   # one long 'duuud'
        try:
            pcm = await menu_pcm
        except Exception as e:
            log.warning("menu tts failed: %r", e); pcm = b""
        if self.closed:
            return
        await self.set_state("menu")
        await self.jsend(type="transcript", role="ai", text=MENU, final=True)
        dur = await self.play(pcm)
        self.digit_fut = asyncio.get_running_loop().create_future()
        try:
            digit = await asyncio.wait_for(self.digit_fut, dur + C.MENU_WAIT_SEC)
            await self.jsend(type="clear")
        except asyncio.TimeoutError:
            digit = "0"
        self.digit_fut = None
        if self.closed:
            return
        self.topic = TOPICS.get(digit, "general")
        await self.set_state("menu_done")
        try:
            con = await cached(self.TTS, CONNECTING)
        except Exception:
            con = b""
        await self.jsend(type="transcript", role="ai", text=CONNECTING, final=True)
        dur = await self.play(con)
        name = (self.user.get("first_name") or "").strip()[:24] or None
        text = greeting(name, self.topic)
        g = asyncio.create_task(synth_all(self.TTS, text, timeout=10))
        await asyncio.sleep(dur + 0.4)
        if self.closed:
            return
        await self.set_state("transfer")                            # client plays ringback 'duuud... duuud...'
        t_ring = time.monotonic()
        try:
            gpcm = await g
        except Exception as e:
            log.warning("greeting tts failed: %r", e); gpcm = b""
        await asyncio.sleep(max(0, 4.6 - (time.monotonic() - t_ring)))
        if self.closed:
            return
        await self.set_state("connected")
        self.history.append({"role": "assistant", "content": text})
        await self.jsend(type="transcript", role="ai", text=text, final=True)
        await self.play(gpcm)
        self.last_activity = time.monotonic()

    async def begin_utterance(self):
        self.seq += 1
        self.client_busy = True
        await self.jsend(type="seq", seq=self.seq)

    async def recv_loop(self):
        while not self.closed:
            msg = await self.ws.receive()
            if msg.get("type") == "websocket.disconnect":
                break
            if msg.get("bytes") is not None:
                await self.on_audio(msg["bytes"])
            elif msg.get("text"):
                m = json.loads(msg["text"])
                t = m.get("type")
                if t == "hangup":
                    break
                if t == "dtmf":
                    if self.digit_fut is not None and not self.digit_fut.done():
                        self.digit_fut.set_result(str(m.get("digit", ""))[:1])
                if t == "mute":
                    self.muted = bool(m.get("on"))
                    if self.muted:
                        self.td.reset()
                elif t == "idle" and int(m.get("seq", -1)) == self.seq:
                    self.client_busy = False
                    if self.end_after:
                        await self.end_call()
                        break
                    if self.state == "speaking":
                        await self.set_state("listening")
        await self.set_state("ended")
        self.closed = True

    async def end_call(self):
        await self.set_state("ended")
        self.closed = True
        try:
            await self.ws.close()
        except Exception:
            pass

    async def watchdog(self):
        nudged = False
        while not self.closed:
            await asyncio.sleep(1)
            now = time.monotonic()
            if now - self.t0 > C.MAX_CALL_SEC:
                await self.say(FAREWELL[self.lang], end=True)
                return
            idle = now - self.last_activity
            if self.state == "listening" and not self.ai_talking:
                if idle > C.SILENCE_HANGUP_SEC:
                    await self.say(FAREWELL[self.lang], end=True)
                    return
                if idle > C.SILENCE_HANGUP_SEC / 2 and not nudged:
                    nudged = True
                    await self.say(STILL_THERE[self.lang])
            if idle < 3:
                nudged = False

    # ---------- audio in ----------
    async def on_audio(self, pcm: bytes):
        if self.muted or self.state in ("ringing", "menu", "menu_done", "transfer", "ended"):
            return
        for ev in self.td.feed(pcm):
            if ev[0] == "speech_start":
                await self.on_speech_start()
            elif ev[0] == "speech_end":
                await self.on_speech_end(ev[2])
        # barge-in once the user has really been talking for BARGE_IN_MIN_MS
        if self.barge_armed and self.td.in_speech and self.td.speech_run * 1000 >= C.BARGE_IN_MIN_MS:
            self.barge_armed = False
            await self.barge_in()

    async def on_speech_start(self):
        self.last_activity = time.monotonic()
        if self.ai_talking:
            self.barge_armed = True              # decide after BARGE_IN_MIN_MS (filters echo / coughs)
        elif self.reply_task and not self.reply_task.done():
            # user continued before we said anything: cancel the reply and merge the texts
            await self.cancel_reply(keep_user=True)
        if not self.ai_talking:
            await self.preopen_stt()

    async def preopen_stt(self):
        if self.stt_pre is None:
            s = self.STT.STTStream()
            self.stt_pre = (s, asyncio.create_task(s.open()))

    async def on_speech_end(self, pcm: bytes):
        self.last_activity = time.monotonic()
        if self.ai_talking and self.barge_armed:
            self.barge_armed = False             # too short to be a real interruption
            return
        if self.ai_talking:
            return
        await self.set_state("thinking")
        stt = self.stt_pre
        self.stt_pre = None
        self.reply_task = asyncio.create_task(self.reply(pcm, stt, time.monotonic()))

    async def barge_in(self):
        await self.cancel_reply()
        self.client_busy = False
        await self.jsend(type="clear")
        await self.set_state("listening")
        await self.preopen_stt()

    async def cancel_reply(self, keep_user=False):
        t = self.reply_task
        self.reply_task = None
        if t and not t.done():
            t.cancel()
            try:
                await t
            except (asyncio.CancelledError, Exception):
                pass
        if not keep_user:
            self.pending_user = ""

    # ---------- reply pipeline ----------
    async def reply(self, pcm: bytes, stt, t_end):
        m = {"speech_ms": int(len(pcm) / 32)}
        try:
            if stt is None:
                s = self.STT.STTStream()
                await s.open()
            else:
                s, opener = stt
                await opener
            await s.send(pcm)
            text, lang = await s.finish()
        except asyncio.CancelledError:
            raise
        except Exception as e:
            log.warning("stt failed: %r", e)
            text, lang = "", None
        m["stt"] = int((time.monotonic() - t_end) * 1000)
        if not text:
            await self.set_state("listening")
            return
        cyr = sum(1 for ch in text if "\u0400" <= ch <= "\u04ff")
        lat = sum(1 for ch in text if ch.isascii() and ch.isalpha())
        self.lang = "ru" if cyr > lat else ("uz" if lat else (lang if lang in ("uz", "ru") else self.lang))
        full = (self.pending_user + " " + text).strip()
        if is_abusive(full):
            await self.jsend(type="transcript", role="user", text=full, final=True)
            await self.say(RULES_END["ru" if self.lang == "ru" else "uz"], end=True)
            return
        self.pending_user = full                 # kept if we get cancelled before speaking
        await self.jsend(type="transcript", role="user", text=full, final=True)
        msgs = [{"role": "system", "content": RULES + "\n" + TOPIC_HINT.get(self.topic, "")}] + self.history[-12:] + [
            {"role": "user", "content": full}]
        self.audio_started, self.spoken = False, ""
        q: asyncio.Queue = asyncio.Queue()
        tts_task = asyncio.create_task(self.tts_worker(q, m, t_end))
        said, buf, first, end = "", "", True, False
        try:
            t_llm = time.monotonic()
            async for tok in self.llm(msgs, self.lang):
                if "llm_first" not in m:
                    m["llm_first"] = int((time.monotonic() - t_llm) * 1000)
                buf += tok
                if "[END]" in buf:
                    buf = buf.replace("[END]", "")
                    end = True
                while True:
                    chunk, buf = split_ready(buf, first)
                    if not chunk:
                        break
                    first = False
                    said += chunk + " "
                    await q.put(chunk)
            if buf.strip():
                said += buf.strip()
                await q.put(buf.strip())
            await q.put(None)
            await tts_task
            self.pending_user = ""
            self.history += [{"role": "user", "content": full}, {"role": "assistant", "content": said.strip()}]
            await self.jsend(type="transcript", role="ai", text=said.strip(), final=True)
            m["total"] = int((time.monotonic() - t_end) * 1000)
            await self.jsend(type="metrics", **m)
            log.info("turn %s", m)
            if end:
                self.end_after = True
                if not self.client_busy:
                    await self.end_call()
        except asyncio.CancelledError:
            tts_task.cancel()
            if self.audio_started:               # interrupted mid-answer: remember what was actually said
                self.pending_user = ""
                self.history += [{"role": "user", "content": full},
                                 {"role": "assistant", "content": (self.spoken + " …").strip()}]
            raise

    async def tts_worker(self, q: asyncio.Queue, m, t_end):
        job = None
        try:
            while True:
                chunk = await q.get()
                if chunk is None:
                    return
                cyr = sum(1 for ch in chunk if "\u0400" <= ch <= "\u04ff")
                lat = sum(1 for ch in chunk if ch.isascii() and ch.isalpha())
                self.lang = "ru" if cyr > lat else "uz"
                for attempt in (1, 2):
                    got = False
                    try:
                        job = self.TTS.TTSJob()
                        async for pcm in job.stream(chunk, self.lang):
                            got = True
                            if not self.audio_started:
                                self.audio_started = True
                                m["first_audio"] = int((time.monotonic() - t_end) * 1000)
                                await self.begin_utterance()
                                await self.set_state("speaking")
                            await self.asend(pcm)
                        break
                    except asyncio.CancelledError:
                        raise
                    except Exception as e:
                        log.warning("tts chunk failed (try %d): %r", attempt, e)
                        if got:
                            break
                self.spoken += chunk + " "
                job = None
        except asyncio.CancelledError:
            if job:
                await job.interrupt()
                await job.close()
            raise
        except Exception as e:
            log.warning("tts failed: %r", e)

    async def say(self, text, end=False):
        """Speak a fixed line (nudge / farewell) outside the LLM."""
        if self.closed:
            return
        await self.jsend(type="transcript", role="ai", text=text, final=True)
        try:
            job = self.TTS.TTSJob()
            started = False
            async for pcm in job.stream(text, self.lang):
                if not started:
                    started = True
                    await self.begin_utterance()
                    await self.set_state("speaking")
                await self.asend(pcm)
        except Exception as e:
            log.warning("say failed: %s", e)
        self.history.append({"role": "assistant", "content": text})
        if end:
            self.end_after = True
            if not self.client_busy:
                await self.end_call()
