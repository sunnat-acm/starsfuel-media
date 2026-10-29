from playwright.sync_api import sync_playwright
import http.server,threading,functools
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a):pass
srv=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Q,directory='/home/claude/reel2'));threading.Thread(target=srv.serve_forever,daemon=True).start()
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':430,'height':823},device_scale_factor=3)
    pg.add_init_script(path='/home/claude/reel2/mock_dark.js')
    
    pg.goto('http://127.0.0.1:%d/index.html'%srv.server_address[1],wait_until='domcontentloaded')
    def tick(n=120):
        for i in range(n): pg.evaluate('__tick(1000/60)')
    tick(400)
    def shot(n): tick(90); pg.screenshot(path=f'scr/{n}.png')
    shot('stars')
    pg.evaluate("(()=>{const a=document.getElementById('starsAmount');a.value='100';a.dispatchEvent(new Event('input',{bubbles:true}));const u=document.getElementById('starsUsername');u.value='@monk';u.dispatchEvent(new Event('input',{bubbles:true}));u.blur()})()")
    shot('stars_filled')
    pg.click("[onclick=\"switchCategory('premium')\"]");tick(60);pg.evaluate("selectPremium(3,document.querySelectorAll('[onclick^=\"selectPremium(3\"]')[0])");shot('premium')
    pg.click("[onclick=\"switchCategory('gift')\"]");shot('gift')
    pg.click("[onclick=\"switchCategory('stars')\"]")
    for i,n in [(1,'top'),(2,'xizmat'),(3,'akkount'),(4,'tarix')]:
        pg.click(f'[onclick="switchTab({i}, this)"]');shot(n)
    b.close()
