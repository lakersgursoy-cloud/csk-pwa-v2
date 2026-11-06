# Yaşayan Müze VR

Zamanın Tanıkları'nın ilk oynanabilir WebXR prototipi. Meta Quest 3 tarayıcısında kurulum olmadan açılır.

**Adres:** https://lakersgursoy-cloud.github.io/csk-pwa-v2/yasayan-muze/

## Bu sürümde olanlar

- Gezilebilir müze salonu, konuşan heykel, iki zaman kapısı (1453 açık, 1789 kilitli)
- Zaman Yolcusu: görünmeden gezme, askerleri dinleme
- Hafıza Geçişi: yardımcıya dokunma, kararma, dönem kollu ellerle birinci şahıs bakışı
- Tapa taşıma, Yusuf/Usta kararı, top atışı, tarihsel sonucun değişmemesi
- Müzeye dönen harita ve dokununca canlanan anı (tarayıcıda hatırlanır)
- Işınlanma ve akıcı hareket, 30° adımlı dönüş

## Henüz olmayanlar

Paris 1789, Bizans savunmacısı ve esnaf, ortak final, seslendirme, gerçekçi mimari ve modeller.

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
