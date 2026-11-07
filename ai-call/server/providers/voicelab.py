"""VoiceLab realtime STT + TTS (wss://api.voicelab.uz/v1/{stt,tts}/stream).

STT: one WebSocket per utterance, opened when the user starts talking; audio streams live,
     `commit` at end of turn -> {"event":"final","text","language",...}.
TTS: one WebSocket per text request; server sends {"event":"ready"}, then raw PCM16 24 kHz mono
     binary frames, then {"event":"done"}; {"action":"interrupt"} stops it.
Server-side auth: `xvl-api-key` header on the upgrade.
"""
import asyncio, json
import websockets
from .. import config as C

STT_SR, TTS_SR = 16000, 24000


def _hdr():
    return {"xvl-api-key": C.VOICELAB_API_KEY}


async def _connect(url):
    try:   # websockets >= 14
        return await websockets.connect(url, additional_headers=_hdr(), max_size=None, open_timeout=10)
    except TypeError:
        return await websockets.connect(url, extra_headers=_hdr(), max_size=None, open_timeout=10)


class STTStream:
    """Live utterance: open() at speech start, send() audio, finish() -> (text, lang)."""
    def __init__(self, language=None):
        self.language = language or C.STT_LANGUAGE
        self.ws = None
        self.ready = None

    async def open(self, pre_audio: bytes = b""):
        self.ws = await _connect(f"{C.VOICELAB_WS}/stt/stream")
        msg = json.loads(await self.ws.recv())
        if msg.get("event") != "ready":
            raise RuntimeError(f"stt not ready: {msg}")
        await self.ws.send(json.dumps({"type": "start", "language": self.language, "audio_format": "pcm_s16le",
                                       "sample_rate": STT_SR, "channels": 1, "word_timestamps": False}))
        if pre_audio:
            await self.send(pre_audio)

    async def send(self, pcm: bytes):
        if self.ws:
            for i in range(0, len(pcm), 3200):
                await self.ws.send(pcm[i:i + 3200])

    async def finish(self, timeout=12):
        await self.ws.send(json.dumps({"type": "commit"}))
        try:
            while True:
                raw = await asyncio.wait_for(self.ws.recv(), timeout)
                if isinstance(raw, bytes):
                    continue
                m = json.loads(raw)
                ev = m.get("event")
                if ev == "final":
                    return m.get("text", "").strip(), m.get("language") or "uz"
                if ev == "error":
                    if m.get("code") == "no_speech_detected":
                        return "", None
                    raise RuntimeError(f"stt error: {m}")
        finally:
            await self.close()

    async def close(self):
        if self.ws:
            try:
                await self.ws.close()
            except Exception:
                pass
            self.ws = None


async def transcribe(pcm: bytes, language=None):
    s = STTStream(language)
    await s.open(pcm)
    return await s.finish()


class TTSJob:
    """synthesize(text) -> async iterator of PCM16 24 kHz chunks; interrupt() stops it."""
    def __init__(self):
        self.ws = None

    async def stream(self, text, lang="uz", voice=None, speed=None):
        voice = voice or (C.VOICE_RU if lang == "ru" else C.VOICE_UZ)
        self.ws = await _connect(f"{C.VOICELAB_WS}/tts/stream")
        try:
            first = json.loads(await self.ws.recv())
            if first.get("event") != "ready":
                raise RuntimeError(f"tts not ready: {first}")
            await self.ws.send(json.dumps({"text": text, "language": lang if lang in ("uz", "ru") else "uz",
                                           "voice_id": voice, "speed": speed or C.TTS_SPEED}))
            async for raw in self.ws:
                if isinstance(raw, bytes):
                    yield raw
                    continue
                m = json.loads(raw)
                if m.get("event") in ("done", "interrupted"):
                    break
                if m.get("event") == "error":
                    raise RuntimeError(f"tts error: {m}")
        finally:
            await self.close()

    async def interrupt(self):
        if self.ws:
            try:
                await self.ws.send(json.dumps({"action": "interrupt"}))
            except Exception:
                pass

    async def close(self):
        if self.ws:
            try:
                await self.ws.close()
            except Exception:
                pass
            self.ws = None
