import asyncio,sys
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-audio-capture=tests/audio/mic48.wav','--autoplay-policy=no-user-gesture-required'])
        pg=await b.new_page(viewport={'width':390,'height':844},device_scale_factor=2)
        pg.on('console',lambda m:print('console',m.type,m.text[:200]))
        pg.on('pageerror',lambda e:print('PE',e))
        await pg.goto('http://127.0.0.1:8000/',wait_until='domcontentloaded')
        await pg.wait_for_timeout(800); await pg.screenshot(path='tests/s0.png')
        await pg.click('#call',force=True)
        for i,t in enumerate([1.0,4.0,12.0,17.0,22.0]):
            await pg.wait_for_timeout(int((t-(0 if i==0 else [1.0,4.0,12.0,17.0,22.0][i-1]))*1000))
            await pg.screenshot(path=f'tests/s{i+1}.png')
            print(t,await pg.inner_text('#status'),'|',await pg.inner_text('#st'),'|',(await pg.inner_text('#sub')).replace('\n',' / ')[:200])
        await b.close()
asyncio.run(main())
