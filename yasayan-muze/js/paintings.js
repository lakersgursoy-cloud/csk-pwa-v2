// Müze tabloları: katmanlı kompozisyon, atmosfer perspektifi ve yağlı boya bitirme. Tümü kodla çizilir.
import * as THREE from 'three';

const W = 768, H = 1152;
let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
const rgba = (c, a) => { const n = parseInt(c.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
const mix = (a, b, t) => { const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16), ch = (s) => Math.round(((A >> s) & 255) * (1 - t) + ((B >> s) & 255) * t); return `rgb(${ch(16)},${ch(8)},${ch(0)})`; };

// --- temel fırçalar ---
function sky(g, w, h, stops) { const s = g.createLinearGradient(0, 0, 0, h); for (const [o, c] of stops) s.addColorStop(o, c); g.fillStyle = s; g.fillRect(0, 0, w, h); }
function sun(g, x, y, r, c, glowR = r * 6) { const s = g.createRadialGradient(x, y, 0, x, y, glowR); s.addColorStop(0, c); s.addColorStop(r / glowR, c); s.addColorStop(r / glowR + .02, rgba(c, .55)); s.addColorStop(1, rgba(c, 0)); g.fillStyle = s; g.fillRect(x - glowR, y - glowR, glowR * 2, glowR * 2); }
function clouds(g, w, y0, y1, n, light, shade, lightDir = -1) {
  for (let i = 0; i < n; i++) {
    const x = rnd() * w, y = y0 + rnd() * (y1 - y0), s = 24 + rnd() * 70, k = 4 + rnd() * 5 | 0;
    for (let j = 0; j < k; j++) { const dx = (j - k / 2) * s * .6, dy = (rnd() - .5) * s * .3, r = s * (.5 + rnd() * .5); g.fillStyle = rgba(shade, .55); g.beginPath(); g.ellipse(x + dx, y + dy + r * .25, r, r * .55, 0, 0, 7); g.fill(); g.fillStyle = rgba(light, .75); g.beginPath(); g.ellipse(x + dx + lightDir * r * .15, y + dy - r * .1, r * .85, r * .5, 0, 0, 7); g.fill(); }
  }
}
function haze(g, w, y0, y1, color, a) { const s = g.createLinearGradient(0, y0, 0, y1); s.addColorStop(0, rgba(color, 0)); s.addColorStop(1, rgba(color, a)); g.fillStyle = s; g.fillRect(0, y0, w, y1 - y0); }
function hills(g, w, y, amp, color, segs = 9) { g.fillStyle = color; g.beginPath(); g.moveTo(0, y + amp); let x = 0; for (let i = 0; i <= segs; i++) { x = i * w / segs; g.lineTo(x, y - amp * Math.abs(Math.sin(i * 1.7 + seed % 3)) * rnd()); } g.lineTo(w, H); g.lineTo(0, H); g.fill(); }
function ground(g, w, y, h, near, far) { const s = g.createLinearGradient(0, y, 0, y + h); s.addColorStop(0, far); s.addColorStop(1, near); g.fillStyle = s; g.fillRect(0, y, w, h); }
function water(g, w, y, h, deep, lit, sunX) { const s = g.createLinearGradient(0, y, 0, y + h); s.addColorStop(0, lit); s.addColorStop(1, deep); g.fillStyle = s; g.fillRect(0, y, w, h); for (let i = 0; i < 260; i++) { const yy = y + rnd() * h, t = (yy - y) / h, len = 6 + t * 60 * rnd(), xx = sunX !== undefined ? sunX + (rnd() - .5) * (40 + t * 300) : rnd() * w; g.fillStyle = rgba(i % 3 ? '#ffffff' : '#000000', .05 + rnd() * .08); g.fillRect(xx - len / 2, yy, len, 1.2 + t * 2); } }
function reflect(g, c, y, h, a = .35) { g.save(); g.globalAlpha = a; g.translate(0, y * 2 + h * .1); g.scale(1, -1); g.drawImage(c, 0, 0); g.restore(); }
function figures(g, w, y, n, colors, scale = 1, spread = 1) { for (let i = 0; i < n; i++) { const x = rnd() * w, yy = y + (rnd() - .5) * 14 * spread, s = (5 + rnd() * 4) * scale, c = colors[rnd() * colors.length | 0]; g.fillStyle = c; g.beginPath(); g.moveTo(x - s * .5, yy); g.lineTo(x + s * .5, yy); g.lineTo(x + s * .35, yy - s * 2.4); g.lineTo(x - s * .35, yy - s * 2.4); g.fill(); g.fillStyle = mix(c, '#c89a70', .5); g.beginPath(); g.arc(x, yy - s * 2.8, s * .42, 0, 7); g.fill(); g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(x, yy + 1, s * 1.2, s * .3, 0, 0, 7); g.fill(); } }
function tower(g, x, y, w, h, color, dark, crenel = true) { g.fillStyle = color; g.fillRect(x, y, w, h); g.fillStyle = dark; g.fillRect(x + w * .72, y, w * .28, h); if (crenel) for (let i = 0; i < w; i += w / 4) { g.fillStyle = color; g.fillRect(x + i, y - w * .14, w / 8, w * .14); } g.fillStyle = 'rgba(0,0,0,.35)'; for (let yy = y + h * .2; yy < y + h; yy += h * .3) g.fillRect(x + w * .4, yy, w * .08, w * .22); }
function smoke(g, x, y, n, color) { for (let i = 0; i < n; i++) { const r = 8 + i * 4, dx = (rnd() - .5) * 20 + i * 6, dy = -i * 9; g.fillStyle = rgba(color, .12); g.beginPath(); g.arc(x + dx, y + dy, r, 0, 7); g.fill(); } }
function windows(g, x, y, w, h, cols, rows, lit, a = 1) { for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { g.fillStyle = rgba(lit, a * (.6 + rnd() * .4)); g.fillRect(x + (c + .3) * w / cols, y + (r + .25) * h / rows, w / cols * .4, h / rows * .5); } }
function palm(g, x, y, h, lean, dark, light) { g.strokeStyle = dark; g.lineWidth = 7; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + lean * .4, y - h * .6, x + lean, y - h); g.stroke(); for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28, l = 40 + rnd() * 26; g.strokeStyle = i % 2 ? dark : light; g.lineWidth = 4; g.beginPath(); g.moveTo(x + lean, y - h); g.quadraticCurveTo(x + lean + Math.cos(a) * l * .6, y - h + Math.sin(a) * l * .3 - 10, x + lean + Math.cos(a) * l, y - h + Math.sin(a) * l * .5 + 18); g.stroke(); } }
function ship(g, x, y, s, hull, sail, cross) { g.fillStyle = hull; g.beginPath(); g.moveTo(x - 50 * s, y); g.lineTo(x + 50 * s, y); g.lineTo(x + 42 * s, y + 16 * s); g.lineTo(x - 36 * s, y + 16 * s); g.fill(); g.fillRect(x - 40 * s, y - 10 * s, 20 * s, 10 * s); g.fillRect(x + 20 * s, y - 14 * s, 26 * s, 14 * s); for (const [mx, mh, sw] of [[-14, 80, 34], [12, 96, 40], [34, 56, 22]]) { g.fillStyle = hull; g.fillRect(x + mx * s - 1.5 * s, y - mh * s, 3 * s, mh * s); g.fillStyle = sail; g.beginPath(); g.moveTo(x + (mx - sw / 2) * s, y - mh * s * .85); g.quadraticCurveTo(x + mx * s, y - mh * s * .5, x + (mx + sw / 2) * s, y - mh * s * .85); g.lineTo(x + (mx + sw / 2) * s, y - mh * s * .35); g.quadraticCurveTo(x + mx * s, y - mh * s * .2, x + (mx - sw / 2) * s, y - mh * s * .35); g.fill(); if (cross) { g.fillStyle = cross; g.fillRect(x + mx * s - 2 * s, y - mh * s * .8, 4 * s, mh * s * .4); g.fillRect(x + (mx - sw * .3) * s, y - mh * s * .64, sw * .6 * s, 4 * s); } } }

