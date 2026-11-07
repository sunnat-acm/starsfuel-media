"""Offline mocks for tests: STT returns scripted text, TTS returns a soft tone, LLM echoes a scripted reply."""
import asyncio, math
import numpy as np

STT_SR, TTS_SR = 16000, 24000
SCRIPT = []          # list of (text, lang) returned by STT in order


class STTStream:
    def __init__(self, language=None):
        self.n = 0

    async def open(self, pre_audio=b""):
        self.n += len(pre_audio)

    async def send(self, pcm):
        self.n += len(pcm)

    async def finish(self, timeout=10):
        await asyncio.sleep(0.25)              # pretend network + ASR
        return SCRIPT.pop(0) if SCRIPT else ("salom", "uz")

    async def close(self):
        pass


class TTSJob:
    def __init__(self):
        self.stop = False

    async def stream(self, text, lang="uz", voice=None, speed=None):
        await asyncio.sleep(0.15)              # first-audio latency
        dur = max(0.6, 0.06 * len(text))
        n = int(dur * TTS_SR)
        t = np.arange(n) / TTS_SR
        x = (0.15 * np.sin(2 * math.pi * 220 * t) * np.minimum(1, t * 20)).astype(np.float32)
        pcm = (x * 32767).astype(np.int16).tobytes()
        for i in range(0, len(pcm), 4800):
            if self.stop:
                break
            await asyncio.sleep(0.02)          # faster than real time, like the real service
            yield pcm[i:i + 4800]

    async def interrupt(self):
        self.stop = True

    async def close(self):
        pass


async def llm_stream(messages, lang):
    last = messages[-1]["content"]
    reply = f"Tushundim. Siz {last[:40]} haqida so'radingiz. Bu masalada albatta yordam beraman. Yana savol bormi?"
    await asyncio.sleep(0.3)
    for w in reply.split(" "):
        await asyncio.sleep(0.02)
        yield w + " "
