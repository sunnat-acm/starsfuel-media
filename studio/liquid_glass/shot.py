import sys
from playwright.sync_api import sync_playwright
from PIL import Image
T=[float(x) for x in sys.argv[1].split(',')]
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-angle=swiftshader','--enable-unsafe-swiftshader']);pg=b.new_page(viewport={'width':1080,'height':1920})
    pg.on('console',lambda m:print(m.type,m.text[:300]));pg.on('pageerror',lambda e:print('PE',str(e)[:500]))
    pg.goto('http://localhost:8770/glass.html');pg.wait_for_function('window.READY',timeout=60000)
    ims=[]
    for i,t in enumerate(T):
        pg.evaluate(f'seek({t})');pg.screenshot(path=f'p{i}.png');ims.append(Image.open(f'p{i}.png').resize((540,960)))
    s=Image.new('RGB',(540*len(ims),960));[s.paste(im,(i*540,0)) for i,im in enumerate(ims)];s.save('cs.jpg',quality=88)
    b.close()
