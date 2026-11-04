import sys
from playwright.sync_api import sync_playwright
from PIL import Image
T=[float(x) for x in sys.argv[1].split(',')]
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':1080,'height':1920})
    pg.on('pageerror',lambda e:print('PE',str(e)[:400]))
    pg.goto('http://localhost:8771/ad1.html');pg.wait_for_function('window.READY',timeout=60000)
    ims=[]
    for t in T:
        pg.evaluate(f'seek({t})');pg.screenshot(path='/tmp/a.jpg',type='jpeg',quality=80);ims.append(Image.open('/tmp/a.jpg').resize((270,480)))
    c=6;s=Image.new('RGB',(270*c,480*((len(ims)+c-1)//c)))
    for i,im in enumerate(ims):s.paste(im,((i%c)*270,(i//c)*480))
    s.save('cs.jpg',quality=85);b.close()
