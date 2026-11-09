# Skills library (video & motion)

Asl manbalar (2026-11-09 da olingan, faqat matnli qo'llanmalar). StarsFuel uchun birlashtirilgan qoidalar: `motion-rules`, `video-frameworks`, `starsfuel-reels` skill'larida.

| Papka | Manba | Litsenziya | Nima uchun |
|---|---|---|---|
| `hyperframes/` | github.com/heygen-com/hyperframes (~50k ⭐) | Apache-2.0 | HTML → video framework (GSAP timeline), motion craft, motion-doctrine (vector law, seam), cut-the-curve, captions |
| `video-shotcraft/` | github.com/Vincentwei1021/video-shotcraft (~3-7k ⭐) | Apache-2.0 | 125 ta kadr retsepti (`references/shots/`), aesthetic-rules (R/Q/S/C/P), music-beat-sync, sound-design |
| `claude-motion-design/` | github.com/howseen-ai/claude-motion-design | MIT | Bizning usul (HTML + seek(t) + Playwright + ffmpeg): critique loop, spring presets, render gigiyenasi |
| `iart-*` | github.com/iart-ai (motion-skills to'plami) | MIT | short-form (Reels retention, safe zone), caption-animation, beat-sync-editing, kinetic-typography, motion-design |
| `openmontage/` | github.com/calesthio/OpenMontage (~65k ⭐) | AGPL-3.0 | Faqat ijodiy qo'llanmalar (short-form, commercial, typography, sound) — kodini olmaganmiz |
| Remotion | github.com/remotion-dev/skills | (repo'da LICENSE yo'q) | Saqlanmadi; kerak bo'lsa `npx skills add remotion-dev/skills`. Remotion o'zi kompaniyalar uchun pullik litsenziya talab qilishi mumkin (remotion.dev/license) |

Reklama/telemetriya qismlari bizning skill'larga kiritilmagan (shotcraft "muallifni @ qiling / showcase", HyperFrames "usage beacon", Framey desktop takliflari).

## HyperFrames bu sandboxda (tekshirilgan, v0.9.26)
```bash
mkdir -p /tmp/hf && cd /tmp/hf && npm i hyperframes@0.9.26 gsap@3.13.0
export HYPERFRAMES_TELEMETRY=0 DO_NOT_TRACK=1 \
       HYPERFRAMES_BROWSER_PATH=$(ls -d /opt/pw-browsers/chromium-*/chrome-linux*/chrome | head -1)
npx hyperframes init film --skip-skills --non-interactive
cp node_modules/gsap/dist/gsap.min.js film/assets/   # CDN bloklangan: index.html da assets/gsap.min.js
cd film && npx hyperframes check --json && npx hyperframes render --output out.mp4
```
- 1080x1920 uchun root'da `data-width="1080" data-height="1920"`.
- "BeginFrame did not run" ogohlantirishi normal (screenshot capture, sekinroq lekin to'g'ri).
