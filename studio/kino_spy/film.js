// OPERATSIYA: STARS — 60s spy title sequence, vertical 1080x1920, 24 fps. Single timeline in beats (95.7 BPM grid of the user's phonk track).
import { g, C, S, W, H, clear, piece, rough, roughC, circP, rectP, xf, silhouette, paperFinish } from './paper.js';
import { layout, drawLine } from './glyph.js';
import { agentSide, runPose, walkPose, AGENT_POSE } from './chars.js';
import { titleLayout, drawGlyph } from './title.js';
import { clamp, lerp, seg, eo, eio, back, hash } from '/core/lib.js';

export const OFF = 0.30, SPB = 0.6255;
export const Bt = b => OFF + b * SPB;
export const DUR = Bt(46.6);
const twos = t => Math.floor(t * 12 + 1e-6) / 12;
const mix = lerp;
export const CAM = { cx: 540, cy: 960, s: 1 };
function cam(cx, cy, s = 1) { CAM.cx = cx; CAM.cy = cy; CAM.s = s; g.setTransform(s, 0, 0, s, W / 2 - cx * s, H / 2 - cy * s); }
function screen() { g.setTransform(1, 0, 0, 1, 0, 0); }

// ── props ──
function starPts(r, n = 5, k = .44) { const o = []; for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? r * k : r; o.push([Math.cos(a) * rr, Math.sin(a) * rr]); } return o; }
export function star(x, y, r, rot = 0, opt = {}) {
  g.save(); g.translate(x, y); g.rotate(rot);
  const R = Math.round(r);
  if (opt.backing !== false) piece(roughC('stB' + R, () => starPts(R * 1.16, 5, .47), 901, 1.4, 8), C.ink, { gap: 0 });
  piece(roughC('stM' + R, () => starPts(R), 902, 1.2, 8), C.mus, { gap: 0, shadow: false });
  g.restore();
}
function hand(x, y, s = 1, rot = 0, opt = {}) {   // ink sleeve + wedge hand, pointing left (-x)
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  piece(roughC('sleeve', () => [[30, -40], [700, -52], [700, 52], [34, 38]], 911, 1.6, 10), opt.sleeve || C.ink);
  piece(roughC('cuff', () => [[10, -42], [44, -44], [44, 42], [12, 40]], 912, 1.2, 8), C.paper, { gap: 1.2 });
  piece(roughC('handW', () => [[14, -30], [-150, -12], [-178, 2], [-140, 14], [14, 30]], 913, 1.4, 9), opt.col || C.ink);
  g.restore();
}
// credit line: str at baseline (x,y), slides from dx0 to 0 and stops dead at time tStop
function credit(str, size, x, y, col, seed, opt = {}) {
  const lay = layout(str, size, { track: opt.track ?? .02 });
  drawLine(lay, x, y, { col, seed, jit: opt.jit ?? 1, each: opt.each });
  return lay;
}
const LAYS = {};
const lay = (k, s, size, tr = .02) => LAYS[k] || (LAYS[k] = layout(s, size, { track: tr }));

// ── subtitles: paper strip bottom-left, star bullet ──
let LINES = [], DURS = {};
export function setLines(l, d) { LINES = l; DURS = d; }
export function subs() { return LINES.map(L => { const d = DURS[L.id] || 2; return { id: L.id, t0: Bt(L.b), t1: Bt(L.b) + Math.max(1.8, d + .6), text: L.sub }; }); }
function subtitle(t, dark) {
  for (const s of subs()) {
    if (t < s.t0 || t > s.t1) continue;
    screen();
    const k = eo(seg(t, s.t0, s.t0 + .18));
    g.save(); g.font = '600 52px LSpartan'; const tw = g.measureText(s.text).width; g.restore();
    const x = 50 - (1 - k) * 60, y = 1520, w = tw + 128, h = 92;
    g.save(); g.globalAlpha = k; g.translate(x, y); g.rotate(-1 * Math.PI / 180);
    piece(rough([[0, 0], [w, 3], [w - 8, h], [6, h - 2]], 77 + s.id.length, 1.6, 10), dark ? C.paper : C.ink, { gap: 0 });
    g.save(); g.translate(40, h / 2); piece(starPts(18), C.red, { gap: 0, shadow: false }); g.restore();
    g.font = '600 52px LSpartan'; g.fillStyle = dark ? C.ink : C.paper; g.textBaseline = 'middle'; g.fillText(s.text, 76, h / 2 + 4);
    g.restore();
  }
}

