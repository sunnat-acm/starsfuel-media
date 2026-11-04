import sys,os
from playwright.sync_api import sync_playwright
w,nw=int(sys.argv[1]),int(sys.argv[2]);DUR=22.52;N=int(DUR*60)
os.makedirs('fr',exist_ok=True)
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':1080,'height':1920})
    pg.goto('http://localhost:8771/ad1.html');pg.wait_for_function('window.READY',timeout=60000)
    for i in range(w,N,nw):
        fn=f'fr/{i:05d}.jpg'
        if os.path.exists(fn):continue
        pg.evaluate(f'seek({i/60})');pg.screenshot(path=fn,type='jpeg',quality=90)
    b.close()
