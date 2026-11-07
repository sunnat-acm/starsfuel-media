"""VoiceStudio (self-hosted, OpenAI-compatible /v1/audio/*) — drop-in for a GPU server later.
Set STT_PROVIDER=voicestudio / TTS_PROVIDER=voicestudio and VOICESTUDIO_URL.
TTS returns 24 kHz PCM (response_format=pcm); STT takes a WAV of the whole utterance.
"""
import io, wave
import httpx
from .. import config as C

STT_SR, TTS_SR = 16000, 24000


def _wav(pcm: bytes, sr=16000):
    b = io.BytesIO()
    with wave.open(b, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(pcm)
    return b.getvalue()


async def transcribe(pcm: bytes, language=None):
    lang = language or C.STT_LANGUAGE
    data = {"model": "whisper-1"}
    if lang and lang != "auto":
        data["language"] = lang
    async with httpx.AsyncClient(timeout=30) as c:
        r = await c.post(f"{C.VOICESTUDIO_URL}/audio/transcriptions", headers={"Authorization": f"Bearer {C.VOICESTUDIO_KEY}"},
                         data=data, files={"file": ("u.wav", _wav(pcm), "audio/wav")})
        r.raise_for_status()
        j = r.json()
        return j.get("text", "").strip(), j.get("language", lang if lang != "auto" else "uz")


class STTStream:
    """Buffers the utterance and transcribes on finish (VoiceStudio has no commit-style stream here)."""
    def __init__(self, language=None):
        self.language, self.buf = language, bytearray()

    async def open(self, pre_audio=b""):
        self.buf += pre_audio

    async def send(self, pcm):
        self.buf += pcm

    async def finish(self, timeout=30):
        return await transcribe(bytes(self.buf), self.language)

    async def close(self):
        pass


class TTSJob:
    def __init__(self):
        self.stop = False

    async def stream(self, text, lang="uz", voice=None, speed=None):
        body = {"model": "omnivoice", "input": text, "voice": voice or C.VOICESTUDIO_VOICE, "response_format": "pcm",
                "speed": speed or C.TTS_SPEED}
        async with httpx.AsyncClient(timeout=60) as c:
            async with c.stream("POST", f"{C.VOICESTUDIO_URL}/audio/speech", json=body,
                                headers={"Authorization": f"Bearer {C.VOICESTUDIO_KEY}"}) as r:
                r.raise_for_status()
                async for chunk in r.aiter_bytes(4800):
                    if self.stop:
                        break
                    yield chunk

    async def interrupt(self):
        self.stop = True

    async def close(self):
        pass
