from playwright.sync_api import sync_playwright
import http.server,threading,functools
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a):pass
srv=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Q,directory='/home/claude/reel2'));threading.Thread(target=srv.serve_forever,daemon=True).start()
with sync_playwright() as p:
    b=p.chromium.launch()
    for H,name in [(823,'tgacc'),(1900,'tgacc_tall')]:
        pg=b.new_page(viewport={'width':430,'height':H},device_scale_factor=3)
        pg.add_init_script(path='/home/claude/reel2/mock_dark.js')
        pg.goto('http://127.0.0.1:%d/index.html'%srv.server_address[1],wait_until='domcontentloaded')
        tick=lambda n:[pg.evaluate('__tick(1000/60)') for i in range(n)]
        tick(400);pg.click('[onclick="switchTab(2, this)"]');tick(60);pg.click('[onclick="openTgAccountsView()"]');tick(200)
        pg.screenshot(path=f'scr/{name}.png');print(name,pg.evaluate('document.documentElement.scrollHeight'))
        pg.close()
    b.close()
