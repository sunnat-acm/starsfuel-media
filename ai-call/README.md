# StarsFuel AI qo'ng'iroq (Telegram WebApp)

Foydalanuvchi WebApp'da "Qo'ng'iroq qilish"ni bosadi → AI go'shakni ko'taradi, salomlashadi → jonli suhbat.
Mikrofon → **Silero VAD** (gap boshlanishi/tugashi, serverda, CPU) → **VoiceLab STT** (uz/ru avtomatik)
→ **DeepSeek** (stream) → gapma-gap **VoiceLab TTS** (24 kHz stream) → WebApp. AI gapirayotganda
foydalanuvchi gapirsa (0.3 s dan ko'p) AI darhol to'xtaydi (barge-in).

## Serverga o'rnatish (oddiy VPS, GPU shart emas)
1. VPS: Ubuntu 22/24, 1 vCPU / 1 GB RAM yetadi. Docker o'rnating: `curl -fsSL https://get.docker.com | sh`
2. Domen: masalan `call.sizningdomen.uz` uchun A-yozuvni VPS IP'siga qarating (HTTPS majburiy — Telegram talabi).
3. Kod: `git clone https://github.com/sunnat-acm/starsfuel-media && cd starsfuel-media/ai-call`
4. `cp .env.example .env` va `.env` ni to'ldiring: DOMAIN, VOICELAB_API_KEY (tts:realtime, stt:realtime ruxsatlari bilan), DEEPSEEK_API_KEY, TG_BOT_TOKEN (WebApp ochadigan bot).
5. `docker compose up -d --build` → `https://DOMEN/health` `{"ok":true}` qaytarishi kerak. HTTPS sertifikatni Caddy o'zi oladi.
6. BotFather → /mybots → bot → Bot Settings → Menu Button → URL: `https://DOMEN/` (yoki /newapp bilan Mini App).

## Sozlash
- Bilimlar va narxlar: `server/prompts.py` (KNOWLEDGE). O'zgartirgach `docker compose up -d --build`.
- Ovozlar: `.env` dagi VOICE_UZ / VOICE_RU (VoiceLab voice_id).
- Tezlik/sezgirlik: VAD_SILENCE_MS (gap tugadi deb hisoblash pauzasi, 450–700), BARGE_IN_MIN_MS.
- Keyin GPU server bo'lsa: STT_PROVIDER=voicestudio, TTS_PROVIDER=voicestudio, VOICESTUDIO_URL (VoiceStudio Docker, AGPL-3.0).

## Sinov
- Mock rejim (kalitlarsiz): `STT_PROVIDER=mock TTS_PROVIDER=mock LLM_PROVIDER=mock ALLOW_NO_AUTH=1 uvicorn server.app:app`
  va `python tests/sim_client.py ws://127.0.0.1:8000/ws clip.wav@7`.
- Haqiqiy sinov GitHub Actions'da: workflow `ai-call-e2e` (secrets: VOICELAB_API_KEY, DEEPSEEK_API_KEY).

## Xavfsizlik
Kalitlar faqat serverdagi `.env` da. WebApp ulanishi Telegram initData imzosi bilan tekshiriladi
(`ALLOW_NO_AUTH=1` faqat sinov uchun). AI karta raqami, parol, SMS kod so'ramaydi.