// --- yağlı boya bitirme: dokuyu bozmaz, kenarları yumuşatır ve tuval dokusu ekler ---
export function oilFinish(c, strokes = 7000) {
  const g = c.getContext('2d'), w = c.width, h = c.height, [src, sg] = cv(w, h); sg.drawImage(c, 0, 0); const d = sg.getImageData(0, 0, w, h).data;
  for (let i = 0; i < strokes; i++) {
    const x = rnd() * w | 0, y = rnd() * h | 0, k = (y * w + x) * 4, len = 5 + rnd() * 16, th = 2 + rnd() * 5, a = (rnd() - .5) * .7 + (y < h * .45 ? 0 : (rnd() - .5) * 1.2);
    g.strokeStyle = `rgba(${d[k]},${d[k + 1]},${d[k + 2]},${.28 + rnd() * .3})`; g.lineWidth = th; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - Math.cos(a) * len / 2, y - Math.sin(a) * len / 2); g.lineTo(x + Math.cos(a) * len / 2, y + Math.sin(a) * len / 2); g.stroke();
  }
  for (let i = 0; i < w * h / 40; i++) { g.fillStyle = `rgba(${rnd() > .5 ? '255,245,225' : '20,12,6'},${rnd() * .07})`; g.fillRect(rnd() * w, rnd() * h, 2, 1); }
  g.strokeStyle = 'rgba(30,20,10,.1)'; g.lineWidth = 1; for (let i = 0; i < 26; i++) { let x = rnd() * w, y = rnd() * h; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (rnd() - .5) * 60; y += (rnd() - .5) * 60; g.lineTo(x, y); } g.stroke(); }
  const v = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .35, w / 2, h / 2, Math.max(w, h) * .75); v.addColorStop(0, 'rgba(40,24,8,0)'); v.addColorStop(1, 'rgba(40,24,8,.42)'); g.fillStyle = v; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(255,200,120,.06)'; g.fillRect(0, 0, w, h);
}

