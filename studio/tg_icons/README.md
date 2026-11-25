# Telegram ikonlar: SVG va PNG

Har bir to'plamda 3 xil format bor:

| Papka | JSON (animatsiya) | SVG (vektor) | PNG (512×512, shaffof fon) |
|---|---|---|---|
| `ios/` | `ios/json/093.json` | `ios/svg/ios_093.svg` | `ios/png/ios_093.png` |
| `android/` | `android/json/002.json` | `android/svg/android_002.svg` | `android/png/android_002.png` |
| `status/` | `status/json/031.json` | `status/svg/status_031.svg` | `status/png/status_031.png` |
| `duck/` | `duck/json/016.json` | `duck/svg/duck_016.svg` | `duck/png/duck_016.png` |

Soni: ios 101, android 515, status 96, duck 181 (duck 042 juda og'ir, faqat JSON'da bor).

- SVG va PNG — animatsiyaning tayyor (oxirgi) kadri; duck uchun o'rtadagi kadr.
- `android/` va `status/` ikonlari oq rangda: oq fonda ko'rinmaydi, rangli yoki to'q fonga qo'ying.
- Raqamni tanlash uchun: `ios/sheet.png`, `android/sheet_1.jpg`, `android/sheet_2.jpg`, `status/sheet.jpg`, `duck/sheet.jpg`.

## To'g'ridan-to'g'ri havola
```
https://raw.githubusercontent.com/sunnat-acm/starsfuel-media/main/studio/tg_icons/ios/svg/ios_093.svg
https://raw.githubusercontent.com/sunnat-acm/starsfuel-media/main/studio/tg_icons/ios/png/ios_093.png
https://raw.githubusercontent.com/sunnat-acm/starsfuel-media/main/studio/tg_icons/android/svg/android_434.svg
```
Saytda: `<img src="…/ios/svg/ios_093.svg" width="96">`. Rasm yoki banner uchun PNG, sifat kerak bo'lsa SVG ishlating.

Qayta yaratish skripti: `export_icons.py` (Playwright + lottie-web).

---

# Telegram Lottie icon & emoji packs

Foydalanuvchi yuborgan 4 ta Lottie (JSON) to'plam. Hammasi 512x512, 60 fps. Har papkada `json/NNN.json` va ko'rinish varag'i (`sheet*.jpg/png`, raqamlari bilan).
Pleyer: `lottie.min.js` (lottie-web 5.12.2, MIT).

| Papka | Soni | Nima | Uzunligi |
|---|---|---|---|
| `ios/` | 101 | iOS uslubidagi rangli "squircle" ikonlar (Stars, Premium, Gift, NFT, TON, telefon...). `index.json` = raqam → nom | 1 s (60 kadr), oxirgi kadr = tayyor holat |
| `android/` | 515 | Telegram Android oq chiziqli (outline) ikonlar: menyu, chat, to'lov, vaqt, media, emoji, raqamli nishonlar | asosan 1 s; 71 tasi statik (1 kadr) |
| `status/` | 96 | Telegram statuslari: verified, SCAM/BUSY/FAKE, batareya, Premium yulduz, NEW, +1/x2, tezlik 1.5x/2x | asosan 2 s; ba'zilari statik |
| `duck/` | 182 | Sariq o'rdak (DMJ Duck) animatsiyali emoji/stikerlar: kulgi, pul, sovg'a, yangi yil, telefon, kod... | 3-4 s, loop |

## StarsFuel uchun eng kerakli
**ios/** — 093 Stars (oltin), 005 Stars pufak, 078 Stars+, 079 boost, 077 Premium, 100 toj, 070 gift, 071 gift-yulduz, 094 NFT olmos, 064 auksion, 044 telefon, 086 Telegram, 092 dollar, 088 TON, 042 check, 006 qalqon, 090 verified, 097 AI.

**android/** (oq outline, rangli fon ustiga yaxshi) — 001 Telegram, 002 yulduz, 003 yulduz+, 007 yulduzlar, 009-010 gift, 320-321 gift, 194 yulduzli chat, 172-173 yulduzli qalqon, 178 yulduzli qulf, 427 kartochka, 434 bank karta, 435 hamyon, 436 do'kon, 438-440 TON, 441-443 olmos (NFT), 444 toj, 446-450 dollar/coin, 451 $, 467 o'sish grafigi, 241-245 telefon, 246 mikrofon, 489 check, 490 x, 496-513 raqamli nishonlar (1..90), 514-515 Premium olmos.

**status/** — 001-002 verified, 003-008 Telegram samolyot, 009 qalqon-yulduz, 030-031 Premium yulduz, 018 SCAM / 019 BUSY / 020 FAKE, 022-025 batareya, 036 NEW, 037 +1, 049 X2, 057 check, 082-087 tezlik (1.5x, 2x, quyon/toshbaqa).

**duck/** (emotsiya, hazil, Reels uchun) — 001-002 oddiy o'rdak, 016 pul ko'zli, 017 sevgi, 060 pul/boy, 062 ko'zoynakli "cool", 063 mashina, 064 yangiliklar, 068 kosmik, 070 uchish, 075 yangi yil, 086 Telegram, 098 Telegram fon, 106 FREE, 113/148 yangi yil 2026/2025, 116 yulduzli, 120 raketa, 133 kostyumli, 151 oltin uzuk.
Eslatma: o'rdak to'plami — boshqa muallifning (DMJ) stikerlari; reklamada asosiy qahramon qilmang, kichik emoji sifatida ishlating. 133 (siyosiy shaxsga o'xshash) va 080/095 (real odamga o'xshash qiz) — ishlatmang. Brend logolari (Apple, Android, Instagram) — reklamada ishlatmang.

## Ishlatish
```html
<script src="../tg_icons/lottie.min.js"></script>
<div data-ic="ios/093" style="width:220px;height:220px"></div>
<script>
document.querySelectorAll('[data-ic]').forEach(el => {
  const a = lottie.loadAnimation({container: el, renderer: 'svg', loop: false, autoplay: false,
    path: '../tg_icons/' + el.dataset.ic.replace('/', '/json/') + '.json'});
  a.addEventListener('DOMLoaded', () => a.goToAndStop(a.totalFrames - 1, true)); // slayd: tayyor holat
});
// video seek(t): a.goToAndStop((t - start) * 60 % a.totalFrames, true)
</script>
```
- `android/` va `status/` oq rangda: rang berish uchun konteynerga CSS `filter` yoki fon (masalan rangli squircle) qo'ying.
- `duck/` uzun (3-4 s): slaydda o'rtadagi kadr (`totalFrames*0.5`) chiroyliroq.
- Sahifani http serverdan oching (file:// da `fetch` ishlamaydi); skrinshotdan oldin barcha `DOMLoaded` ni kuting.
- Namuna: `studio/slides/slides3.html` (5 slaydli karusel, ios ikonlar bilan).
