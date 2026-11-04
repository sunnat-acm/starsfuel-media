// STARSFUEL title: home-made geometric cut letterforms (straight cuts + arcs, uneven weights, staggered baselines)
import { g, C, piece, roughC, arcP } from './paper.js';
const D = Math.PI / 180;
const arc = (cx, cy, r, a0, a1, n = 16) => arcP(cx, cy, r, a0 * D, a1 * D, n);
export const GLYPH = {
  S: { w: 64, p: () => [[[64, 0], [63, 21], [22, 20], [22, 38], [64, 40], [63, 100], [0, 100], [1, 79], [42, 80], [42, 61], [0, 60], [1, 0]]] },
  T: { w: 66, p: () => [[[0, 1], [66, -1], [65, 21], [43, 20], [42, 100], [21, 100], [22, 21], [1, 22]]] },
  A: { w: 74, p: () => [[[0, 100], [26, 0], [48, 0], [74, 100], [52, 100], [47, 80], [27, 80], [22, 100]], [[31, 62], [43, 62], [37, 32]]] },
  R: { w: 68, p: () => [[[0, 0], [36, 0]].concat(arc(36, 30, 30, -90, 80, 16), [[68, 100], [45, 100], [28, 62], [21, 62], [21, 100], [0, 100]]), [[21, 18], [34, 18]].concat(arc(34, 30, 12, -90, 90, 10), [[34, 42], [21, 42]])] },
  F: { w: 56, p: () => [[[0, 0], [56, 1], [55, 21], [21, 20], [21, 41], [47, 42], [46, 62], [21, 61], [21, 100], [0, 100]]] },
  U: { w: 72, p: () => [[[0, 0], [21, 0], [21, 64]].concat(arc(36, 64, 15, 180, 0, 12), [[51, 64], [51, 0], [72, 0], [72, 64]], arc(36, 64, 36, 0, 180, 18))] },
  E: { w: 58, p: () => [[[0, 0], [57, 1], [55, 21], [21, 20], [21, 39], [47, 40], [47, 59], [21, 60], [21, 79], [58, 80], [57, 100], [0, 100]]] },
  L: { w: 56, p: () => [[[0, 0], [22, 0], [21, 79], [56, 80], [55, 100], [0, 100]]] },
};
export function titleLayout(str, H, x0, y0) {
  const rots = [-2, 1.2, -.6, 1.8, -1.4, .9, -1.8, 1.1, -.7], dys = [0, -6, 4, -3, 6, -5, 3, -4, 5];
  const k = H / 100; let x = x0; const out = [];
  for (let i = 0; i < str.length; i++) { const G = GLYPH[str[i]]; out.push({ ch: str[i], x, y: y0 + dys[i % 9] * k, h: H, w: G.w * k, rot: rots[i % 9] * D, seed: 700 + i }); x += G.w * k + 9 * k; }
  return { L: out, w: x - 9 * k - x0 };
}
export function drawGlyph(l, col = C.ink, dx = 0, dy = 0, s = 1) {
  const G = GLYPH[l.ch], k = l.h / 100;
  g.save(); g.translate(l.x + l.w / 2 + dx, l.y + l.h / 2 + dy); g.rotate(l.rot); g.scale(s, s); g.translate(-l.w / 2, -l.h / 2);
  const polys = G.p().map((p, j) => roughC('tg' + l.ch + l.h.toFixed(0) + l.seed + '_' + j, () => p.map(([x, y]) => [x * k, y * k]), l.seed * 3 + j, 1.6, 10));
  piece(polys, col);
  g.restore();
}
