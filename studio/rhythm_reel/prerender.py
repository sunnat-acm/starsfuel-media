import threading,http.server,socketserver,functools,json
from playwright.sync_api import sync_playwright
ROOT='/home/claude/starsfuel-media'
IC=['ios/093','ios/077','ios/070','ios/094','ios/044','ios/086','ios/092','ios/042','ios/005','ios/100','ios/071','ios/064','ios/006','ios/090','ios/058','ios/061','ios/078','ios/079','ios/003','ios/057',
    'android/002','android/009','android/441','android/514','android/444','android/434','android/435','android/001','android/243','android/320','android/007','android/442',
    'duck/016','duck/060','duck/120','duck/017','duck/001','status/031','status/001']
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a):pass
srv=socketserver.ThreadingTCPServer(('127.0.0.1',0),functools.partial(Q,directory=ROOT));srv.daemon_threads=True;threading.Thread(target=srv.serve_forever,daemon=True).start()
html="""<html><body style='margin:0;background:transparent'><div id=c style='width:256px;height:256px'></div><script src='/studio/tg_icons/lottie.min.js'></script>
<script>window.load=(p,pos)=>new Promise(r=>{c.innerHTML='';const a=lottie.loadAnimation({container:c,renderer:'svg',loop:false,autoplay:false,path:'/studio/tg_icons/'+p.replace('/','/json/')+'.json'});a.addEventListener('DOMLoaded',()=>{a.goToAndStop(Math.floor((a.totalFrames-1)*pos),true);requestAnimationFrame(()=>requestAnimationFrame(r))})})</script></body></html>"""
open(ROOT+'/studio/rhythm_reel/_pre.html','w').write(html)
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':256,'height':256},device_scale_factor=2)
    pg.goto(f'http://127.0.0.1:{srv.server_address[1]}/studio/rhythm_reel/_pre.html')
    for ic in IC:
        pos=.5 if ic.startswith('duck') else 1
        pg.evaluate(f"load('{ic}',{pos})")
        pg.locator('#c').screenshot(path=f"{ROOT}/studio/rhythm_reel/icons/{ic.replace('/','_')}.png",omit_background=True)
