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
