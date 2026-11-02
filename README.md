# ÇSK PWA V2

Bağımsız Çukurambar Spor Kulübü uygulaması.

Aç: `index.html` (veya GitHub Pages açıldıktan sonra canlı adres)

## Demo hesaplar (herhangi bir şifre gerekmez)
- `yigit@cukurambar.com` — yönetici
- `sedanur@cukurambar.com` — antrenör / Kulvar
- `nil@cukurambar.com` — sporcu / kAnka
- `pinar@cukurambar.com` — Dalga
- `veli.ada@cukurambar.com` — veli

## Ekranlar
- Ana (rol bazlı karşılama + maskot)
- Antrenman (sıradaki dersler)
- Takım (kadro)
- Play (maskotlar + Teknik Lab bağlantısı)

## Anka'nın Yükselişi
`anka.js` üretilmiş bir dosyadır; elle düzenlenmez. Oyunun tek kaynağı native uygulamadaki
`ukurambar-y/mobile/csk-native/anka/` klasörüdür (motor, Anka illüstrasyonu, dünyalar, HUD, kayıtlar).
Güncellemek için o depoda:

```sh
cd mobile/csk-native && node scripts/build-anka.mjs --pwa ../../../csk-pwa-v2/anka.js
```

Oyun tam ekran, aynı kökenli bir iframe'de açılır; uygulama gezinmesi gizlenir, çıkışta Play ekranına dönülür.
Kayıtlar (`cskAnka`, `cskAnkaStats`) aynı localStorage'da kalır; eski rekor yeni lobide "İleri" rekoru olarak görünür.

## Teknik Lab
Koç ödev ve bildirim sistemi: `teknik-lab/` klasörü.

Canlı grok.me sitesine yazılmadı.
