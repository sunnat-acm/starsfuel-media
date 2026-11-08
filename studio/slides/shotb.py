import threading,http.server,socketserver,functools,sys
from playwright.sync_api import sync_playwright
ROOT='/home/claude/starsfuel-media'
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a):pass
srv=socketserver.ThreadingTCPServer(('127.0.0.1',0),functools.partial(Q,directory=ROOT));srv.daemon_threads=True;threading.Thread(target=srv.serve_forever,daemon=True).start()
page,out=sys.argv[1],sys.argv[2]
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':1600,'height':900})
    pg.goto(f'http://127.0.0.1:{srv.server_address[1]}/studio/slides/{page}',wait_until='networkidle')
    pg.wait_for_function('window.ready===true',timeout=30000);pg.wait_for_timeout(500)
    pg.screenshot(path=out,type='jpeg',quality=95)
