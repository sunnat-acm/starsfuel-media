import threading,http.server,socketserver,functools,sys,os
from playwright.sync_api import sync_playwright
ROOT='/home/claude/starsfuel-media'
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a):pass
srv=socketserver.ThreadingTCPServer(('127.0.0.1',0),functools.partial(Q,directory=ROOT));srv.daemon_threads=True;threading.Thread(target=srv.serve_forever,daemon=True).start()
mode=sys.argv[1]; PAGE=os.environ.get('PAGE','reel.html'); OUT=os.environ.get('OUT','/tmp/rr')
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':1080,'height':1920})
    pg.goto(f'http://127.0.0.1:{srv.server_address[1]}/studio/reaksiya_reel/{PAGE}');pg.wait_for_function('window.ready===true',timeout=30000)
    if mode=='probe':
        ts=[float(x) for x in sys.argv[2].split(',')];os.makedirs(OUT+'/probe',exist_ok=True)
        for i,t in enumerate(ts):
            pg.evaluate(f'seek({t})');pg.wait_for_timeout(30);pg.screenshot(path=f'{OUT}/probe/{i:02d}.jpg',type='jpeg',quality=80)
    else:
        a,z=int(sys.argv[2]),int(sys.argv[3]);os.makedirs(OUT+'/fr',exist_ok=True)
        for f in range(a,z):
            pg.evaluate(f'seek({f/60})');pg.screenshot(path=f'{OUT}/fr/{f:05d}.jpg',type='jpeg',quality=92)
