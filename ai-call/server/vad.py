"""Silero VAD (v5, ONNX, CPU) + turn detector.

Feed 16 kHz mono int16 PCM of any chunk size; get events:
  ("speech_start", t)  after `min_speech_ms` of continuous speech
  ("speech_end", t, pcm_bytes)  after `silence_ms` of silence; pcm includes `pre_roll_ms` before the start
"""
import os
import numpy as np
import onnxruntime as ort

SR = 16000
WIN = 512          # 32 ms window required by Silero v5 at 16 kHz
CTX = 64           # context samples prepended to each window


class Silero:
    def __init__(self, path):
        so = ort.SessionOptions()
        so.intra_op_num_threads = 1
        so.inter_op_num_threads = 1
        self.s = ort.InferenceSession(path, sess_options=so, providers=["CPUExecutionProvider"])
        self.reset()

    def reset(self):
        self.state = np.zeros((2, 1, 128), dtype=np.float32)
        self.ctx = np.zeros(CTX, dtype=np.float32)

    def prob(self, win: np.ndarray) -> float:
        x = np.concatenate([self.ctx, win]).reshape(1, -1).astype(np.float32)
        out, self.state = self.s.run(None, {"input": x, "state": self.state, "sr": np.array(SR, dtype=np.int64)})
        self.ctx = win[-CTX:]
        return float(out[0][0])


class TurnDetector:
    def __init__(self, model_path, threshold=0.55, min_speech_ms=200, silence_ms=550,
                 pre_roll_ms=300, max_utt_ms=30000):
        self.vad = Silero(model_path)
        self.th, self.th_off = threshold, threshold - 0.15
        self.min_speech = min_speech_ms / 1000
        self.silence = silence_ms / 1000
        self.pre_roll = int(pre_roll_ms / 1000 * SR)
        self.max_utt = max_utt_ms / 1000
        self.reset()

    def reset(self):
        self.vad.reset()
        self.buf = np.zeros(0, dtype=np.float32)   # not yet windowed
        self.hist = np.zeros(0, dtype=np.int16)     # rolling pre-roll
        self.utt = []                               # int16 chunks of current utterance
        self.t = 0.0                                # stream time (s)
        self.in_speech = False
        self.confirmed = False
        self.speech_run = 0.0
        self.sil_run = 0.0
        self.utt_len = 0.0
        self.level = 0.0

    def feed(self, pcm: bytes):
        ev = []
        s16 = np.frombuffer(pcm, dtype=np.int16)
        self.buf = np.concatenate([self.buf, s16.astype(np.float32) / 32768.0])
        while len(self.buf) >= WIN:
            w, self.buf = self.buf[:WIN], self.buf[WIN:]
            w16 = (w * 32768).astype(np.int16)
            p = self.vad.prob(w)
            self.level = float(np.sqrt(np.mean(w * w)) + 1e-9)
            dt = WIN / SR
            self.t += dt
            if not self.in_speech:
                self.hist = np.concatenate([self.hist, w16])[-self.pre_roll:]
                if p >= self.th:
                    self.in_speech, self.confirmed = True, False
                    self.speech_run, self.sil_run, self.utt_len = dt, 0.0, dt
                    self.utt = [self.hist.copy()]
                continue
            self.utt.append(w16)
            self.utt_len += dt
            if p >= self.th_off:
                self.speech_run += dt
                self.sil_run = 0.0
                if not self.confirmed and self.speech_run >= self.min_speech:
                    self.confirmed = True
                    ev.append(("speech_start", self.t))
            else:
                self.sil_run += dt
                if not self.confirmed and self.sil_run > 0.15:   # a click / short noise: drop it
                    self.in_speech = False
                    self.hist = np.concatenate(self.utt)[-self.pre_roll:]
                    continue
            if self.confirmed and (self.sil_run >= self.silence or self.utt_len >= self.max_utt):
                pcm_out = np.concatenate(self.utt)
                trim = int(max(0.0, self.sil_run - 0.15) * SR)     # keep ~150 ms of tail silence
                if trim:
                    pcm_out = pcm_out[:-trim]
                ev.append(("speech_end", self.t, pcm_out.tobytes()))
                self.in_speech = self.confirmed = False
                self.hist = np.zeros(0, dtype=np.int16)
                self.utt = []
        return ev
