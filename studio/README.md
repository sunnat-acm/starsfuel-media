# StarsFuel video/slide studio

Hamma narsa kod: HTML sahifa `seek(t)` funksiyasi bilan vaqtga bog'langan, Playwright kadrma-kadr suratga oladi, ffmpeg yig'adi.

| Papka | Nima | Ishga tushirish |
|---|---|---|
| `reel_vertical/` | 9:16 hype Reels (video5.html), beat-sync | `python render4.py preview 1 5 9` → `/tmp/w/g5`; `python render4.py final` → `/tmp/w/fr5` kadrlar |
| `youtube_tolov/` | 16:9 to'lov jarayoni (video6.html) | `python render6.py preview ...` / `final` |
| `slides/` | 1080x1350 karusel slaydlar (slides.html, slides2.html) | `python shot.py`, `python shot2.py` |
| `app_reel/` | Haqiqiy ilova iframe'da, mock API (video3.html) | `python render3.py final` |

Yig'ish (2 subkadr, 60 fps, musiqa bilan):
```
ffmpeg -framerate 120 -i fr/%05d.jpg -i music.wav -filter_complex "[0:v]tmix=frames=2,select='eq(mod(n\,2)\,1)',setpts=N/60/TB,fps=60[v]" -map "[v]" -map 1:a -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -shortest out.mp4
```
Beat: `librosa.beat.beat_track` → sahna o'tishlarini beat vaqtlariga qo'yish.
Yo'llar skriptlarda /home/claude/reelN ga yozilgan — klonlagandan keyin shu joyga nusxa oling yoki yo'lni o'zgartiring.
