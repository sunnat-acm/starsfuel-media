import sys,asyncio
from playwright.async_api import async_playwright
async def main(q,out):
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg=await b.new_page(viewport={'width':1080,'height':1350})
        pg.on('console',lambda m:print(m.text))
        await pg.goto('http://localhost:8765/slide.html'+q)
        await pg.wait_for_function('window.READY',timeout=120000)
        await pg.wait_for_timeout(500)
        await pg.screenshot(path=out,type='png')
        await b.close()
asyncio.run(main(sys.argv[1],sys.argv[2]))
