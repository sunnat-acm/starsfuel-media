# MotionKit — ovozli reklama studiyasi

- `motionkit.js`: MK.captions (so'zma-so'z kinetik subtitr), MK.timeWords, MK.tr.{cut,whip,zoomBlur,glitch,liquid,mask,slam}, MK.shake, MK.ease.
- `ad1.html`: namuna reklama (hook→muammo→yechim→qiymat→CTA), 5 sahna, o'tishlar: glitch, liquid, whip, zoomBlur.
- `script.json`: ssenariy (`say` = ovoz matni, `cap` = [ko'rinadigan, aytiladigan, kalit]).
- `timeline.json`: sahna chegaralari beat'ga (SPB 0.6255) yopishtirilgan, drop (61.55 s) yechim sahnasida; `music_ss`.
- Audio: VoiceLab (abdulhay-ovoz skill) → atempo 1.1 → voice.wav; earshot sfx (cues.json); mix: musiqa 0.42 + sidechain duck, ovoz 2.2, ≈ -14 LUFS.
- Render: `python render.py 0 2 & python render.py 1 2` (60 subkadr/s) → tmix → 30 fps.
