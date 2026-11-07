"""DeepSeek chat (OpenAI-compatible) with token streaming."""
from openai import AsyncOpenAI
from .. import config as C

_client = None


def client():
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=C.DEEPSEEK_API_KEY, base_url=C.DEEPSEEK_BASE_URL, timeout=30, max_retries=1)
    return _client


async def llm_stream(messages, lang):
    resp = await client().chat.completions.create(
        model=C.DEEPSEEK_MODEL, messages=messages, stream=True,
        temperature=0.4, max_tokens=260)
    async for ch in resp:
        d = ch.choices[0].delta.content if ch.choices else None
        if d:
            yield d