// ── scenes ──
const EV = [];
function S1(t, b) {   // cold open: the star, the briefing title, the hand that misses
  clear(C.ink); cam(540, 900, 1 + .08 * seg(b, 0, 4));
  const tq = twos(t), bq = (tq - OFF) / SPB;
  const up = eio(seg(bq, 3.75, 4.1));
  star(540, 760 - up * 1500, 175, bq * .12 - up * 2);
  if (bq > 2.9) { const k = eo(seg(bq, 2.9, 3.6)); hand(mix(1400, 760, k), 760 + (bq > 3.75 ? -40 * seg(bq, 3.75, 3.9) : 0), 1, -.05, { col: C.paper, sleeve: C.inkL }); }
  const L1 = lay('op', 'OPERATSIYA:', 220), L2 = lay('st', 'STARS', 330, .04);
  const x1 = (1080 - L1.width) / 2, x2 = (1080 - L2.width) / 2;
  const s1 = eo(seg(t, Bt(2) - .32, Bt(2))), s2 = eo(seg(t, Bt(3) - .32, Bt(3)));
  if (t > Bt(2) - .32) drawLine(L1, mix(-L1.width - 60, x1, s1), 1230, { col: C.paper, seed: 3 });
  if (t > Bt(3) - .32) drawLine(L2, mix(1140, x2, s2), 1500, { col: C.red, seed: 9 });
}
function S2(t, b) {   // OBYEKT: 100 STARS — letters are pillars; the agent walks, the star hops on the tops
  clear(C.paper);
  const tf = Math.min(t, Bt(11.25)), bf = (tf - OFF) / SPB, tq = twos(tf), bq = (tq - OFF) / SPB;   // stop-time from 11.25
  const L = lay('obj', '100 STARS', 720, .03), FL = 1430;
  const ax = mix(-120, L.width + 160, seg(bq, 5.2, 11.6));
  const wide = 1 - eio(seg(bf, 4.6, 5.6));
  const s = mix(.9, 1080 / (L.width + 160), wide), cx = mix(clamp(ax + 260, 540, L.width), L.width / 2, wide), cy = mix(980, 1180, wide);
  cam(cx, cy, s);
  // backing wall in a darker paper
  piece(rectP(-2000, FL + 2, L.width + 4000, 900), C.paperD, { gap: 0, shadow: false });
  credit('OBYEKT:', 210, 40, 560, C.ink, 21);
  drawLine(L, 0, FL, { col: C.ink, seed: 31 });
  // star hopping one letter per beat ahead of the agent
  const sx = ax + 430, hop = Math.sin(Math.PI * (bq % 1));
  const top = FL - 720 * .74;
  star(sx, top - 330 - hop * 170, 66, bq * .8);
  agentSide(ax, top, .62, walkPose((bq / 2) % 1));
}
function S3(t, b) {   // NARX: 22 000 SO'M — digits slam, the agent runs, the star seats in a zero, push in
  clear(C.red);
  const tq = twos(t), bq = (tq - OFF) / SPB;
  const D = lay('pr', '22 000', 470, .04), M = lay('som', "SO'M", 330, .06);
  const dx = (1080 - D.width) / 2, mx = (1080 - M.width) / 2;
  const z = D.letters.find(l => l.ch === '0'), zx = dx + z.x + (z.x0 + z.x1) / 2, zy = 1000 - 470 * .38;
  const push = eio(seg(b, 16.6, 18));
  cam(mix(540, zx, push), mix(940, zy, push), mix(1, 5.5, push * push));
  credit('NARX', 190, 70, 420, C.ink, 41);
  drawLine(D, dx, 1000, { col: C.ink, seed: 43, each: (Lt, i) => { const tl = 12.5 + i * .5; if (bq < tl) return { hide: true }; const k = seg(bq, tl, tl + .17); return { dy: -260 * (1 - k), s: 1 + .25 * (1 - k) }; } });
  drawLine(M, mx, 1330, { col: C.ink, seed: 47, each: (Lt, i) => { const tl = 15 + i * .25; if (bq < tl) return { hide: true }; const k = seg(bq, tl, tl + .12); return { dy: -200 * (1 - k) }; } });
  if (bq > 13 && bq < 16.2) agentSide(mix(-260, 1340, seg(bq, 13, 16.2)), 1460, .62, runPose((bq / 2) % 1));
  const sk = eo(seg(bq, 15.9, 16.5));
  if (bq > 15.9) star(mix(900, zx, sk), mix(-200, zy, sk), mix(120, 92, sk), (1 - sk) * 4);
}
const BANDS = [[260, 640], [640, 1110], [1110, 1480]], TILT = Math.tan(-12 * Math.PI / 180);
function bandPoly(i, grow) { const [a, b] = BANDS[i]; const x1 = mix(-60, 1140, grow); return [[-60, a + (-600) * TILT], [x1, a + (x1 - 540) * TILT], [x1, b + (x1 - 540) * TILT], [-60, b + (-600) * TILT]]; }
function S4(t, b) {   // USUL: 3 BOSISH — the frame splits on diagonals into three panels, a tap per beat, stop-time
  clear(C.inkL); cam(540, 960, 1);
  const tf = Math.min(t, Bt(22.5)), bf = (tf - OFF) / SPB, tq = twos(tf), bq = (tq - OFF) / SPB;
  credit('USUL:', 190, 70, 230, C.paper, 51);
  const grounds = [C.paper, C.mus, C.paper], nums = ['1', '2', '3'];
  for (let i = 0; i < 3; i++) {
    const gr = eo(seg(bf, 18 + i * .33, 18.33 + i * .33));
    if (gr <= 0) continue;
    piece(bandPoly(i, gr), grounds[i], { gap: 3 });
    const [a, bb] = BANDS[i], cy = (a + bb) / 2 + (540 - 540) * TILT;
    const tap = 19 + i, on = bq >= tap;
    const N = lay('n' + i, nums[i], 330);
    if (gr > .9) {
      drawLine(N, 90, cy + 130 + (60 - 540) * TILT * .3, { col: on ? C.red : C.ink, seed: 60 + i, each: () => on ? { s: 1 + .25 * (1 - seg(bq, tap, tap + .2)) } : {} });
      const bx = 430, by = cy - 55 + (bx + 200 - 540) * TILT, press = on && bq < tap + .25 ? 8 : 0;
      piece(rough([[bx, by + press], [bx + 470, by + 4 + press], [bx + 462, by + 120 + press], [bx + 6, by + 116 + press]], 70 + i, 1.6, 10), on ? C.red : C.ink, { gap: 2.4 });
      drawLine(lay('bs', 'BOSISH', 92, .08), bx + 120, by + 102 + press, { col: on ? C.ink : C.paper, seed: 80 + i, jit: .5 });
      if (bq > tap - .7 && bq < tap + .6) { const k = eo(seg(bq, tap - .7, tap)); hand(mix(1350, bx + 400, k), by + 70 + press, .8, -.08); }
    }
  }
}
const TR = { size: 330, rail: 1250, gap: 230 };
let trainL = null;
function trainLay() { if (trainL) return trainL; const ws = ['PREMIUM', 'GIFT', 'PUBG UC']; let x = 0; trainL = ws.map(w => { const L = layout(w, TR.size, { track: .03 }); const o = { w, L, x }; x += L.width + TR.gap; return o; }); trainL.total = x - TR.gap; return trainL; }
function S5(t, b) {   // XIZMATLAR: words are carriages; the agent runs on the roofs, the star ahead
  clear(C.mus);
  const T = trainLay(), tq = twos(t), bq = (tq - OFF) / SPB;
  const ax = mix(-100, T.total + 100, seg(bq, 25.2, 31.6));
  const wide = 1 - eio(seg(b, 24.6, 25.6));
  const s = mix(1, 1080 / (T.total + 200), wide), cx = mix(ax + 220, T.total / 2, wide), cy = mix(1060, 1150, wide);
  cam(cx, cy, s);
  credit('XIZMATLAR', 200, cx - 540 / s + 60, cy - 960 / s + 420, C.ink, 91);
  piece(rectP(-3000, TR.rail + 70, T.total + 6000, 14), C.musD, { gap: 0, shadow: false });
  for (const c of T) {
    drawLine(c.L, c.x, TR.rail, { col: C.ink, seed: 100 + c.x % 97 });
    for (let k = 0; k < 3; k++) { const wx = c.x + 60 + k * (c.L.width - 120) / 2; g.save(); g.translate(wx, TR.rail + 46); g.rotate(bq * 2); piece(roughC('wh', () => circP(0, 0, 38, 20), 93, 1, 8), C.paper, { gap: 2 }); piece(rectP(-30, -4, 60, 8), C.ink, { gap: 0, shadow: false }); g.restore(); }
  }
  const roof = TR.rail - TR.size * .74;
  let inGap = false; for (const c of T) if (ax > c.x + c.L.width - 20 && ax < c.x + c.L.width + TR.gap + 20) inGap = true;
  const pose = inGap ? AGENT_POSE.leap : runPose((bq / 2) % 1);
  agentSide(ax, roof - (inGap ? 60 : 0), .62, pose);
  star(ax + 400, roof - 380 + 40 * Math.sin(bq * Math.PI), 62, bq);
}
function S6(t, b) {   // hero moment: silhouette against a giant circle; the catch
  clear(C.red);
  const tq = twos(t), bq = (tq - OFF) / SPB;
  cam(540, 900, 1 + .06 * seg(b, 32, 38));
  const r = 450 * eo(seg(b, 32, 32.6));
  piece(roughC('moon', () => circP(0, 0, 450, 90), 121, 2, 10).map(([x, y]) => [540 + x * r / 450, 860 + y * r / 450]), C.paper, { gap: 0 });
  const k = seg(bq, 32.4, 33.6);
  const ax = mix(-150, 470, k), ay = 1300 - Math.sin(Math.PI * k) * 380 * (k < 1 ? 1 : 0);
  const pose = bq < 33.6 ? AGENT_POSE.leap : AGENT_POSE.reach;
  agentSide(ax, ay, 1, pose);
  // the star falls into the raised hand
  const hx = ax + 95, hy = ay - 640, fk = eo(seg(bq, 33, 34));
  star(mix(700, hx, fk), mix(-150, hy, fk), 66, (1 - fk) * 5);
}
const TITLE = titleLayout('STARSFUEL', 150, 0, 0);
let LOGO = null;
function S7(t, b) {   // the badge stamps down, the star seats in its cut-out, the title lands, the handle
  clear(C.paper); cam(540, 960, 1);
  const tq = twos(t), bq = (tq - OFF) / SPB;
  const bs = 460, bx = 540, by = 640;
  const seat = bq >= 40.4;
  if (seat) star(bx, by + 6, 118, 0, { backing: false });
  if (b >= 38) {
    const k = back(seg(b, 38, 38.4), 1.6), sc = mix(1.7, 1, k);
    if (LOGO) {
      g.save(); g.translate(bx, by); g.scale(sc, sc); g.rotate(-.04 * (1 - k));
      g.shadowColor = 'rgba(20,12,6,.32)'; g.shadowBlur = 5; g.shadowOffsetX = 3; g.shadowOffsetY = 4;
      g.drawImage(LOGO, -bs / 2, -bs / 2, bs, bs); g.restore();
    }
  }
  if (!seat && bq > 39.4) { const fk = eio(seg(bq, 39.4, 40.4)); star(bx, mix(-200, by + 6, fk), mix(150, 118, fk), (1 - fk) * 3); }
  const x0 = (1080 - TITLE.w) / 2;
  TITLE.L.forEach((l, i) => { const tl = 40.75 + i * .25; if (bq < tl) return; const k = eo(seg(b, tl, tl + .18)); drawGlyph({ ...l, x: l.x + x0, y: l.y + 960 }, i < 5 ? C.ink : C.red, Math.sin(30 * Math.PI / 180) * 500 * (1 - k), Math.cos(30 * Math.PI / 180) * 500 * (1 - k)); });
  if (b > 42.5) {
    const k = eo(seg(b, 42.5, 42.9));
    const Lh = lay('h', '@STARSFUELBOT', 120, .05), w = Lh.width + 90;
    g.save(); g.translate(mix(-w, (1080 - w) / 2, k), 1220); g.rotate(-1.5 * Math.PI / 180);
    piece(rough([[0, 0], [w, 4], [w - 10, 150], [8, 146]], 133, 1.8, 10), C.red);
    drawLine(Lh, 45, 128, { col: C.ink, seed: 140 });
    g.restore();
  }
}
export function setLogo(img) { LOGO = img; }
const SC = [[0, S1, 0], [4, S2, 0], [12, S3, 0], [18, S4, 1], [24, S5, 0], [32, S6, 0], [38, S7, 0]];
export function renderFilm(t, opt = {}) {
  const b = (t - OFF) / SPB;
  let i = 0; for (let k = 0; k < SC.length; k++) if (b >= SC[k][0]) i = k;
  g.setTransform(1, 0, 0, 1, 0, 0);
  SC[i][1](t, b);
  const dark = [C.inkL, C.red, C.ink].includes(S.bg);
  if (!opt.nosub) subtitle(t, dark);
  screen();
}
export function events() {
  const e = (b, type) => ({ t: +Bt(b).toFixed(3), type });
  return [e(2, 'slap'), e(3, 'slap'), e(3.6, 'swish'), e(4, 'cut'), ...[6, 7, 8, 9, 10, 11].map(x => e(x, 'step')), e(11.25, 'freeze'),
    e(12, 'drop'), ...[0, 1, 2, 3, 4, 5].map(i => e(12.5 + i * .5, 'slap')), ...[0, 1, 2, 3].map(i => e(15 + i * .25, 'slap')), e(16.5, 'seat'),
    e(18, 'cut'), e(19, 'tap'), e(20, 'tap'), e(21, 'tap'), e(22.5, 'freeze'), e(24, 'cut'), ...[26, 27, 28, 29, 30, 31].map(x => e(x, 'clack')),
    e(32, 'cut'), e(33, 'swish'), e(34, 'catch'), e(38, 'stamp'), e(40.4, 'seat'), ...[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => e(40.75 + i * .25, 'slap')), e(42.5, 'slide'), e(45, 'freeze')];
}
