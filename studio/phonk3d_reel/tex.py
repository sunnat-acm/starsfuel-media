from playwright.sync_api import sync_playwright
import sys
names=sys.argv[1:]
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':430,'height':932},device_scale_factor=3)
    for n in names:
        pg.goto(f'http://localhost:8766/frame.html?{n}');pg.wait_for_timeout(400);pg.screenshot(path=f'tex_{n}.jpg',type='jpeg',quality=92)
    b.close()
