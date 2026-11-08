import threading,http.server,socketserver,functools,sys
from playwright.sync_api import sync_playwright
ROOT='/home/claude/starsfuel-media'; OUT=sys.argv[1] if len(sys.argv)>1 else '/home/claude/sl3'
import os; os.makedirs(OUT,exist_ok=True)
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a):pass
srv=socketserver.ThreadingTCPServer(('127.0.0.1',0),functools.partial(Q,directory=ROOT));srv.daemon_threads=True;threading.Thread(target=srv.serve_forever,daemon=True).start()
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':1080,'height':1350})
    for i in range(1,6):
        pg.goto(f'http://127.0.0.1:{srv.server_address[1]}/studio/slides/slides3.html?s={i}',wait_until='networkidle')
        pg.wait_for_function('window.ready===true',timeout=15000);pg.wait_for_timeout(400)
        pg.screenshot(path=f'{OUT}/{i}.jpg',type='jpeg',quality=95)
