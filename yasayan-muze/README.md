# Yaşayan Müze VR

Zamanın Tanıkları'nın ilk oynanabilir WebXR prototipi. Meta Quest 3 tarayıcısında kurulum olmadan açılır.

**Adres:** https://lakersgursoy-cloud.github.io/csk-pwa-v2/yasayan-muze/

## Bu sürümde olanlar

- Gezilebilir müze salonu, konuşan heykel, iki açık zaman kapısı
- İstanbul 1453: topçu yardımcısı, Bizans savunmacısı, esnaf
- Paris 1789: matbaa çalışanı, Fransız Muhafızı askeri, pazarcı
- Her karakterde görev, karar, kişisel sonuç ve aynı tarihî an
- Üç karakter bitince ortak final; karakterleri tamamlamak zorunlu değil
- Müzede kalan iki nesne ve dokununca canlanan anı (tarayıcıda hatırlanır)
- Işınlanma ve akıcı hareket, 30° adımlı dönüş

Yusuf, Nikolas, Eleni, Pierre ve Anna kurgu kişilerdir. Tarihî olaylar ve sonuçlar değişmez.

## Henüz olmayanlar

Seslendirme ve gerçekçi model, doku, animasyon. Bunlar için ses kaydı ve 3D varlıklar gerekir.

## Kontroller (Quest 3)

| Girdi | İş |
| --- | --- |
| Tetik | Dokun / seç |
| Çubuk ileri, bırak | Işınlan |
| Sol çubuk | Akıcı hareket |
| Sağ çubuk sol/sağ | 30° dön |
| A / X | Hareket biçimini değiştir |

Ekranda: WASD, fare ve tıklama.

## Dosyalar

`js/story.js` bölüm akışı, `js/worlds.js` sahneler, `js/main.js` girdi ve sahne yönetimi, `js/textures.js` kodla üretilen dokular, `js/audio.js` sesler. Three.js r169 `vendor/` altındadır; derleme adımı yoktur.

```bash
node --test yasayan-muze/tests/*.test.mjs
```
