import logging, os
from fastapi import FastAPI, WebSocket
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from . import config as C
from .call import Call
from .tg_auth import validate

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
WEB = os.path.join(os.path.dirname(__file__), "..", "web")
app = FastAPI(title="StarsFuel AI Call")


@app.on_event("startup")
async def warm():
    import asyncio
    from .call import warm_prompts
    asyncio.create_task(warm_prompts())
    if C.STT_PROVIDER == "whisper" or (C.STT_PROVIDER == "groq" and not C.GROQ_API_KEY):
        from .providers import whisper
        await asyncio.get_running_loop().run_in_executor(None, whisper._local, b"\x00\x00" * 16000)


@app.get("/")
async def index():
    return FileResponse(os.path.join(WEB, "index.html"), headers={"Cache-Control": "no-cache"})


@app.get("/health")
async def health():
    return JSONResponse({"ok": True, "stt": C.STT_PROVIDER, "tts": C.TTS_PROVIDER, "llm": C.LLM_PROVIDER})


@app.websocket("/ws")
async def ws_call(ws: WebSocket):
    await ws.accept()
    init = ws.query_params.get("initData", "")
    user = validate(init, C.TG_BOT_TOKEN)
    if user is None and not C.ALLOW_NO_AUTH:
        await ws.send_text('{"type":"error","code":"auth","message":"Telegram orqali oching"}')
        await ws.close(code=4401)
        return
    await Call(ws, user).run()


app.mount("/static", StaticFiles(directory=WEB), name="static")
