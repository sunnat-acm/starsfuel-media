# iOS Telegram animated icons (Lottie)

101 ta animatsiyali ikon (foydalanuvchi yuborgan `iOSTelegram_json.zip`). Har biri Lottie JSON: 512x512, 60 fps, 60 kadr (1 s), yumaloq iOS "squircle" fonli rangli ikon.

- `json/NNN.json` — ikonlar, `index.json` — raqam → nom (`093: star_gold`, `077: star_premium`, `070: gift` ...).
- `sheet.png` — hammasining ko'rinishi (oxirgi kadr), raqamlari bilan.
- `lottie.min.js` — lottie-web 5.12.2 (MIT) pleyer.

## StarsFuel uchun eng kerakli
| Mavzu | Ikon |
|---|---|
| Stars | 093 star_gold, 005 stars_bubble, 078 star_add, 079 star_boost |
| Premium | 077 star_premium, 100 crown, 076 stars_team |
| Gift / NFT | 070 gift, 071 gift_star, 094 diamond_nft, 064 auction |
| Telegram akkaunt / raqam | 044 phone, 002 contact, 086 telegram, 049 tg_shield |
| To'lov | 092 dollar, 088 ton, 042 check, 087 hourglass, 061 clock |
| Xavfsizlik | 006 shield_star, 046 key, 099 lock_bubble, 090 verified |
| Support / AI | 044 phone, 097 sparkle_ai_bubble, 003 chat, 012 mic |
| Reklama | 001 megaphone, 055 announce_bubble, 021 free, 083 chart |

Brend logotiplari (013 instagram, 047 android, 048 apple, 088 ton) — faqat kontekstda, reklamada ehtiyot bo'ling.

## Ishlatish (seek(t) bilan, video yoki slayd)
```html
<script src="../tg_icons/lottie.min.js"></script>
<div id="ic" style="width:220px;height:220px"></div>
<script>
const a = lottie.loadAnimation({container: ic, renderer: 'svg', loop: false, autoplay: false,
  path: '../tg_icons/json/093.json'});
// video: a.goToAndStop(Math.min(59, (t - start) * 60), true)  — kirish animatsiyasi
// slayd: a.goToAndStop(59, true)                               — tayyor holat
</script>
```
- `renderer:'svg'` aniq, har o'lchamda keskin. `fetch` uchun sahifani http serverdan oching (file:// da ishlamaydi) yoki JSONni `animationData` sifatida ichiga qo'ying.
- 1 s animatsiya: urilish (beat) ustiga qo'ying; `goToAndStop(frame, true)` — `true` = kadr raqami.
- Render tekshiruvi: `/tmp/lt/sheet.html` uslubida barcha ikonlarni grid qilib skrinshot oling.
