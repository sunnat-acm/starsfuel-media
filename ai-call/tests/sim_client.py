"""Simulated caller: streams a timeline of speech clips in real time, plays (counts) incoming audio,
sends `idle` when playback would finish, prints every event with timestamps.
usage: python tests/sim_client.py ws://127.0.0.1:8000/ws "clip.wav@8.0" "clip2.wav@14.5" --dur 30
Clip times are seconds from connect. Clips are 16 kHz mono (resampled if needed).
"""
import argparse, asyncio, json, time
import numpy as np, soundfile as sf
import websockets


def load(p):
    x, sr = sf.read(p, dtype="float32")
    if x.ndim > 1:
        x = x.mean(1)
    if sr != 16000:
        import librosa
        x = librosa.resample(x, orig_sr=sr, target_sr=16000)
    return x


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("url")
    ap.add_argument("clips", nargs="*")
    ap.add_argument("--dur", type=float, default=30)
    ap.add_argument("--save", default="")
    ap.add_argument("--dtmf", default="")
    a = ap.parse_args()
    total = int(a.dur * 16000)
    tl = np.random.default_rng(0).normal(0, 0.002, total).astype(np.float32)
    for c in a.clips:
        p, t = c.rsplit("@", 1)
        x = load(p); i = int(float(t) * 16000)
        tl[i:i + len(x)] += x[: max(0, total - i)]
    pcm = (np.clip(tl, -1, 1) * 32767).astype(np.int16).tobytes()
    t0 = time.monotonic()
    T = lambda: f"{time.monotonic() - t0:6.2f}"
    play_end = {"t": 0.0}
    seq = {"n": 0}
    got = {"bytes": 0}
    rec = bytearray()
    async with websockets.connect(a.url, max_size=None) as ws:
        async def sender():
            step = 640  # 20 ms
            for i in range(0, len(pcm), step):
                await ws.send(pcm[i:i + step])
                target = t0 + (i + step) / 32000
                await asyncio.sleep(max(0, target - time.monotonic()))
            await ws.send(json.dumps({"type": "hangup"}))

        async def idler():
            sent = -1
            while True:
                await asyncio.sleep(0.05)
                if seq["n"] != sent and time.monotonic() > play_end["t"] and got["bytes"]:
                    sent = seq["n"]
                    await ws.send(json.dumps({"type": "idle", "seq": seq["n"]}))
                    print(T(), "client: playback idle seq", seq["n"])

        async def dial():
            if a.dtmf:
                d, t = a.dtmf.split("@")
                await asyncio.sleep(float(t))
                await ws.send(json.dumps({"type": "dtmf", "digit": d}))
                print(T(), "client: dtmf", d)

        st = asyncio.create_task(sender()); it = asyncio.create_task(idler()); dt = asyncio.create_task(dial())
        try:
            async for msg in ws:
                now = time.monotonic()
                if isinstance(msg, bytes):
                    dur = len(msg) / 48000
                    play_end["t"] = max(play_end["t"], now) + dur
                    got["bytes"] += len(msg)
                    rec.extend(msg)
                    continue
                m = json.loads(msg)
                if m["type"] == "seq":
                    seq["n"] = m["seq"]
                if m["type"] == "clear":
                    play_end["t"] = now
                print(T(), "server:", json.dumps(m, ensure_ascii=False)[:160])
        except websockets.ConnectionClosed:
            pass
        st.cancel(); it.cancel()
        print(T(), "closed; audio received", round(got["bytes"] / 48000, 1), "s")
        if a.save and rec:
            sf.write(a.save, np.frombuffer(bytes(rec), dtype=np.int16), 24000)

asyncio.run(main())
