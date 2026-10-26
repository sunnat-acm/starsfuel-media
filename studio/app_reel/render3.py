import sys,subprocess,threading,http.server,socketserver,functools,json
from playwright.sync_api import sync_playwright
MODE=sys.argv[1]; D=18.88
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a):pass
    def handle_error(self,*a):pass
srv=socketserver.ThreadingTCPServer(('127.0.0.1',0),functools.partial(Q,directory='/home/claude/reel2'));srv.daemon_threads=True;threading.Thread(target=srv.serve_forever,daemon=True).start()
BAL="document.querySelector('#starsContent .payment-method-option[data-method=balance]')"
BTN="document.querySelector('#starsContent .pill-button')"
EV=[(5.2,'tap','#starsAmount','focus'),(5.45,'type','#starsAmount','100',9),
    (6.45,'tap','#starsUsername','focus'),(6.68,'type','#starsUsername','@monk',10),
    (7.9,'tapjs',BAL,'click'),(8.75,'tapjs',BTN,'click')]
OK_T=11.0
def rect(fr,sel,js=False):
    q=sel if js else f"document.querySelector('{sel}')"
    return fr.evaluate(f"(()=>{{const e={q};const r=e.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]}})()")
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':1080,'height':1920})
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.add_init_script(path='/home/claude/reel2/mock.js')
    pg.route('**/*',lambda r: r.continue_() if r.request.url.startswith('http://127.0.0.1') else r.abort())
    pg.goto('http://127.0.0.1:%d/video3.html'%srv.server_address[1],wait_until='domcontentloaded')
    for _ in range(100):
        if pg.evaluate('typeof document.getElementById("fr").contentWindow.__tick')=='function':break
        pg.wait_for_timeout(200)
    pg.wait_for_timeout(800)
    fr=[f for f in pg.frames if f!=pg.main_frame][0]
    for i in range(240): fr.evaluate('__tick(1000/60)')
    pg.evaluate(f'OK_T={OK_T};KEYS.push({{t:{OK_T},x:350,y:466}})')
    reg=set();done=set();st={'alert':None}
    def run_events(t):
        for i,e in enumerate(EV):
            tt=e[0]
            if i not in reg and t>=tt-0.6 and e[1] in('tap','tapjs'):
                x,y=rect(fr,e[2],e[1]=='tapjs')
                pg.evaluate(f'KEYS.push({{t:{tt},x:{x},y:{y}}});KEYS.sort((a,b)=>a.t-b.t)');reg.add(i)
            if e[1]=='type':
                if t>=tt:
                    n=min(len(e[3]),int((t-tt)*e[4])+1)
                    fr.evaluate(f"(()=>{{const el=document.querySelector('{e[2]}');const v={json.dumps(e[3][:n])};if(el.value!==v){{el.value=v;el.dispatchEvent(new Event('input',{{bubbles:true}}))}}}})()")
            elif i not in done and t>=tt:
                done.add(i)
                if e[3]=='focus': fr.evaluate(f"document.querySelector('{e[2]}').focus()")
                else:
                    q=e[2] if e[1]=='tapjs' else f"document.querySelector('{e[2]}')"
                    fr.evaluate(f"{q}.click()")
        if st['alert'] is None and t>8 and fr.evaluate('(window.__alerts||[]).length')>0:
            st['alert']=t; pg.evaluate(f'ALERT_T={t}')
        if t>=OK_T and 'ok' not in done:
            done.add('ok'); fr.evaluate("document.activeElement&&document.activeElement.blur()")
    if MODE=='preview':
        times=[float(x) for x in sys.argv[2:]] or [i*.5+.25 for i in range(int(D/.5))]
        FPS=60;ti=0
        for f in range(int(D*FPS)):
            t=f/FPS; run_events(t); fr.evaluate('__tick(1000/60)')
            if ti<len(times) and t>=times[ti]:
                pg.evaluate(f'seek({t})');pg.screenshot(path=f'/tmp/w/g3/{ti:02d}.jpg',type='jpeg',quality=80);ti+=1
        print('alert',st['alert'],'errors',errs[:5])
    else:
        import os;os.makedirs('/tmp/w/fr3',exist_ok=True)
        N=int(D*60);k=0
        for f in range(N):
            for s in range(2):
                t=f/60+s/120
                run_events(t);fr.evaluate('__tick(1000/120)');pg.evaluate(f'seek({t})')
                pg.screenshot(path=f'/tmp/w/fr3/{k:05d}.jpg',type='jpeg',quality=88);k+=1
            if f%60==0:print(f,flush=True)
        print('done alert',st['alert'],errs[:5])
