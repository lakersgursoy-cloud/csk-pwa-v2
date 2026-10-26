// ÇSK Teknik Lab — antrenmandan ~1 saat önce velilere bildirim.
// GitHub Actions her 10 dakikada bir çalıştırır. Antrenmanına 65 dakikadan az kalmış ve
// henüz bildirimi gitmemiş her öğrenci için Wix "Webhook received" otomasyonuna bir istek yollar;
// push bildirimini Çukurambar SK uygulaması gönderir.
//
// Ortam değişkenleri:
//   KADRO_SIFRE      (zorunlu) kadro.enc.json'u açan şifre — GitHub secret
//   WIX_WEBHOOK_URL  (isteğe bağlı) verilmezse koç panelinde kaydedilen adres kullanılır
//   TEST_KOD         (isteğe bağlı) bu öğrenciye saati beklemeden hemen gönderir
//   KURU             "1" ise istek atmaz, sadece ne gönderileceğini yazar

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { coz } from '../ortak/sifre.js';
import { etiket } from '../ortak/katalog.js';

const KOK = fileURLToPath(new URL('../', import.meta.url));
const LAB = 'https://lakersgursoy-cloud.github.io/csk-pwa-v2/teknik-lab/';
const ONCE_DK = 65;          // bu kadar dakika kala (veya daha az) gönder
const GEC_DK = -5;           // antrenman başladıktan 5 dk sonrasına kadar hâlâ gönderilebilir
const SAKLA_GUN = 14;

const jsonOku = async (p, yedek) => { try { return JSON.parse(await readFile(KOK + p, 'utf8')); } catch { return yedek; } };
const saat = (iso) => new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' });

const odev = await jsonOku('veri/odev.json', { odevler: {} });
const paket = await jsonOku('veri/kadro.enc.json', null);
const gonderilen = await jsonOku('veri/gonderilen.json', {});
const testKod = (process.env.TEST_KOD || '').trim().toUpperCase();
const kuru = process.env.KURU === '1';

if (!paket) { console.log('Kadro henüz oluşturulmamış, gönderilecek bir şey yok.'); process.exit(0); }
if (!process.env.KADRO_SIFRE) { console.error('KADRO_SIFRE secret tanımlı değil.'); process.exit(1); }

let kadro;
try { kadro = await coz(paket, process.env.KADRO_SIFRE); }
catch { console.error('KADRO_SIFRE, koç panelindeki kadro şifresiyle aynı değil.'); process.exit(1); }

const webhook = (process.env.WIX_WEBHOOK_URL || kadro.webhook || '').trim();
if (!webhook && !kuru) { console.error('Wix webhook adresi yok. Koç paneli → Ayarlar → Wix bildirimi.'); process.exit(1); }

const simdi = Date.now();
let gonderildi = 0, hata = 0, degisti = false;

for (const [kod, o] of Object.entries(odev.odevler || {})) {
  if (!o || !o.antrenman || !Array.isArray(o.ogeler) || !o.ogeler.length) continue;
  const anahtar = kod + '|' + o.antrenman;
  const kalanDk = (Date.parse(o.antrenman) - simdi) / 60000;
  const test = testKod && kod === testKod;
  if (!test && (gonderilen[anahtar] || kalanDk > ONCE_DK || kalanDk < GEC_DK)) continue;

  const ogr = (kadro.ogrenciler || []).find((x) => x.kod === kod);
  if (!ogr || !ogr.eposta) { console.log(`${kod}: kadroda veli e-postası yok, atlandı.`); continue; }

  const odevMetni = o.ogeler.map(etiket).join(', ');
  const govde = {
    email: ogr.eposta,
    ogrenci: ogr.ad,
    kod,
    saat: saat(o.antrenman),
    odev: odevMetni,
    baslik: `${ogr.ad} · antrenmana 1 saat kaldı`,
    mesaj: `Bugünkü ödev: ${odevMetni}. Antrenman ${saat(o.antrenman)}. Teknik Lab'dan izlesin.` + (o.not ? ` Koçun notu: ${o.not}` : ''),
    link: LAB + '?k=' + kod,
    test: !!test,
  };

  if (kuru) { console.log('[KURU]', JSON.stringify(govde)); continue; }
  try {
    const r = await fetch(webhook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(govde) });
    if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + (await r.text()).slice(0, 200));
    console.log(`${kod}: gönderildi (${govde.saat}, ${odevMetni})${test ? ' [test]' : ''}`);
    gonderildi++;
    if (!test) { gonderilen[anahtar] = new Date().toISOString(); degisti = true; }
  } catch (e) { console.error(`${kod}: gönderilemedi — ${e.message}`); hata++; }
}

for (const [k, v] of Object.entries(gonderilen)) {
  if (simdi - Date.parse(v) > SAKLA_GUN * 864e5) { delete gonderilen[k]; degisti = true; }
}
if (degisti) await writeFile(KOK + 'veri/gonderilen.json', JSON.stringify(gonderilen, null, 2) + '\n');
console.log(`Bitti: ${gonderildi} gönderildi, ${hata} hata.`);
if (hata) process.exitCode = 1;
