# StarsFuel video/slide studio

Hamma narsa kod: HTML sahifa `seek(t)` funksiyasi bilan vaqtga bog'langan, Playwright kadrma-kadr suratga oladi, ffmpeg yig'adi.

| Papka | Nima | Ishga tushirish |
|---|---|---|
| `reel_vertical/` | 9:16 hype Reels (video5.html), beat-sync | `python render4.py preview 1 5 9` → `/tmp/w/g5`; `python render4.py final` → `/tmp/w/fr5` kadrlar |
| `youtube_tolov/` | 16:9 to'lov jarayoni (video6.html) | `python render6.py preview ...` / `final` |
| `slides/` | 1080x1350 karusel slaydlar (slides.html, slides2.html) | `python shot.py`, `python shot2.py` |
| `vibe_reel/` | 9:16 motivatsion reel, bokeh fonlar (video8.html, mkbg.py) | render skripti ichida |
| `phone3d/` | 3D iPhone 15 Pro Max (phone.glb, CC-BY polyman) + slayd (slide.html) | `python shot.py "?ry=3.55&d=6.9&img=..." out.png` |
| `phonk3d_reel/` | 3D telefonli phonk reel, qora-yashil neon (video11.html; video12 = Telegram raqamlar) | ekranlar: `cap.py` + `tex.py`; render: `PAGE=video11.html python render.py T0 SPB DUR w n` (2 worker, 30fps x2) |
| `app_reel/` | Haqiqiy ilova iframe'da, mock API (video3.html) | `python render3.py final` |

Yig'ish (2 subkadr, 60 fps, musiqa bilan):
```
ffmpeg -framerate 120 -i fr/%05d.jpg -i music.wav -filter_complex "[0:v]tmix=frames=2,select='eq(mod(n\,2)\,1)',setpts=N/60/TB,fps=60[v]" -map "[v]" -map 1:a -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -shortest out.mp4
```
Beat: `librosa.beat.beat_track` → sahna o'tishlarini beat vaqtlariga qo'yish.
Yo'llar skriptlarda /home/claude/reelN ga yozilgan — klonlagandan keyin shu joyga nusxa oling yoki yo'lni o'zgartiring.

3D telefon: ekran materiali `pIJKfZsazmcpEiU` (flipY=true), three@0.169.0 + DRACOLoader, ekran nisbati 2.169, Dynamic Island tepadan 1.3–5.2%.
Ilova ekranlari: mock app (index.html/app.js) + `mock_dark.js` (to'q yashil tema), viewport 430x823 @3x, ustiga iOS status bar + Telegram "Yopish" header (frame.html) → 1290x2796.
Katta video (>20MB) jsDelivr'dan o'tmaydi — Instagram uchun `-b:v 6M` bilan qayta siqing.
