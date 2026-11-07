// Mic capture -> 16 kHz PCM16 frames (20 ms), and a 24 kHz PCM16 player with a clearable queue.
class MicCapture extends AudioWorkletProcessor {
  constructor() { super(); this.ratio = sampleRate / 16000; this.acc = 0; this.out = new Int16Array(320); this.n = 0; this.sum = 0; this.cnt = 0; }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    for (let i = 0; i < ch.length; i++) {      // box-filter downsample to 16 kHz
      this.sum += ch[i]; this.cnt++; this.acc += 1;
      if (this.acc >= this.ratio) {
        this.acc -= this.ratio;
        const v = Math.max(-1, Math.min(1, this.sum / this.cnt)); this.sum = 0; this.cnt = 0;
        this.out[this.n++] = v < 0 ? v * 0x8000 : v * 0x7fff;
        if (this.n === 320) { this.port.postMessage(this.out.buffer.slice(0)); this.n = 0; }
      }
    }
    return true;
  }
}
registerProcessor('mic-capture', MicCapture);

class PcmPlayer extends AudioWorkletProcessor {
  constructor() {
    super();
    this.q = []; this.cur = null; this.pos = 0; this.step = 24000 / sampleRate; this.playing = false; this.lv = 0; this.t = 0;
    this.port.onmessage = e => {
      if (e.data === 'clear') { this.q = []; this.cur = null; this.pos = 0; return; }
      const s = new Int16Array(e.data), f = new Float32Array(s.length);
      for (let i = 0; i < s.length; i++) f[i] = s[i] / 32768;
      this.q.push(f);
    };
  }
  process(_, outputs) {
    const out = outputs[0][0]; let e = 0;
    for (let i = 0; i < out.length; i++) {
      if (!this.cur || this.pos >= this.cur.length) {
        if (this.cur) this.pos -= this.cur.length;   // carry the fraction into the next chunk
        this.cur = this.q.length ? this.q.shift() : null;
        if (!this.cur) { this.pos = 0; out[i] = 0; continue; }
      }
      const k = this.pos | 0, fr = this.pos - k, a = this.cur[k], b = this.cur[k + 1] ?? a;
      out[i] = a + (b - a) * fr; e += out[i] * out[i]; this.pos += this.step;
    }
    const busy = !!this.cur || this.q.length > 0;
    this.lv = this.lv * 0.8 + Math.sqrt(e / out.length) * 0.2;
    if (++this.t % 6 === 0) this.port.postMessage({ level: this.lv });
    if (this.playing && !busy) this.port.postMessage({ idle: true });
    this.playing = busy;
    for (let c = 1; c < outputs[0].length; c++) outputs[0][c].set(out);
    return true;
  }
}
registerProcessor('pcm-player', PcmPlayer);
