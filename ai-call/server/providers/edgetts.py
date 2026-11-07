"""Free TTS: Microsoft Edge neural voices (no key). MP3 stream -> ffmpeg -> PCM16 24 kHz chunks."""
import asyncio
import edge_tts
from .. import config as C

TTS_SR = 24000


class TTSJob:
    def __init__(self):
        self.stop = False
        self.proc = None

    async def stream(self, text, lang="uz", voice=None, speed=None):
        voice = voice or (C.EDGE_VOICE_RU if lang == "ru" else C.EDGE_VOICE_UZ)
        rate = f"{int(round(((speed or C.TTS_SPEED) - 1) * 100)):+d}%"
        self.proc = await asyncio.create_subprocess_exec(
            "ffmpeg", "-loglevel", "error", "-f", "mp3", "-i", "pipe:0", "-f", "s16le", "-ac", "1", "-ar", str(TTS_SR), "pipe:1",
            stdin=asyncio.subprocess.PIPE, stdout=asyncio.subprocess.PIPE)

        async def feed():
            try:
                async for ch in edge_tts.Communicate(text, voice, rate=rate).stream():
                    if self.stop:
                        break
                    if ch["type"] == "audio":
                        self.proc.stdin.write(ch["data"])
                        await self.proc.stdin.drain()
            finally:
                try:
                    self.proc.stdin.close()
                except Exception:
                    pass

        feeder = asyncio.create_task(feed())
        try:
            while not self.stop:
                b = await self.proc.stdout.read(4800)
                if not b:
                    break
                yield b
            await feeder
        finally:
            feeder.cancel()
            await self.close()

    async def interrupt(self):
        self.stop = True

    async def close(self):
        if self.proc and self.proc.returncode is None:
            try:
                self.proc.kill()
            except Exception:
                pass
