# ÇSK Teknik Lab · Ödev ve Bildirim

- **Teknik Lab (öğrenci/veli):** https://lakersgursoy-cloud.github.io/csk-pwa-v2/teknik-lab/
- **Koç paneli:** https://lakersgursoy-cloud.github.io/csk-pwa-v2/teknik-lab/koc.html

## Nasıl çalışır
1. Koç panelinde antrenman saatini seçer, öğrencilere stil + sahne işaretlersin (ör. Kelebek · Dolphin kick).
2. Öğrenci kendi linkini (`?k=KOD`) veya uygulamadaki "Ödev kodum" düğmesini kullanır; Lab doğrudan işaretlenen sahneyi açar.
3. GitHub her 10 dakikada bir kontrol eder; antrenmana ~1 saat kala Wix'e haber verir, **Çukurambar SK uygulaması** veliye push bildirimi gönderir.

Gizlilik: öğrenci isimleri ve veli e-postaları `veri/kadro.enc.json` içinde şifreli durur. Herkese açık `veri/odev.json` dosyasında sadece rastgele kodlar ve ödevler vardır.

## Bir kerelik kurulum

### 1. GitHub Pages'i aç
Repo → **Settings → Pages** → Source: *Deploy from a branch* → Branch: `main`, klasör `/ (root)` → **Save**. Birkaç dakika sonra yukarıdaki adresler açılır.

### 2. Koç paneli için GitHub anahtarı
github.com → sağ üst profil → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**
- Repository access: *Only select repositories* → `csk-pwa-v2`
- Permissions: **Contents: Read and write**, **Actions: Read and write**
- Süre: 1 yıl. Çıkan `github_pat_…` anahtarını koç panelinde Ayarlar'a yapıştır.

### 3. Kadro şifresi (GitHub secret)
Kendine bir kadro şifresi belirle. Repo → **Settings → Secrets and variables → Actions → New repository secret**
- Name: `KADRO_SIFRE` · Secret: belirlediğin şifre

Koç panelinde de aynı şifreyi gir. İkisi farklıysa bildirim gitmez.

### 4. Wix otomasyonu (bildirimi uygulama gönderir)
Wix panel → **Automations → + New Automation → Start from scratch**
1. Trigger: **Webhook received** → çıkan adresi kopyala.
2. Payload yapısı için şu örneği yapıştır → *Preview Structure* → kaydet:
   ```json
   {"email":"veli@ornek.com","ogrenci":"Ada Yılmaz","kod":"ABC123","saat":"18:00","odev":"Kelebek · Dolphin kick","baslik":"Ada Yılmaz · antrenmana 1 saat kaldı","mesaj":"Bugünkü ödev: Kelebek · Dolphin kick. Antrenman 18:00. Teknik Lab'dan izlesin.","link":"https://lakersgursoy-cloud.github.io/csk-pwa-v2/teknik-lab/?k=ABC123","test":false}
   ```
   Kişi (contact) e-postası olarak `email` alanını seç.
3. Action: **Send a push notification** (mobil uygulama) → Alıcı: tetikleyicideki kişi (`email`) → Başlık: `baslik`, Mesaj: `mesaj` → Tıklanınca: uygulamadaki **Teknik Lab** ekranı.
4. Otomasyonu etkinleştir.
5. Webhook adresini koç paneli → **Ayarlar → Wix bildirimi** alanına yapıştır.

Push bildirimi için Wix'te kendi mobil uygulamanın (Branded App) premium paketi ve uygulamanın mağazalarda yayında olması gerekir. Veli, uygulamaya bu e-postayla üye olmuş olmalı.

### 5. Uygulamaya Teknik Lab ekranı
Wix → Mobile App → Edit Mobile App → yeni ekran "Teknik Lab" → Elements → Embed → **WebView** → adres: Teknik Lab linki, Layout *Dynamic*, kenar boşlukları 0.

### 6. Öğrencileri ekle ve test et
Koç paneli → Öğrenciler → ekle → **Linki gönder** (telefon girildiyse WhatsApp'ı açar).
Ayarlar → **Test bildirimi** ile bir veliye hemen deneme gönder.

## Bilmen gerekenler
- GitHub'ın zamanlayıcısı yoğun saatlerde 5–15 dk gecikebilir; bildirim bu yüzden 60–65 dk aralığında gönderilir.
- Antrenman saatine 1 saatten az kala işaretlersen bildirim birkaç dakika içinde gider.
- Bir öğrencinin antrenman saatini değiştirirsen yeni saat için yeniden bildirim gider.
- GitHub, 60 gün hiç hareket olmayan repolarda zamanlanmış işleri durdurur. Uzun aradan sonra Actions sekmesinden "Enable workflow" demen gerekebilir.
- Dosyalar: `koc.html` panel · `odev.js` Lab'daki ödev bandı · `bildirim/gonder.mjs` bildirim işi · `ortak/` şifreleme ve stil kataloğu · `.github/workflows/teknik-lab-bildirim.yml` zamanlayıcı.
