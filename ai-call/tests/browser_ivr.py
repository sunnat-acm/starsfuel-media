import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-audio-capture=tests/audio/mic48b.wav','--autoplay-policy=no-user-gesture-required'])
        pg=await b.new_page(viewport={'width':390,'height':844},device_scale_factor=2)
        pg.on('pageerror',lambda e:print('PE',e))
        await pg.goto('http://127.0.0.1:8000/',wait_until='domcontentloaded'); await pg.wait_for_timeout(600)
        await pg.click('#call',force=True); t=0
        async def snap(at,name):
            nonlocal t
            await pg.wait_for_timeout(int((at-t)*1000)); t=at
            await pg.screenshot(path=f'tests/{name}.png')
            print(at,name,'|',await pg.inner_text('#status'),'|',await pg.inner_text('#st'),'|',(await pg.inner_text('#sub')).replace('\n',' / ')[-160:])
        await snap(0.8,'i0'); await snap(3.5,'i1')
        await pg.click('#pad button[data-d="1"]'); print('pressed 1')
        await snap(5,'i2'); await snap(14,'i3'); await snap(21,'i4'); await snap(32,'i5')
        await b.close()
asyncio.run(main())
