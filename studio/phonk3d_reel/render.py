# usage: python3 render.py T0 SPB DUR worker nworkers
import sys,os
from playwright.sync_api import sync_playwright
T0,SPB,DUR=map(float,sys.argv[1:4]);w,nw=int(sys.argv[4]),int(sys.argv[5])
FPS=30;SUB=2;N=int(DUR*FPS)*SUB
os.makedirs('fr',exist_ok=True)
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-angle=swiftshader','--enable-unsafe-swiftshader']);pg=b.new_page(viewport={'width':1080,'height':1920})
    pg.goto('http://localhost:8766/video11.html');pg.wait_for_function('window.READY',timeout=180000)
    pg.evaluate(f'T0={T0};SPB={SPB}')
    for i in range(w,N,nw):
        fn=f'fr/{i:05d}.jpg'
        if os.path.exists(fn):continue
        pg.evaluate(f'seek({i/(FPS*SUB)})');pg.screenshot(path=fn,type='jpeg',quality=90)
    b.close()
