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


async def transcribe(pcm: bytes, language=None):
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