// --- sekiz kapı tablosu (dikey 2:3) ---
const DOORS = {
  istanbul(g) {
    sky(g, W, H, [[0, '#1d2340'], [.3, '#4a3a5e'], [.46, '#c7643a'], [.55, '#f0b060'], [.6, '#6a4a3a'], [1, '#2a2118']]); sun(g, W * .72, H * .55, 26, '#ffe6b0', 260);
    clouds(g, W, H * .12, H * .42, 16, '#8a6a7a', '#3a2a44'); clouds(g, W, H * .44, H * .52, 8, '#f3c080', '#9a5a40');
    // Şehir silüeti: kubbeler ve surlar
    g.fillStyle = '#5a4050'; g.beginPath(); g.arc(W * .3, H * .57, 48, Math.PI, 0); g.fill(); g.fillRect(W * .3 - 56, H * .57, 112, 20); for (const [x, r] of [[W * .16, 20], [W * .52, 26], [W * .64, 16]]) { g.beginPath(); g.arc(x, H * .585, r, Math.PI, 0); g.fill(); }
    hills(g, W, H * .59, 24, '#4f3a44'); haze(g, W, H * .5, H * .6, '#f0b060', .45);
    // Teodosyus surları: iç sur ve burçlar soldan sağa alçalır
    for (let i = 0; i < 6; i++) { const t = i / 5, x = W * .02 + t * W * .78, y = H * .62 + t * H * .02, hh = 190 * (1 - t * .35); const wc = mix('#8a7a66', '#e0a070', t * .3), dc = mix('#6a3a2c', '#e0a070', t * .3); g.fillStyle = wc; g.fillRect(x, y - hh, W * .2, hh); g.fillStyle = dc; for (let yy = y - hh * .85; yy < y; yy += 26) g.fillRect(x, yy, W * .2, 5); for (let k = 0; k < 5; k++) g.fillRect(x + k * W * .04, y - hh - 10, W * .018, 10); tower(g, x + W * .17, y - hh - 80, 58, hh + 80, mix('#9a8a76', '#e0a070', t * .3), mix('#5a4a3e', '#e0a070', t * .3)); }
    for (const x of [W * .25, W * .5, W * .68]) smoke(g, x, H * .5, 12, '#d8c8b0');
    ground(g, W, H * .64, H * .36, '#4a3a28', '#7a5c40'); g.fillStyle = '#5a4a36'; for (let i = 0; i < 80; i++) { g.fillStyle = rgba(i % 2 ? '#2a2018' : '#8a6a48', .25); g.beginPath(); g.ellipse(rnd() * W, H * .66 + rnd() * H * .34, 20 + rnd() * 60, 4 + rnd() * 10, 0, 0, 7); g.fill(); }
    // Büyük bronz top: tekerlekli kundak, perspektifli namlu
    const cx = W * .3, cy = H * .86; g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(cx + 10, cy + 26, 190, 26, 0, 0, 7); g.fill();
    g.fillStyle = '#4a3420'; g.fillRect(cx - 150, cy - 10, 300, 26); for (const wx of [cx - 110, cx + 100]) { g.fillStyle = '#3a2a1a'; g.beginPath(); g.arc(wx, cy + 10, 34, 0, 7); g.fill(); g.fillStyle = '#6a5030'; g.beginPath(); g.arc(wx, cy + 10, 22, 0, 7); g.fill(); }
    const bar = g.createLinearGradient(0, cy - 70, 0, cy); bar.addColorStop(0, '#9a7a44'); bar.addColorStop(.45, '#c9a35a'); bar.addColorStop(1, '#4a3418'); g.fillStyle = bar; g.beginPath(); g.moveTo(cx - 160, cy - 18); g.lineTo(cx + 150, cy - 64); g.lineTo(cx + 150, cy - 10); g.lineTo(cx - 160, cy + 12); g.fill(); g.fillStyle = '#2a1a08'; g.beginPath(); g.ellipse(cx + 150, cy - 37, 10, 27, 0, 0, 7); g.fill(); g.fillStyle = '#7a5a2a'; for (const k of [.2, .5, .8]) g.fillRect(cx - 160 + k * 310 - 6, cy - 20 - k * 44, 12, 34 + k * 6);
    for (const [x, y, s] of [[W * .72, H * .76, 1], [W * .9, H * .72, .7], [W * .58, H * .72, .6]]) { g.fillStyle = '#c9b48a'; g.beginPath(); g.moveTo(x - 60 * s, y); g.lineTo(x, y - 90 * s); g.lineTo(x + 60 * s, y); g.fill(); g.fillStyle = '#8a7050'; g.beginPath(); g.moveTo(x, y - 90 * s); g.lineTo(x + 60 * s, y); g.lineTo(x + 20 * s, y); g.fill(); }
    for (const [x, y] of [[W * .55, H * .8], [W * .84, H * .82]]) sun(g, x, y, 6, '#ffb060', 70);
    figures(g, W * .9, H * .76, 14, ['#6e2a21', '#27415a', '#5a4a30', '#c9b48a'], .8, 2);
  },
  guanahani(g) {
    sky(g, W, H, [[0, '#2f6fa8'], [.35, '#8dc0dc'], [.5, '#e9dcc0'], [.52, '#2b8c96'], [.72, '#39a3a8'], [.74, '#efe2c2'], [1, '#c9b48a']]);
    clouds(g, W, H * .06, H * .4, 14, '#ffffff', '#a9bcd0', 1);
    water(g, W, H * .52, H * .22, '#1f7a86', '#5cc0c0', W * .5);
    for (const [x, y, s] of [[W * .26, H * .6, .9], [W * .55, H * .57, .75], [W * .8, H * .6, .85]]) ship(g, x, y, s, '#3a2a1c', '#efe4cc', '#b5271f');
    g.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 40; i++) { const x = rnd() * W, y = H * .71 + rnd() * H * .03; g.fillRect(x, y, 20 + rnd() * 60, 2); }
    ground(g, W, H * .74, H * .26, '#d8c49a', '#f1e6cc');
    for (const [x, y, r] of [[W * .22, H * .8, 60], [W * .5, H * .78, 50]]) { g.fillStyle = '#8a6e3e'; g.beginPath(); g.ellipse(x, y, r, r * .6, 0, 0, 7); g.fill(); g.fillStyle = '#6a5230'; g.beginPath(); g.moveTo(x - r, y); g.lineTo(x, y - r * 1.1); g.lineTo(x + r, y); g.fill(); }
    g.fillStyle = '#5a3e26'; for (const [x, y] of [[W * .7, H * .83], [W * .62, H * .88]]) { g.beginPath(); g.ellipse(x, y, 40, 9, .2, 0, 7); g.fill(); }
    figures(g, W, H * .8, 26, ['#a87a4e', '#8a6a44', '#b08858'], 1.1, 4); figures(g, W * .5, H * .78, 6, ['#3e3440', '#4a3a30', '#8d8d92'], 1, 2);
    palm(g, W * .08, H * .9, 300, 40, '#2a3a24', '#4f7a3a'); palm(g, W * .94, H * .95, 340, -50, '#2a3a24', '#4f7a3a');
  },
  paris(g) {
    sky(g, W, H, [[0, '#55657a'], [.4, '#a9b6bd'], [.55, '#d9cfb8'], [.6, '#5a524a'], [1, '#2e2a26']]); clouds(g, W, H * .05, H * .42, 18, '#d8dce0', '#7a8490');
    // Bastille: sekiz kule
    for (const [x, s] of [[W * .22, .85], [W * .36, 1], [W * .5, 1.05], [W * .64, 1], [W * .78, .85]]) tower(g, x - 36 * s, H * .58 - 260 * s, 72 * s, 260 * s, '#8a8276', '#55504a'); g.fillStyle = '#7f7868'; g.fillRect(W * .2, H * .42, W * .6, H * .16);
    g.fillStyle = '#2a2420'; g.fillRect(W * .47, H * .5, W * .06, H * .08);
    for (const x of [W * .3, W * .6]) smoke(g, x, H * .5, 10, '#e8e2d8');
    haze(g, W, H * .45, H * .6, '#d9cfb8', .35);
    for (const s of [-1, 1]) { g.fillStyle = '#9a8a74'; g.fillRect(s > 0 ? W * .74 : 0, H * .48, W * .26, H * .14); g.fillStyle = '#3f4449'; g.beginPath(); g.moveTo(s > 0 ? W * .74 : 0, H * .48); g.lineTo(s > 0 ? W * .87 : W * .13, H * .42); g.lineTo(s > 0 ? W : W * .26, H * .48); g.fill(); windows(g, s > 0 ? W * .76 : W * .02, H * .5, W * .22, H * .1, 4, 2, '#2a2a30'); }
    ground(g, W, H * .62, H * .38, '#3a3632', '#6a645c');
    figures(g, W, H * .68, 60, ['#3a3f4a', '#6e2a21', '#2d3f73', '#c8bda6', '#5a4a30'], .9, 3); figures(g, W, H * .8, 50, ['#3a3f4a', '#6e2a21', '#2d3f73', '#c8bda6'], 1.5, 6);
    g.strokeStyle = '#2a2420'; g.lineWidth = 2; for (let i = 0; i < 40; i++) { const x = rnd() * W, y = H * .62 + rnd() * H * .26; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 6, y - 80 - rnd() * 60); g.stroke(); }
    g.fillStyle = '#b5271f'; g.fillRect(W * .6, H * .66, 36, 24); g.fillStyle = '#2d3f73'; g.fillRect(W * .6, H * .66, 12, 24);
  },
  napolyon(g) {
    sky(g, W, H, [[0, '#120c08'], [.5, '#3a2416'], [1, '#5a3a24']]);
    // Gül pencere ve sütunlar
    const cx = W / 2, cy = H * .26; sun(g, cx, cy, 90, '#3a4a9a', 240); g.fillStyle = '#1a1a3a'; g.beginPath(); g.arc(cx, cy, 92, 0, 7); g.fill(); for (let i = 0; i < 16; i++) { const a = i / 16 * 6.28; g.fillStyle = ['#b5271f', '#2a4a9c', '#d8a832', '#2e7a4e'][i % 4]; g.beginPath(); g.arc(cx + Math.cos(a) * 62, cy + Math.sin(a) * 62, 16, 0, 7); g.fill(); g.fillStyle = '#d8a832'; g.beginPath(); g.arc(cx + Math.cos(a + .2) * 30, cy + Math.sin(a + .2) * 30, 7, 0, 7); g.fill(); } g.fillStyle = '#d8a832'; g.beginPath(); g.arc(cx, cy, 10, 0, 7); g.fill();
    for (const [x, w] of [[W * .06, 60], [W * .86, 60], [W * .24, 44], [W * .7, 44]]) { const cg = g.createLinearGradient(x, 0, x + w, 0); cg.addColorStop(0, '#5a4a3a'); cg.addColorStop(.35, '#a8977e'); cg.addColorStop(1, '#4a3a2c'); g.fillStyle = cg; g.fillRect(x, H * .1, w, H * .62); g.fillStyle = '#8a7a66'; g.fillRect(x - 6, H * .1, w + 12, 14); g.fillRect(x - 8, H * .7, w + 16, 20); const dg = g.createLinearGradient(x - 40, 0, x, 0); dg.addColorStop(0, '#5a1210'); dg.addColorStop(.5, '#a8302a'); dg.addColorStop(1, '#5a1210'); g.fillStyle = dg; g.fillRect(x - 40, H * .12, 40, H * .55); g.fillStyle = '#d8b050'; for (let y = H * .16; y < H * .66; y += 56) g.beginPath(), g.ellipse(x - 20, y, 5, 8, 0, 0, 7), g.fill(); }
    // Sunak, mumlar ve taç anı
    g.fillStyle = '#6a1f1c'; g.fillRect(W * .18, H * .66, W * .64, H * .34); g.fillStyle = '#8c2a26'; g.fillRect(W * .18, H * .66, W * .64, 30);
    g.fillStyle = '#d8ccb0'; g.fillRect(W * .34, H * .5, W * .32, H * .12); for (let x = W * .36; x < W * .66; x += 36) { g.fillStyle = '#ece6d6'; g.fillRect(x, H * .42, 5, H * .08); sun(g, x + 2, H * .415, 4, '#ffe0a0', 60); }
    sun(g, W * .5, H * .62, 40, '#ffd080', 340);
    // Figürler: imparator (kırmızı/altın), Joséphine (beyaz), Papa (beyaz, solda), saray halkı
    const fig = (x, y, s, robe, head) => { g.fillStyle = robe; g.beginPath(); g.moveTo(x - 24 * s, y); g.lineTo(x + 24 * s, y); g.lineTo(x + 12 * s, y - 70 * s); g.lineTo(x - 12 * s, y - 70 * s); g.fill(); g.fillStyle = head; g.beginPath(); g.arc(x, y - 80 * s, 10 * s, 0, 7); g.fill(); };
    fig(W * .5, H * .66, 1.4, '#9a1f1c', '#d8b090'); g.fillStyle = '#ffd040'; g.fillRect(W * .5 - 14, H * .66 - 126, 28, 12);
    fig(W * .58, H * .68, 1.1, '#f0e6d8', '#d8b090'); fig(W * .36, H * .66, 1.2, '#f4efe4', '#d8b090');
    figures(g, W, H * .8, 50, ['#2a3a6a', '#6a1f1c', '#3a2e4a', '#d8ccb0', '#2a2a30', '#5a4a30'], 1.2, 7); figures(g, W, H * .92, 40, ['#2a3a6a', '#6a1f1c', '#3a2e4a', '#2a2a30'], 1.6, 6);
    haze(g, W, H * .7, H, '#1a0e08', .5);
  },
  ankara(g) {
    sky(g, W, H, [[0, '#070b1c'], [.45, '#1a2240'], [.56, '#3a3450'], [.6, '#1c1a20'], [1, '#121014']]);
    for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(255,250,230,${.3 + rnd() * .7})`; g.fillRect(rnd() * W, rnd() * H * .5, 1.5, 1.5); } sun(g, W * .78, H * .12, 24, '#f4ecd0', 160);
    hills(g, W, H * .5, 70, '#141822', 6); g.fillStyle = '#1e2230'; g.fillRect(W * .6, H * .4, 90, 60); for (let x = W * .62; x < W * .72; x += 18) g.fillRect(x, H * .38, 8, 14);
    ground(g, W, H * .6, H * .4, '#2a2520', '#4a4038');
    // Meclis binası: pembe andezit, kiremit çatı, yanan pencereler
    const bx = W * .14, by = H * .46, bw = W * .72, bh = H * .16; g.fillStyle = '#6a4f58'; g.fillRect(bx, by, bw, bh); g.fillStyle = '#7f3a2c'; g.beginPath(); g.moveTo(bx - 10, by); g.lineTo(W * .5, by - 60); g.lineTo(bx + bw + 10, by); g.fill(); g.fillStyle = '#c8bda8'; g.fillRect(bx, by + bh * .48, bw, 5);
    windows(g, bx + 10, by + 10, bw - 20, bh * .4, 11, 1, '#ffd98a'); windows(g, bx + 10, by + bh * .55, bw - 20, bh * .4, 11, 1, '#ffd98a'); sun(g, W * .5, by + bh * .75, 12, '#ffd98a', 90);
    g.fillStyle = '#3a2a1a'; g.fillRect(W * .5 - 3, by - 150, 6, 100); g.fillStyle = '#c8102e'; g.fillRect(W * .5 + 3, by - 150, 56, 36); g.fillStyle = '#fff'; g.beginPath(); g.arc(W * .5 + 24, by - 132, 11, 0, 7); g.fill(); g.fillStyle = '#c8102e'; g.beginPath(); g.arc(W * .5 + 27, by - 132, 9, 0, 7); g.fill();
    for (const [x, y] of [[W * .12, H * .62], [W * .88, H * .62]]) { g.fillStyle = '#3a2a1a'; g.fillRect(x - 3, y - 110, 6, 110); sun(g, x, y - 112, 7, '#ffd090', 90); }
    figures(g, W, H * .7, 40, ['#3e4450', '#6a7a9a', '#6a4a30', '#8c5a44'], 1, 3); figures(g, W, H * .82, 36, ['#3e4450', '#6a7a9a', '#6a4a30', '#8c5a44', '#8c1f1c'], 1.5, 6);
    for (let i = 0; i < 60; i++) sun(g, rnd() * W, H * .66 + rnd() * H * .2, 2, '#ffb060', 22);
  },
  hiroshima(g) {
    sky(g, W, H, [[0, '#5f8fc0'], [.4, '#bdd4e4'], [.5, '#efe6d2'], [.53, '#8fa6ad'], [1, '#6a7a7c']]); sun(g, W * .28, H * .18, 30, '#fff6e0', 320); clouds(g, W, H * .06, H * .38, 10, '#ffffff', '#b8c6d0', 1);
    hills(g, W, H * .5, 56, '#7f98a2', 7); haze(g, W, H * .44, H * .54, '#efe6d2', .5);
    // Karşı kıyı: ahşap evler, Sanayi Teşvik Binası ve kubbesi
    for (let i = 0; i < 12; i++) { const x = i * W / 11 - 20, h = 36 + (i * 37 % 40), w = 70; g.fillStyle = mix('#8a8a80', '#efe6d2', .3); g.fillRect(x, H * .54 - h, w, h); g.fillStyle = '#3a3c42'; g.beginPath(); g.moveTo(x - 6, H * .54 - h); g.lineTo(x + w / 2, H * .54 - h - 22); g.lineTo(x + w + 6, H * .54 - h); g.fill(); }
    g.fillStyle = '#9aa0a0'; g.fillRect(W * .52, H * .42, 190, 140); g.fillStyle = '#6a6e6c'; g.fillRect(W * .52 + 150, H * .42, 40, 140); g.fillStyle = '#5e8a74'; g.beginPath(); g.ellipse(W * .52 + 80, H * .4, 44, 30, 0, Math.PI, 0); g.fill(); g.fillStyle = '#b4b8b4'; g.fillRect(W * .52 + 36, H * .4, 88, 24); windows(g, W * .53, H * .45, 150, 110, 6, 3, '#2a3a40', .6);
    // Nehir ve T biçimli Aioi köprüsü
    water(g, W, H * .56, H * .44, '#4f7a86', '#a9c4c8', W * .28);
    g.fillStyle = '#9aa4a8'; g.fillRect(0, H * .6, W, 26); g.fillStyle = '#7a848a'; for (let x = 20; x < W; x += 110) g.fillRect(x, H * .626, 22, 70); g.fillStyle = '#b4bcc0'; g.fillRect(0, H * .59, W, 6); for (let x = 0; x < W; x += 40) g.fillRect(x, H * .575, 4, 16);
    g.fillStyle = '#9aa4a8'; g.beginPath(); g.moveTo(W * .44, H * .61); g.lineTo(W * .56, H * .61); g.lineTo(W * .7, H); g.lineTo(W * .3, H); g.fill(); g.fillStyle = '#7a848a'; for (let y = H * .64; y < H; y += 34) { const t = (y - H * .6) / (H * .4); g.fillRect(W * .44 - t * W * .14, y, 8, 12); g.fillRect(W * .56 + t * W * .14 - 8, y, 8, 12); }
    // Tramvay ve sabah yolcuları
    g.fillStyle = '#2f5a44'; g.fillRect(W * .08, H * .565, 170, 30); g.fillStyle = '#c8d4d8'; g.fillRect(W * .1, H * .57, 160, 11); g.fillStyle = '#1a2a24'; g.fillRect(W * .08, H * .595, 170, 4);
    figures(g, W, H * .59, 22, ['#3a3f4a', '#4a4a44', '#d8d0c0', '#54607a'], .7, 1); figures(g, W * .5, H * .78, 8, ['#3a3f4a', '#d8d0c0', '#54607a'], 1.3, 6);
    g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(0, H * .585, W, 2);
  },
  berlin(g) {
    sky(g, W, H, [[0, '#070a16'], [.5, '#1c2238'], [.6, '#2a2a36'], [1, '#1a181c']]); for (let i = 0; i < 140; i++) { g.fillStyle = `rgba(255,255,255,${.2 + rnd() * .5})`; g.fillRect(rnd() * W, rnd() * H * .45, 1.3, 1.3); }
    // Brandenburg Kapısı silüeti ve ışık huzmeleri
    for (const x of [W * .22, W * .8]) { const bg = g.createLinearGradient(0, H * .56, 0, 0); bg.addColorStop(0, 'rgba(255,240,200,.12)'); bg.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = bg; g.beginPath(); g.moveTo(x - 4, H * .56); g.lineTo(x - 26, 0); g.lineTo(x + 14, 0); g.lineTo(x + 4, H * .56); g.fill(); }
    g.fillStyle = '#3a3e52'; g.fillRect(W * .34, H * .49, W * .32, 12); g.fillRect(W * .34, H * .565, W * .32, 6); for (let i = 0; i < 6; i++) { g.fillStyle = '#4a4e64'; g.fillRect(W * .352 + i * W * .056, H * .5, 12, H * .065); g.fillStyle = '#5c6078'; g.fillRect(W * .352 + i * W * .056, H * .5, 4, H * .065); } g.fillStyle = '#3a3e52'; g.fillRect(W * .45, H * .47, W * .1, 24); g.fillStyle = '#4a4e64'; g.fillRect(W * .475, H * .45, W * .05, 20); haze(g, W, H * .4, H * .58, '#1c2238', .25);
    haze(g, W, H * .4, H * .58, '#1c2238', .4);
    // Duvar: grafiti, üstte oturan insanlar
    g.fillStyle = '#b8b4a8'; g.fillRect(0, H * .58, W, H * .16); g.fillStyle = '#8a867a'; for (let x = 0; x < W; x += 96) g.fillRect(x, H * .58, 3, H * .16); g.fillStyle = '#8c8880'; g.beginPath(); g.ellipse(W / 2, H * .58, W, 14, 0, 0, 7); g.fill();
    for (let i = 0; i < 14; i++) { g.strokeStyle = ['#d8352a', '#2f7fa8', '#e2c04a', '#3f9a5a', '#e8e0d0', '#d86aa8'][i % 6]; g.lineWidth = 10 + rnd() * 14; g.lineCap = 'round'; const x = rnd() * W, y = H * .62 + rnd() * H * .08; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 50, y - 50 * rnd(), x + 90 * rnd() + 20, y + 20); g.stroke(); }
    figures(g, W, H * .575, 18, ['#3a3f4a', '#6a5a4a', '#54607a', '#8a7a64'], .9, .5);
    ground(g, W, H * .74, H * .26, '#2a2a30', '#4a4a50'); figures(g, W, H * .82, 60, ['#3a3f4a', '#6a5a4a', '#54607a', '#8a7a64', '#4a4a50'], 1.4, 7);
    for (let i = 0; i < 16; i++) sun(g, rnd() * W, H * .76 + rnd() * H * .18, 2, '#ffe0a0', 30);
  },
  nyc(g) {
    sky(g, W, H, [[0, '#1a2a4a'], [.3, '#3a5a8a'], [.45, '#e8b070'], [.52, '#f6d6a0'], [.55, '#3a4a5a'], [1, '#1a222c']]); sun(g, W * .62, H * .52, 18, '#fff0c0', 220); clouds(g, W, H * .1, H * .42, 12, '#f0c89a', '#5a4a6a', 1);
    g.fillStyle = '#3a4656'; for (let i = 0; i < 34; i++) { const x = i * W / 34, h = 40 + (i * 53 % 120); g.fillRect(x, H * .54 - h, W / 34 + 1, h); } for (const x of [W * .42, W * .49]) { const tg = g.createLinearGradient(x, 0, x + 36, 0); tg.addColorStop(0, '#6a7888'); tg.addColorStop(1, '#3a4656'); g.fillStyle = tg; g.fillRect(x, x < W * .45 ? H * .18 : H * .2, 36, H * .36); for (let y = H * .2; y < H * .54; y += 10) { g.fillStyle = 'rgba(255,230,180,.3)'; g.fillRect(x + 4, y + (x < W * .45 ? 0 : 4), 28, 3); } }
    haze(g, W, H * .4, H * .55, '#f6d6a0', .35);
    water(g, W, H * .55, H * .24, '#1c3346', '#8aa8c0', W * .62);
    // Brooklyn Köprüsü'nün bir ayağı ve halatları sağ kenardan girer
    g.fillStyle = '#2a2622'; g.fillRect(W * .84, 0, 70, H * .8); g.fillStyle = '#1a1816'; for (const y of [H * .22, H * .4]) { g.beginPath(); g.moveTo(W * .84 + 12, y + 60); g.lineTo(W * .84 + 12, y + 20); g.arc(W * .84 + 35, y + 20, 23, Math.PI, 0); g.lineTo(W * .84 + 58, y + 60); g.fill(); }
    g.strokeStyle = 'rgba(20,18,16,.8)'; g.lineWidth = 3; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(W * .84 + 35, H * .12 + i * 10); g.quadraticCurveTo(W * .45, H * .3 + i * 26, -20, H * .76 - i * 6); g.stroke(); }
    g.fillStyle = '#2a2622'; g.fillRect(0, H * .78, W, H * .22); g.fillStyle = '#4a4440'; g.fillRect(0, H * .78, W, 8); g.fillStyle = '#3a3430'; for (let y = H * .8; y < H; y += 18) g.fillRect(0, y, W, 12); g.fillStyle = '#2a2622'; g.fillRect(0, H * .78, W, 10); g.fillStyle = '#4a4440'; g.fillRect(0, H * .78, W, 4);
    figures(g, W * .8, H * .84, 8, ['#3a3f4a', '#6a5a4a', '#4a5468'], 1.3, 2);
  },
};
export const DOOR_SIZE = [W, H];
export function doorPainting(name) { const [c, g] = cv(W, H); seed = 17 + name.length * 31; DOORS[name](g); oilFinish(c, 9000); return c; }

// --- dört duvar tablosu (yatay) ---
const WALLS = {
  deniz(g, w, h) { sky(g, w, h, [[0, '#2a3a5a'], [.4, '#9ab0c0'], [.55, '#f0c890'], [.58, '#2a4656'], [1, '#101c26']]); sun(g, w * .7, h * .56, 22, '#ffe8c0', 260); clouds(g, w, h * .05, h * .4, 14, '#e6d8c0', '#6a6a8a'); water(g, w, h * .58, h * .42, '#12303c', '#7ca0b0', w * .7); for (const [x, y, s] of [[w * .25, h * .72, 1.3], [w * .55, h * .66, .9], [w * .85, h * .7, 1.1]]) ship(g, x, y, s, '#1b130d', '#d9c9a4'); hills(g, w, h * .6, 30, '#3a4a5a', 8); },
  kubbe(g, w, h) { sky(g, w, h, [[0, '#1a1a3a'], [.5, '#c87a48'], [.62, '#f0b870'], [.66, '#3a2a22'], [1, '#1a120e']]); sun(g, w * .3, h * .6, 30, '#fff0c0', 300); clouds(g, w, h * .05, h * .45, 10, '#e0a070', '#5a3a4a'); g.fillStyle = '#4a3a38'; g.fillRect(w * .25, h * .5, w * .5, h * .25); g.beginPath(); g.arc(w * .5, h * .5, w * .16, Math.PI, 0); g.fill(); for (const k of [-1, 1]) { g.beginPath(); g.arc(w * .5 + k * w * .19, h * .56, w * .1, Math.PI, 0); g.fill(); g.fillRect(w * .5 + k * w * .3 - 20, h * .46, 40, h * .3); } g.fillStyle = '#ffcf80'; for (let i = 0; i < 12; i++) g.fillRect(w * .3 + i * w * .035, h * .6, 7, 18); water(g, w, h * .75, h * .25, '#1a2630', '#6a5040', w * .3); },
  sur(g, w, h) { sky(g, w, h, [[0, '#2a3450'], [.5, '#b88a6a'], [.6, '#e8c090'], [.64, '#3a3028'], [1, '#1a1410']]); sun(g, w * .15, h * .58, 26, '#fff0d0', 260); clouds(g, w, h * .05, h * .45, 12, '#d8c0b0', '#5a4a5a', 1); ground(g, w, h * .64, h * .36, '#2a2018', '#5a4a38'); for (let i = 0; i < 7; i++) { const t = i / 6, x = t * w, y = h * .64 - t * h * .1, s = 1 - t * .5; g.fillStyle = mix('#8a7a66', '#e8c090', t * .4); g.fillRect(x, y - 190 * s, w / 6 + 4, 190 * s); g.fillStyle = mix('#6f3a2c', '#e8c090', t * .4); for (let yy = y - 170 * s; yy < y; yy += 22 * s) g.fillRect(x, yy, w / 6 + 4, 4 * s); tower(g, x + w / 6 - 24 * s, y - 250 * s, 48 * s, 250 * s, mix('#9a8a76', '#e8c090', t * .4), mix('#5a4a3e', '#e8c090', t * .4)); } figures(g, w, h * .82, 30, ['#6e2a21', '#27415a', '#5a4a30', '#c9b48a'], 1.2, 5); },
  orman(g, w, h) { sky(g, w, h, [[0, '#4a7aa8'], [.45, '#cfe0ea'], [.52, '#e8e0c8'], [.55, '#3a4a30'], [1, '#1c2616']]); sun(g, w * .8, h * .5, 20, '#fff6e0', 240); clouds(g, w, h * .05, h * .4, 12, '#ffffff', '#9ab0c0', 1); hills(g, w, h * .55, 60, '#6a7a7a', 6); haze(g, w, h * .45, h * .58, '#e8e0c8', .5); hills(g, w, h * .62, 40, '#3f5a3a', 8); water(g, w, h * .72, h * .14, '#2a4a50', '#9ab8b0', w * .8); ground(g, w, h * .86, h * .14, '#1e2a16', '#3a4a2c'); for (let i = 0; i < 18; i++) { const x = i * w / 17 + (rnd() - .5) * 30, y = h * .9 - (i * 7 % 3) * 20, s = .6 + rnd() * .6; g.fillStyle = i % 2 ? '#26321f' : '#2e3f28'; g.beginPath(); g.moveTo(x - 24 * s, y); g.lineTo(x, y - 120 * s); g.lineTo(x + 24 * s, y); g.fill(); g.fillStyle = '#1c2416'; g.fillRect(x - 3, y, 6, 18); } },
};
export function wallPainting(name) { const [c, g] = cv(1024, 768); seed = 29 + name.length * 13; WALLS[name](g, 1024, 768); oilFinish(c, 8000); return c; }
export function toTexture(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; return t; }
