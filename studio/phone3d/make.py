# Renders screen textures and transparent 3D phone PNGs. usage: make.py OUTDIR
import threading,http.server,socketserver,functools,sys,os
from playwright.sync_api import sync_playwright
ROOT='/home/claude/starsfuel-media';OUT=sys.argv[1];os.makedirs(OUT,exist_ok=True)
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a):pass
srv=socketserver.ThreadingTCPServer(('127.0.0.1',0),functools.partial(Q,directory=ROOT));srv.daemon_threads=True;threading.Thread(target=srv.serve_forever,daemon=True).start()
B=f'http://127.0.0.1:{srv.server_address[1]}/studio/phone3d/'
POSE={'buy':'rx=0.10&ry=3.50&rz=0.07','ok':'rx=0.12&ry=2.84&rz=-0.13'}
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    for lang in ('uz','ru'):
        for kind in ('buy','ok'):
            pg=b.new_page(viewport={'width':600,'height':1301},device_scale_factor=2)
            pg.goto(f'{B}screen.html?kind={kind}&lang={lang}');pg.wait_for_function('window.ready===true');tex=f'{OUT}/scr_{kind}_{lang}.png';pg.screenshot(path=tex);pg.close()
            os.makedirs(ROOT+'/studio/phone3d/_tex',exist_ok=True);os.replace(tex,f'{ROOT}/studio/phone3d/_tex/{kind}_{lang}.png')
            pg=b.new_page(viewport={'width':900,'height':1500})
            pg.goto(f'{B}render.html?w=900&h=1500&d=5.4&img=_tex/{kind}_{lang}.png&{POSE[kind]}');pg.wait_for_function('window.ready===true',timeout=90000);pg.wait_for_timeout(300)
            pg.screenshot(path=f'{OUT}/phone_{kind}_{lang}.png',omit_background=True);pg.close();print(kind,lang)
