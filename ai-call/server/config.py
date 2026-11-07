import os
from dotenv import load_dotenv

load_dotenv()
E = os.environ.get

# keys (only in .env on the server, never in git)
VOICELAB_API_KEY = E("VOICELAB_API_KEY", "")
DEEPSEEK_API_KEY = E("DEEPSEEK_API_KEY", "")
TG_BOT_TOKEN = E("TG_BOT_TOKEN", "")            # the bot that opens the WebApp (for initData check)

# providers — STT: groq | whisper | voicelab | voicestudio | mock ; TTS: edge | voicelab | voicestudio | mock
STT_PROVIDER = E("STT_PROVIDER", "groq")
TTS_PROVIDER = E("TTS_PROVIDER", "edge")
LLM_PROVIDER = E("LLM_PROVIDER", "deepseek")    # deepseek | mock

DEEPSEEK_BASE_URL = E("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
DEEPSEEK_MODEL = E("DEEPSEEK_MODEL", "deepseek-chat")

VOICELAB_BASE = E("VOICELAB_BASE", "https://api.voicelab.uz/v1")
VOICELAB_WS = E("VOICELAB_WS", "wss://api.voicelab.uz/v1")
VOICE_UZ = E("VOICE_UZ", "voice_M-p5iz9z_kPWNm_C0cFqbC6X")      # Abdulhay Otaxo'jayev
VOICE_RU = E("VOICE_RU", "voice_78a0b8e8-e193-42b7-9cf8-c9b96e84501f")  # Alina
TTS_SPEED = float(E("TTS_SPEED", "1.05"))
STT_LANGUAGE = E("STT_LANGUAGE", "auto")         # auto | uz | ru

# free providers
GROQ_API_KEY = E("GROQ_API_KEY", "")
GROQ_STT_MODEL = E("GROQ_STT_MODEL", "whisper-large-v3-turbo")
WHISPER_MODEL = E("WHISPER_MODEL", "small")          # local faster-whisper fallback: small | medium | large-v3-turbo
WHISPER_THREADS = int(E("WHISPER_THREADS", "4"))
EDGE_VOICE_UZ = E("EDGE_VOICE_UZ", "uz-UZ-MadinaNeural")
EDGE_VOICE_RU = E("EDGE_VOICE_RU", "ru-RU-SvetlanaNeural")

VOICESTUDIO_URL = E("VOICESTUDIO_URL", "http://voicestudio:3900/v1")
VOICESTUDIO_KEY = E("VOICESTUDIO_KEY", "not-needed")
VOICESTUDIO_VOICE = E("VOICESTUDIO_VOICE", "default")

# turn taking
VAD_THRESHOLD = float(E("VAD_THRESHOLD", "0.55"))
VAD_SILENCE_MS = int(E("VAD_SILENCE_MS", "550"))       # pause that ends the user's turn
VAD_MIN_SPEECH_MS = int(E("VAD_MIN_SPEECH_MS", "200"))
BARGE_IN_MIN_MS = int(E("BARGE_IN_MIN_MS", "300"))     # user must speak this long to interrupt the AI
MAX_CALL_SEC = int(E("MAX_CALL_SEC", "600"))
SILENCE_HANGUP_SEC = int(E("SILENCE_HANGUP_SEC", "45"))

SUPPORT_NAME = E("SUPPORT_NAME", "StarsFuel Support")
OPERATOR_NAME = E("OPERATOR_NAME", "Madina")
MENU_WAIT_SEC = float(E("MENU_WAIT_SEC", "4"))
OPERATOR_CONTACT = E("OPERATOR_CONTACT", "@StarsFuelBot")      # where to send people when a human is needed
ALLOW_NO_AUTH = E("ALLOW_NO_AUTH", "0") == "1"                 # dev only: allow opening outside Telegram
MODEL_DIR = E("MODEL_DIR", os.path.join(os.path.dirname(__file__), "..", "models"))
