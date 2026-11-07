"""Free STT.
groq  : Groq Whisper API (free key from console.groq.com), whisper-large-v3-turbo, very fast.
local : faster-whisper on the server CPU (no key; slower, quality depends on WHISPER_MODEL).
Both buffer the utterance and transcribe it at end of turn.
"""
import asyncio, io, wave
import httpx
from .. import config as C

STT_SR = 16000
LANGS = {"uzbek": "uz", "russian": "ru", "uz": "uz", "ru": "ru"}
PROMPT = "Assalomu alaykum. StarsFuelBot, Telegram Stars, Premium, Gift, PUBG UC. Здравствуйте."


def _wav(pcm: bytes):
    b = io.BytesIO()
    with wave.open(b, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(STT_SR); w.writeframes(pcm)
    return b.getvalue()


PROMPTS = {"uz": "Assalomu alaykum. StarsFuelBot orqali Telegram Stars, Premium, Gift, PUBG UC sotib olish. Narxi necha pul?",
           "ru": "Здравствуйте. Как купить Telegram Stars, Premium, подарки через StarsFuelBot? Сколько стоит?"}
_http = None
HALLU = ("продолжение следует", "субтитры", "спасибо за просмотр", "подписывайтесь", "redactor", "amara.org",
         "obuna bo'ling", "thanks for watching", "dimatorzok")


async def _groq_one(wav: bytes, lang: str):
    global _http
    if _http is None:
        _http = httpx.AsyncClient(timeout=20, http2=False)
    r = await _http.post("https://api.groq.com/openai/v1/audio/transcriptions",
                         headers={"Authorization": f"Bearer {C.GROQ_API_KEY}"},
                         data={"model": C.GROQ_STT_MODEL, "response_format": "verbose_json", "temperature": "0",
                               "language": lang, "prompt": PROMPTS[lang]},
                         files={"file": ("u.wav", wav, "audio/wav")})
    r.raise_for_status()
    j = r.json()
    segs = j.get("segments") or []
    score = sum(sg.get("avg_logprob", -5) for sg in segs) / len(segs) if segs else -5
    nos = max((sg.get("no_speech_prob", 0) for sg in segs), default=0)
    return j.get("text", "").strip(), lang, score, nos


async def groq_all(pcm: bytes):
    wav = _wav(pcm)
    langs = [C.STT_LANGUAGE] if C.STT_LANGUAGE in ("uz", "ru") else ["uz", "ru"]
    return [r for r in await asyncio.gather(*[_groq_one(wav, l) for l in langs], return_exceptions=True)
            if not isinstance(r, Exception)]


def _clean(text):
    low = text.lower().strip(" .!?…")
    return "" if not low or any(h in low for h in HALLU) else text


_navai = None


def _navai_uz(pcm: bytes):
    global _navai
    import numpy as np
    from faster_whisper import WhisperModel
    if _navai is None:
        _navai = WhisperModel(C.NAVAI_MODEL, device="cpu", compute_type="int8", cpu_threads=C.WHISPER_THREADS)
    x = np.frombuffer(pcm, dtype=np.int16).astype("float32") / 32768
    segs, _ = _navai.transcribe(x, language="uz", beam_size=1, vad_filter=False, condition_on_previous_text=False,
                                without_timestamps=True)
    return " ".join(s.text.strip() for s in segs).strip()


async def hybrid(pcm: bytes):
    """Groq (uz+ru) decides the language; Uzbek text comes from the NavAI Uzbek model."""
    import time, logging
    lg = logging.getLogger("stt")
    loop = asyncio.get_running_loop()
    t0 = time.monotonic()

    def timed():
        r = _navai_uz(pcm)
        lg.info("navai %.0f ms: %s", (time.monotonic() - t0) * 1000, r[:80])
        return r
    uz_task = loop.run_in_executor(None, timed)
    res = await groq_all(pcm)
    lg.info("groq %.0f ms: %s", (time.monotonic() - t0) * 1000, [(r[1], round(r[2], 2), r[0][:50]) for r in res])
    best = max(res, key=lambda r: r[2]) if res else None
    if best and best[1] == "ru" and best[3] < 0.8:
        return _clean(best[0]), "ru"
    try:
        text = await uz_task
    except Exception:
        text = best[0] if best else ""
    if best and best[3] > 0.8:
        return "", None
    return _clean(text), "uz"


async def groq(pcm: bytes):
    """Transcribe as Uzbek and as Russian in parallel, keep the more confident one."""
    wav = _wav(pcm)
    langs = [C.STT_LANGUAGE] if C.STT_LANGUAGE in ("uz", "ru") else ["uz", "ru"]
    res = [r for r in await asyncio.gather(*[_groq_one(wav, l) for l in langs], return_exceptions=True)
           if not isinstance(r, Exception)]
    if not res:
        raise RuntimeError("groq stt failed")
    text, lang, score, nos = max(res, key=lambda r: r[2])
    low = text.lower().strip(" .!?…")
    if nos > 0.8 or not low or any(h in low for h in HALLU):
        return "", None
    return text, lang


_model = None


def _local(pcm: bytes):
    global _model
    import numpy as np
    from faster_whisper import WhisperModel
    if _model is None:
        _model = WhisperModel(C.WHISPER_MODEL, device="cpu", compute_type="int8", cpu_threads=C.WHISPER_THREADS)
    x = np.frombuffer(pcm, dtype=np.int16).astype("float32") / 32768
    lang = C.STT_LANGUAGE if C.STT_LANGUAGE in ("uz", "ru") else None
    segs, info = _model.transcribe(x, language=lang, beam_size=1, vad_filter=False, initial_prompt=PROMPT,
                                   condition_on_previous_text=False)
    text = " ".join(s.text.strip() for s in segs).strip()
    return text, LANGS.get(info.language)


def warmup():
    if C.STT_PROVIDER == "whisper":
        _local(b"\x00\x00" * 16000)


def warm_navai():
    _navai_uz(b"\x00\x00" * 16000)


async def transcribe(pcm: bytes, language=None):
    if C.STT_PROVIDER == "hybrid" and C.GROQ_API_KEY:
        return await hybrid(pcm)
    if C.STT_PROVIDER == "groq" and C.GROQ_API_KEY:
        return await groq(pcm)
    return await asyncio.get_running_loop().run_in_executor(None, _local, pcm)


class STTStream:
    def __init__(self, language=None):
        self.buf = bytearray()

    async def open(self, pre_audio=b""):
        self.buf += pre_audio

    async def send(self, pcm):
        self.buf += pcm

    async def finish(self, timeout=20):
        return await asyncio.wait_for(transcribe(bytes(self.buf)), timeout)

    async def close(self):
        pass
