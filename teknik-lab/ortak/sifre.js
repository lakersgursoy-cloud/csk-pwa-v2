// Öğrenci kadrosunu (isimler, veli e-postaları) şifreleyen ortak modül.
// Hem koç panelinde (tarayıcı) hem bildirim işinde (Node 20) aynı şekilde çalışır.
// PBKDF2-SHA256 (250.000 tur) ile şifreden anahtar türetilir, AES-GCM 256 ile şifrelenir.

const enc = new TextEncoder();
const dec = new TextDecoder();
const TUR = 250000;

export function b64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
export function unb64(str) {
  const s = atob(String(str).replace(/\s+/g, ''));
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}
export const metinB64 = (t) => b64(enc.encode(t));
export const b64Metin = (s) => dec.decode(unb64(s));

async function anahtar(sifre, salt) {
  const base = await crypto.subtle.importKey('raw', enc.encode(sifre), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: TUR, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function sifrele(nesne, sifre) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const k = await anahtar(sifre, salt);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, enc.encode(JSON.stringify(nesne))));
  return { v: 1, yontem: 'PBKDF2-SHA256-250000/AES-GCM-256', salt: b64(salt), iv: b64(iv), veri: b64(ct) };
}

/** Şifre yanlışsa hata fırlatır. */
export async function coz(paket, sifre) {
  const k = await anahtar(sifre, unb64(paket.salt));
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(paket.iv) }, k, unb64(paket.veri));
  return JSON.parse(dec.decode(pt));
}
