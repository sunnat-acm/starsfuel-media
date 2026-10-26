import sys,os,threading,http.server,socketserver,functools
from playwright.sync_api import sync_playwright
MODE=sys.argv[1];D=21.33
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a):pass
    def handle_error(self,*a):pass
srv=socketserver.ThreadingTCPServer(('127.0.0.1',0),functools.partial(Q,directory='/home/claude/reel3'));srv.daemon_threads=True;threading.Thread(target=srv.serve_forever,daemon=True).start()
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':1080,'height':1920})
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.route('**/*',lambda r: r.continue_() if r.request.url.startswith('http://127.0.0.1') else r.abort())
    pg.goto('http://127.0.0.1:%d/video5.html'%srv.server_address[1],wait_until='load');pg.wait_for_timeout(1500)
    def sk(t):
        pg.evaluate(f'seek({t})');pg.evaluate('new Promise(r=>{const i=[...document.images];Promise.all(i.map(x=>x.decode().catch(()=>0))).then(r)})')
    if MODE=='preview':
        os.makedirs('/tmp/w/g5',exist_ok=True)
        for i,t in enumerate([float(x) for x in sys.argv[2:]]):
            sk(t);pg.screenshot(path=f'/tmp/w/g5/{i:02d}.jpg',type='jpeg',quality=80)
        print('errs',errs[:3])
    else:
        os.makedirs('/tmp/w/fr5',exist_ok=True);k=0
        for f in range(int(D*60)):
            for s in range(2):
                sk(f/60+s/120);pg.screenshot(path=f'/tmp/w/fr5/{k:05d}.jpg',type='jpeg',quality=88);k+=1
            if f%60==0:print(f,flush=True)
        print('done',errs[:3])
