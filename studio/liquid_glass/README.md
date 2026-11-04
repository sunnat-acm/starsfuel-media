# Liquid glass shader

WebGL2 fragment shader (glass.html). API: `renderGlass(bgCanvas, shapes, opts)`. bgCanvas = har kadrda chiziladigan 2D canvas (fon). shapes = [{x,y,w,h,r}] (markaz, px), smooth-min bilan suyuq qo`shiladi.
opts: k (qo`shilish 60-80), refract (chetda sinish px, 70-90), bezel (qirra eni 60-70), frost (blur px 9-16), disp (RGB dispersiya .15-.25), tint/tintCol, spec (yaltiroq .5-.6).
Matnni shisha ustiga DOM bilan qo`ying (text-shadow bilan). Fon canvas tekstura: flipY yo`q, `texture(uBg, px/uRes)`.
Render: `python rend.py` (60 subkadr/s) -> ffmpeg tmix -> 30fps.
