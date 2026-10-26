import threading,http.server,socketserver,functools
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a):pass
srv=socketserver.ThreadingTCPServer(('127.0.0.1',0),functools.partial(Q,directory='/home/claude/slides'));srv.daemon_threads=True;threading.Thread(target=srv.serve_forever,daemon=True).start()
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':1080,'height':1350},device_scale_factor=1)
    for i in range(1,6):
        pg.goto(f'http://127.0.0.1:{srv.server_address[1]}/slides2.html?s={i}',wait_until='networkidle');pg.wait_for_timeout(500)
        pg.screenshot(path=f'/home/claude/slides/p{i}.jpg',type='jpeg',quality=95)
