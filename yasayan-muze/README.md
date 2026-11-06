# Yaşayan Müze VR

Zamanın Tanıkları'nın ilk oynanabilir WebXR prototipi. Meta Quest 3 tarayıcısında kurulum olmadan açılır.

**Adres:** https://lakersgursoy-cloud.github.io/csk-pwa-v2/yasayan-muze/

## Bu sürümde olanlar

- Gezilebilir müze salonu, konuşan heykel, iki açık zaman kapısı
- İstanbul 1453: topçu yardımcısı, Bizans savunmacısı, esnaf
- Paris 1789: matbaa çalışanı, Fransız Muhafızı askeri, pazarcı
- Her karakterde görev, karar, kişisel sonuç ve aynı tarihî an
- Fatih’in Gözünden: 29 Mayıs gecesini tepeden izleme, binlerce asker, üç saldırı dalgası, şafakta sancaklar
- Bastille’in Düşüşü: 14 Temmuz’u iskeleden izleme, toplar, teslim, köprü ve kaleye akan kalabalık
- Son Dalga: yeniçeri olarak hendeği geçme, elle merdiven tırmanma, sancak dikme
- VR'da otomatik kalite: takılma olursa kalabalık azalır
- Üç karakter bitince ortak final; karakterleri tamamlamak zorunlu değil
- Müzede kalan iki nesne ve dokununca canlanan anı (tarayıcıda hatırlanır)
- Işınlanma yayı, akıcı harekette görüş kenarı karartması, 30° adımlı dönüş
- Tetikle kapanan parmaklar, hedef üzerinde hafif titreşim
- Cihazda Türkçe ses varsa metinleri okuyan anlatıcı; yoksa altyazı

- Guanahani 1492: Pinta gemicisi, Lukayo balıkçısı, yazman yardımcısı; İlk Karşılaşma izleme sahnesi
- Notre-Dame 1804, Hiroşima 1945, Berlin 1989, New York 2001: üçer karakter ve birer izleme sahnesi
- Hiroşima ve New York’ta saldırı anı gösterilmez, saldırganlar oynanmaz, başlangıçta uyarı vardır
- Gerçek karakter karelerinden üretilen kalabalıklar, CC0 fotoğraf gökyüzü, döneme özgü üretken müzik, hedef yönlendirme oku
- Aşağı bakınca görünen dönem kıyafeti, Quest 3 el takibi (kıstırarak seçme), sana bakan ve konuşurken baş hareketi yapan karakterler
- Hareketli gölgeler, konumlu top sesi, dalga ve çan sesleri, Hiroşima’da kara yağmur
- Müzede kapı levhaları (karakterler ve ilerleme), kubbe açıklığı, banklar, kordonlar
- Y/B tuşu veya ekranda M ile her an müzeye dönüş
- Ankara 1923: telgraf memuru, Meclis kâtibi, öğretmen Ayşe; Cumhuriyet Gecesi izleme sahnesi

Yusuf, Nikolas, Eleni, Pierre, Anna, Ayşe, Zehra ve Pedro kurgu kişilerdir. Tarihî olaylar ve sonuçlar değişmez.

## Henüz olmayanlar

Gerçek ses kaydı ve foto-gerçekçi modeller. Karakterler CC0 lisanslı, iskeletli düşük poligon modellerdir.

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

`js/story.js` bölüm akışı, `js/chapters.js` hikâye metinleri, `js/actors.js` iskeletli karakterler, `js/worlds.js` sahneler, `js/main.js` girdi ve sahne yönetimi, `js/paintings.js` müze tabloları, `js/textures.js` kodla üretilen dokular ve normal haritaları, `js/audio.js` sesler. Three.js r169 ve yardımcıları `vendor/`, CC0 modeller `assets/` altındadır; derleme adımı yoktur.

```bash
node --test yasayan-muze/tests/*.test.mjs
```
