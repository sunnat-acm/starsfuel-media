import sys,time
from playwright.sync_api import sync_playwright
from PIL import Image
B=[float(x) for x in sys.argv[1].split(',')]
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']);pg=b.new_page(viewport={'width':1080,'height':1920})
    pg.on('console',lambda m: m.type=='error' and print('ERR',m.text[:300]))
    pg.goto('http://localhost:8766/video11.html');pg.wait_for_function('window.READY',timeout=180000)
    T0,SPB=pg.evaluate('[T0,SPB]');ims=[];t0=time.time()
    for x in B:
        pg.evaluate(f'seek({T0+x*SPB})');pg.screenshot(path='/tmp/s.jpg',type='jpeg',quality=80);ims.append(Image.open('/tmp/s.jpg').resize((270,480)))
    print('per frame',(time.time()-t0)/len(B))
    n=len(ims);c=6;s=Image.new('RGB',(270*c,480*((n+c-1)//c)))
    for i,im in enumerate(ims):s.paste(im,((i%c)*270,(i//c)*480))
    s.save('cs.jpg',quality=85)
    b.close()
