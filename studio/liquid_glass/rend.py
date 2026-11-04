import os
from playwright.sync_api import sync_playwright
os.makedirs('fr',exist_ok=True)
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-angle=swiftshader','--enable-unsafe-swiftshader']);pg=b.new_page(viewport={'width':1080,'height':1920})
    pg.goto('http://localhost:8770/glass.html');pg.wait_for_function('window.READY',timeout=60000)
    for i in range(6*60):
        pg.evaluate(f'seek({i/60})');pg.screenshot(path=f'fr/{i:04d}.jpg',type='jpeg',quality=90)
    b.close()
