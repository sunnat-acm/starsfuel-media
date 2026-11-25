import threading,http.server,socketserver,functools,os,glob,sys
from playwright.sync_api import sync_playwright
ROOT='/home/claude/starsfuel-media';T=ROOT+'/studio/tg_icons'
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a):pass
srv=socketserver.ThreadingTCPServer(('127.0.0.1',0),functools.partial(Q,directory=ROOT));srv.daemon_threads=True
threading.Thread(target=srv.serve_forever,daemon=True).start()
html="""<html><body style='margin:0;background:transparent'><div id=c style='width:512px;height:512px'></div><script src='/studio/tg_icons/lottie.min.js'></script>
<script>window.load=(p,pos)=>new Promise(r=>{c.innerHTML='';const a=lottie.loadAnimation({container:c,renderer:'svg',loop:false,autoplay:false,path:p});
a.addEventListener('DOMLoaded',()=>{a.goToAndStop(Math.floor((a.totalFrames-1)*pos),true);requestAnimationFrame(()=>requestAnimationFrame(()=>{
const s=c.querySelector('svg');s.setAttribute('xmlns','http://www.w3.org/2000/svg');s.setAttribute('width','512');s.setAttribute('height','512');s.removeAttribute('style');
r(s.outerHTML)}))})})</script></body></html>"""
open(T+'/_export.html','w').write(html)
packs=sys.argv[1:] or ['ios','android','status','duck']
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':512,'height':512})
    pg.goto(f'http://127.0.0.1:{srv.server_address[1]}/studio/tg_icons/_export.html')
    for pk in packs:
        os.makedirs(f'{T}/{pk}/svg',exist_ok=True);os.makedirs(f'{T}/{pk}/png',exist_ok=True)
        fs=sorted(glob.glob(f'{T}/{pk}/json/*.json'))
        for f in fs:
            n=os.path.basename(f)[:-5];name=f'{pk}_{n}'
            if os.path.exists(f'{T}/{pk}/png/{name}.png') and os.path.exists(f'{T}/{pk}/svg/{name}.svg'): continue
            try: svg=pg.evaluate(f"Promise.race([load('/studio/tg_icons/{pk}/json/{n}.json',{.5 if pk=='duck' else 1}),new Promise(r=>setTimeout(()=>r(null),15000))])")
            except Exception as e: svg=None
            if not svg:
                print('SKIP',name,flush=True);pg.reload();continue
            open(f'{T}/{pk}/svg/{name}.svg','w').write('<?xml version="1.0" encoding="UTF-8"?>\n'+svg)
            pg.locator('#c').screenshot(path=f'{T}/{pk}/png/{name}.png',omit_background=True)
        print(pk,len(fs),flush=True)
os.remove(T+'/_export.html')
