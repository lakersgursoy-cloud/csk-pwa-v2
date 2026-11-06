import * as THREE from 'three';

const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c, rx = 1, ry = 1) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 4;
  return t;
}
function speckle(g, w, h, n, a) {
  for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${rnd() > .5 ? '255,245,225' : '20,14,8'},${rnd() * a})`; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 3, 1 + rnd() * 3); }
}
export function marbleFloor(rx, ry) {
  const [c, g] = canvas(512, 512);
  for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { g.fillStyle = (x + y) % 2 ? '#2b2622' : '#cbbfa9'; g.fillRect(x * 256, y * 256, 256, 256); }
  g.lineWidth = 1;
  for (let i = 0; i < 40; i++) {
    g.strokeStyle = `rgba(${rnd() > .5 ? '255,255,255' : '40,30,20'},.13)`; g.beginPath();
    let x = rnd() * 512, y = rnd() * 512; g.moveTo(x, y);
    for (let k = 0; k < 6; k++) g.lineTo(x += (rnd() - .5) * 110, y += (rnd() - .5) * 110);
    g.stroke();
  }
  return tex(c, rx, ry);
}
export function plaster(rx, ry) {
  const [c, g] = canvas(256, 256); g.fillStyle = '#6d2f27'; g.fillRect(0, 0, 256, 256); speckle(g, 256, 256, 2600, .07); return tex(c, rx, ry);
}
// Teodosyus surlarının tuğla kuşaklı kesme taş örgüsü.
export function theodosianWall(rx, ry) {
  const [c, g] = canvas(512, 512); g.fillStyle = '#7f7464'; g.fillRect(0, 0, 512, 512);
  const row = 34;
  for (let y = 0; y < 512; y += row) {
    const band = Math.floor(y / row) % 8;
    if (band === 0 || band === 1) {
      for (let k = 0; k < row; k += 6) { g.fillStyle = k % 12 ? '#64463a' : '#7d5546'; g.fillRect(0, y + k, 512, 5); }
      continue;
    }
    for (let x = (Math.floor(y / row) % 2) * -30; x < 512; x += 60) {
      const v = 112 + rnd() * 40 | 0;
      g.fillStyle = `rgb(${v + 6},${v + 2},${v - 6})`; g.fillRect(x + 1, y + 1, 58, row - 2);
    }
  }
  speckle(g, 512, 512, 5000, .1);
  return tex(c, rx, ry);
}
export function dirt(rx, ry) {
  const [c, g] = canvas(512, 512); g.fillStyle = '#54452f'; g.fillRect(0, 0, 512, 512); speckle(g, 512, 512, 14000, .13);
  for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(30,22,12,${rnd() * .22})`; g.beginPath(); g.ellipse(rnd() * 512, rnd() * 512, 20 + rnd() * 60, 10 + rnd() * 26, rnd() * 3, 0, 7); g.fill(); }
  return tex(c, rx, ry);
}
export function wood(rx, ry) {
  const [c, g] = canvas(256, 128); g.fillStyle = '#5a3d22'; g.fillRect(0, 0, 256, 128);
  for (let i = 0; i < 130; i++) { g.fillStyle = `rgba(${rnd() > .5 ? '120,84,48' : '30,18,8'},.3)`; g.fillRect(0, rnd() * 128, 256, 1 + rnd() * 2); }
  return tex(c, rx, ry);
}
// Gökyüzü: bulutlar ve güneş ışık yönüyle uyumlu konumdadır (u = .156).
function paintSky(stops, cloud, sun) {
  const [c, g] = canvas(1024, 512), s = g.createLinearGradient(0, 0, 0, 512);
  for (const [o, k] of stops) s.addColorStop(o, k);
  g.fillStyle = s; g.fillRect(0, 0, 1024, 512);
  const su = sun && g.createRadialGradient(160, 236, 0, 160, 236, 230);
  if (su) { su.addColorStop(0, sun); su.addColorStop(.06, sun); su.addColorStop(.2, 'rgba(255,170,90,.5)'); su.addColorStop(1, 'rgba(255,140,70,0)'); g.fillStyle = su; g.fillRect(0, 0, 1024, 512); }
  for (let i = 0; i < 130; i++) { const x = rnd() * 1024, y = 90 + rnd() * 140, w = 40 + rnd() * 170, h = 3 + rnd() * 11; g.fillStyle = `rgba(${cloud},${.05 + rnd() * .17})`; for (const dx of [0, -1024, 1024]) { g.beginPath(); g.ellipse(x + dx, y, w, h, 0, 0, 7); g.fill(); } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export const duskSky = () => paintSky([[0, '#12182e'], [.3, '#3a3550'], [.42, '#a85c3c'], [.49, '#e0a25a'], [.52, '#4a3a2e'], [1, '#2a2118']], '255,190,150', '#fff0c8');
// Doku parlaklığından normal haritası üretir; taş ve tuğlaya gerçek ışıkla derinlik verir.
export function pbr(t, strength = 2.2) {
  const src = t.image, w = Math.min(src.width, 256), h = Math.min(src.height, 256), [c, g] = canvas(w, h); g.drawImage(src, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h), L = (x, y) => d.data[(((y + h) % h) * w + ((x + w) % w)) * 4 + 1] / 255, o = g.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (L(x - 1, y) - L(x + 1, y)) * strength, dy = (L(x, y - 1) - L(x, y + 1)) * strength, n = 1 / Math.hypot(dx, dy, 1), i = (y * w + x) * 4;
    o.data[i] = (dx * n + 1) * 127.5; o.data[i + 1] = (dy * n + 1) * 127.5; o.data[i + 2] = (n + 1) * 127.5; o.data[i + 3] = 255;
  }
  g.putImageData(o, 0, 0); const n = new THREE.CanvasTexture(c); n.wrapS = n.wrapT = THREE.RepeatWrapping; n.repeat.copy(t.repeat); n.anisotropy = 4;
  return { map: t, normalMap: n };
}
export function vignette() {
  const [c, g] = canvas(256, 256), s = g.createRadialGradient(128, 128, 56, 128, 128, 128); s.addColorStop(0, 'rgba(0,0,0,0)'); s.addColorStop(1, 'rgba(0,0,0,1)');
  g.fillStyle = s; g.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c);
}
export function soft(color = '255,190,110') {
  const [c, g] = canvas(64, 64), s = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  s.addColorStop(0, `rgba(${color},1)`); s.addColorStop(1, `rgba(${color},0)`);
  g.fillStyle = s; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
}
// Tablodaki kalabalık: kapı açılırken kişiler hareket eder.
export class CrowdPainting {
  constructor(draw, n) {
    [this.c, this.g] = canvas(512, 768); const [b, bg] = canvas(512, 768); draw(bg); painterly(b, 9000, 22); this.draw = (g) => g.drawImage(b, 0, 0);
    this.t = new THREE.CanvasTexture(this.c); this.t.colorSpace = THREE.SRGBColorSpace;
    this.p = Array.from({ length: n }, () => ({ x: rnd() * 512, y: 540 + rnd() * 210, c: ['#2a1b12', '#5b2a20', '#1f2a3a', '#c9b48a'][rnd() * 4 | 0], s: 7 + rnd() * 6, ph: rnd() * 7 }));
    this.render(0, 0);
  }
  render(time, motion) {
    const { g } = this; this.draw(g);
    for (const p of this.p) {
      const x = p.x + Math.sin(time * 3 + p.ph) * 9 * motion - time * motion * 18, y = p.y + Math.abs(Math.sin(time * 6 + p.ph)) * -5 * motion;
      g.fillStyle = p.c; g.fillRect(((x % 512) + 512) % 512, y, p.s, p.s * 2.6);
      g.beginPath(); g.arc(((x % 512) + 512) % 512 + p.s / 2, y - 3, p.s * .46, 0, 7); g.fill();
    }
    this.t.needsUpdate = true;
  }
}
export function drawIstanbul(g) {
  const s = g.createLinearGradient(0, 0, 0, 768); s.addColorStop(0, '#2d2c4a'); s.addColorStop(.55, '#d68a4a'); s.addColorStop(.7, '#51382a'); s.addColorStop(1, '#2c2119');
  g.fillStyle = s; g.fillRect(0, 0, 512, 768); g.fillStyle = '#4a3f38'; g.fillRect(0, 410, 512, 130);
  for (let x = 0; x < 512; x += 92) { g.fillRect(x, 340, 54, 200); for (let k = 0; k < 3; k++) g.fillRect(x + k * 20, 326, 13, 16); }
  g.fillStyle = '#7a3b2c'; for (let y = 430; y < 530; y += 34) g.fillRect(0, y, 512, 6);
  g.fillStyle = '#38302c'; g.beginPath(); g.arc(250, 330, 68, Math.PI, 0); g.fill(); g.fillRect(170, 325, 160, 30);
}
export function drawParis(g) {
  const s = g.createLinearGradient(0, 0, 0, 768); s.addColorStop(0, '#6d7c8c'); s.addColorStop(.6, '#c8b79a'); s.addColorStop(1, '#3a312a');
  g.fillStyle = s; g.fillRect(0, 0, 512, 768); g.fillStyle = '#3e3a39';
  for (const x of [50, 170, 300, 410]) { g.fillRect(x, 250, 76, 300); g.fillRect(x - 5, 240, 86, 16); }
  g.fillRect(50, 340, 430, 210);
  g.fillStyle = 'rgba(70,60,60,.55)'; g.beginPath(); g.ellipse(250, 200, 110, 46, 0, 0, 7); g.fill();
}
export function drawMap() {
  const [c, g] = canvas(512, 384); g.fillStyle = '#c9ad78'; g.fillRect(0, 0, 512, 384); speckle(g, 512, 384, 5000, .1);
  g.fillStyle = '#7f9186'; g.fillRect(0, 0, 512, 110); g.beginPath(); g.moveTo(512, 110); g.lineTo(512, 384); g.lineTo(350, 384); g.lineTo(440, 240); g.lineTo(300, 110); g.fill();
  g.strokeStyle = '#4b2f1b'; g.lineWidth = 6; g.beginPath(); g.moveTo(60, 110); g.lineTo(110, 200); g.lineTo(100, 330); g.lineTo(350, 384); g.stroke();
  g.fillStyle = '#4b2f1b'; g.font = '26px Georgia'; g.fillText('Konstantiniyye', 150, 240); g.font = '18px Georgia'; g.fillText('Haliç', 200, 80); g.fillText('Marmara', 420, 360);
  g.strokeStyle = '#8c1d18'; g.lineWidth = 3; g.setLineDash([8, 6]); g.strokeRect(30, 150, 45, 130);
  return tex(c);
}

export function cobbles(rx, ry) {
  const [c, g] = canvas(256, 256); g.fillStyle = '#4d4842'; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const v = 88 + rnd() * 42 | 0; g.fillStyle = `rgb(${v},${v - 3},${v - 8})`; g.beginPath(); g.ellipse(x * 32 + (y % 2) * 16, y * 32 + 16, 14, 13, 0, 0, 7); g.fill(); }
  return tex(c, rx, ry);
}
export function plasterTone(color, rx, ry) { const [c, g] = canvas(128, 128); g.fillStyle = color; g.fillRect(0, 0, 128, 128); speckle(g, 128, 128, 1400, .1); return tex(c, rx, ry); }
export function ashlar(rx, ry) {
  const [c, g] = canvas(256, 256); g.fillStyle = '#7d7669'; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) for (let x = (y / 32 % 2) * -32; x < 256; x += 64) { const v = 112 + rnd() * 24 | 0; g.fillStyle = `rgb(${v},${v - 4},${v - 12})`; g.fillRect(x + 1, y + 1, 62, 30); }
  speckle(g, 256, 256, 2200, .1); return tex(c, rx, ry);
}
export const daySky = () => paintSky([[0, '#5f778f'], [.4, '#aab6bb'], [.49, '#ddd6c6'], [.52, '#56504a'], [1, '#3a342e']], '245,245,240', null);
export function drawPamphlet() {
  const [c, g] = canvas(512, 384); g.fillStyle = '#e2d7bd'; g.fillRect(0, 0, 512, 384); speckle(g, 512, 384, 3000, .08);
  g.fillStyle = '#2a211a'; g.textAlign = 'center'; g.font = 'bold 42px Georgia'; g.fillText('AUX ARMES', 256, 90); g.font = '24px Georgia'; g.fillText('Citoyens de Paris', 256, 135);
  g.fillRect(90, 160, 332, 3); for (let y = 190; y < 330; y += 24) g.fillRect(90, y, 332 - (y % 48), 7); g.font = '18px Georgia'; g.fillText('14 juillet 1789', 256, 360);
  return tex(c);
}

// Fırça darbeleri: düz çizimi yağlı boya tablo dokusuna çevirir.
export function painterly(c, n = 9000, size = 16) {
  const g = c.getContext('2d'), d = g.getImageData(0, 0, c.width, c.height).data;
  for (let i = 0; i < n; i++) {
    const x = rnd() * c.width | 0, y = rnd() * c.height | 0, k = (y * c.width + x) * 4, j = (rnd() - .5) * 26;
    g.strokeStyle = `rgba(${d[k] + j},${d[k + 1] + j},${d[k + 2] + j},.75)`; g.lineWidth = 2 + rnd() * size * .4; g.lineCap = 'round';
    const a = rnd() * .9 - .45, l = 3 + rnd() * size; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
}
const SCENES = {
  deniz: (g, w, h) => { const s = g.createLinearGradient(0, 0, 0, h); s.addColorStop(0, '#31465c'); s.addColorStop(.5, '#e0a874'); s.addColorStop(.55, '#2c4656'); s.addColorStop(1, '#10222c'); g.fillStyle = s; g.fillRect(0, 0, w, h); for (const [x, y, k] of [[.25, .52, 1], [.6, .57, 1.5], [.82, .5, .7]]) { g.fillStyle = '#1b130d'; g.beginPath(); g.moveTo(w * x - 44 * k, h * y); g.lineTo(w * x + 44 * k, h * y); g.lineTo(w * x + 30 * k, h * y + 16 * k); g.lineTo(w * x - 30 * k, h * y + 16 * k); g.fill(); g.fillRect(w * x - 2, h * y - 60 * k, 4, 60 * k); g.fillStyle = '#d9c9a4'; g.beginPath(); g.moveTo(w * x, h * y - 58 * k); g.quadraticCurveTo(w * x + 40 * k, h * y - 34 * k, w * x, h * y - 8 * k); g.fill(); } },
  kubbe: (g, w, h) => { const s = g.createLinearGradient(0, 0, 0, h); s.addColorStop(0, '#2b2c4c'); s.addColorStop(.6, '#d98a50'); s.addColorStop(1, '#3a2a22'); g.fillStyle = s; g.fillRect(0, 0, w, h); g.fillStyle = '#41302e'; g.beginPath(); g.arc(w / 2, h * .62, w * .2, Math.PI, 0); g.fill(); g.fillRect(w * .2, h * .6, w * .6, h * .4); g.fillStyle = '#ffcf80'; for (let i = 0; i < 9; i++) g.fillRect(w * .26 + i * w * .055, h * .68, 6, 16); },
  orman: (g, w, h) => { const s = g.createLinearGradient(0, 0, 0, h); s.addColorStop(0, '#6c8ea2'); s.addColorStop(.6, '#e2cda0'); s.addColorStop(1, '#3f4a2c'); g.fillStyle = s; g.fillRect(0, 0, w, h); g.fillStyle = '#4f5f50'; g.beginPath(); g.moveTo(0, h * .6); g.lineTo(w * .3, h * .36); g.lineTo(w * .55, h * .58); g.lineTo(w * .8, h * .42); g.lineTo(w, h * .6); g.lineTo(w, h); g.lineTo(0, h); g.fill(); g.fillStyle = '#26321f'; for (let i = 0; i < 12; i++) { const x = i * w / 11; g.beginPath(); g.moveTo(x, h * .9); g.lineTo(x + 18, h * .6 - i % 3 * 12); g.lineTo(x + 36, h * .9); g.fill(); } },
  sur: (g, w, h) => { const s = g.createLinearGradient(0, 0, 0, h); s.addColorStop(0, '#39425a'); s.addColorStop(.55, '#c88f6a'); s.addColorStop(1, '#2a2118'); g.fillStyle = s; g.fillRect(0, 0, w, h); g.fillStyle = '#50433c'; g.fillRect(0, h * .5, w, h * .28); for (let x = 0; x < w; x += w / 5) g.fillRect(x, h * .34, w * .11, h * .4); g.fillStyle = '#6f3a2c'; for (let y = h * .54; y < h * .78; y += 22) g.fillRect(0, y, w, 4); g.fillStyle = '#17110c'; for (let i = 0; i < 26; i++) g.fillRect(i * w / 25, h * .85 + i * 3 % 18, 5, 18); },
};
export function sceneArt(name) {
  const [c, g] = canvas(512, 384); SCENES[name](g, 512, 384); painterly(c, 7000, 20);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
// Cepheler: pencere, kepenk, kapı, kiriş dokuda; birkaç geometriyle dolu görünür.
export function facade(kind, seed = 0) {
  const [c, g] = canvas(512, 512), P = kind === 'paris', base = P ? ['#b8ac94', '#a79a84', '#c2b69e'] : ['#a58c6c', '#94806a', '#b29a78'];
  g.fillStyle = base[seed % 3]; g.fillRect(0, 0, 512, 512); speckle(g, 512, 512, 6000, .09);
  for (let i = 0; i < 24; i++) { g.fillStyle = `rgba(40,30,20,${rnd() * .07})`; g.beginPath(); g.ellipse(rnd() * 512, rnd() * 512, 30 + rnd() * 60, 10 + rnd() * 40, 0, 0, 7); g.fill(); }
  const grime = g.createLinearGradient(0, 330, 0, 512); grime.addColorStop(0, 'rgba(30,22,14,0)'); grime.addColorStop(1, 'rgba(30,22,14,.5)'); g.fillStyle = grime; g.fillRect(0, 330, 512, 182);
  if (!P) { g.fillStyle = '#6e5244'; for (let y = 372; y < 512; y += 7) g.fillRect(0, y, 512, 2); g.fillStyle = '#3a2619'; g.fillRect(0, 150, 512, 12); g.fillRect(0, 340, 512, 16); for (let x = 20; x < 512; x += 118) g.fillRect(x, 150, 11, 196); }
  else { g.fillStyle = '#d6cbb4'; g.fillRect(0, 168, 512, 10); g.fillRect(0, 348, 512, 12); }
  const win = (x, y, w, h) => {
    if (P) { g.fillStyle = '#d9d0ba'; g.fillRect(x - 6, y - 6, w + 12, h + 12); } g.fillStyle = '#1b1a1c'; if (!P) { g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + w / 2); g.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); g.lineTo(x + w, y + h); g.fill(); } else g.fillRect(x, y, w, h);
    g.strokeStyle = P ? '#c9bda4' : '#5a4230'; g.lineWidth = 3; g.beginPath(); g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y + h); g.moveTo(x, y + h / 2); g.lineTo(x + w, y + h / 2); g.stroke();
    g.fillStyle = P ? ['#3d5a50', '#4e5a68'][seed % 2] : '#5e3c26'; g.fillRect(x - 21, y, 19, h); g.fillRect(x + w + 2, y, 19, h);
  };
  const cols = [90, 340]; for (const y of P ? [40, 200] : [40, 196]) for (const x of cols) win(x, y, 82, 110);
  g.fillStyle = '#2b1c12'; g.fillRect(205, 372, 100, 140); g.fillStyle = '#6a4a2c'; g.fillRect(213, 380, 84, 132); g.fillStyle = '#3f2a18'; for (let x = 228; x < 297; x += 22) g.fillRect(x, 380, 3, 132);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

export const nightSky = () => { const t = paintSky([[0, '#080c1e'], [.4, '#1c2440'], [.5, '#3c4258'], [.52, '#1c1a1e'], [1, '#121014']], '110,120,160', null), c = t.image, g = c.getContext('2d'); for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(255,250,235,${.15 + rnd() * .6})`; g.fillRect(rnd() * 1024, 40 + rnd() * 190, .7, .7); } g.fillStyle = '#efe8d2'; g.beginPath(); g.arc(760, 90, 22, 0, 7); g.fill(); t.needsUpdate = true; return t; };
export function drawAnkara(g) {
  const s = g.createLinearGradient(0, 0, 0, 768); s.addColorStop(0, '#101a38'); s.addColorStop(.6, '#46506c'); s.addColorStop(.7, '#2a2428'); s.addColorStop(1, '#1b1718'); g.fillStyle = s; g.fillRect(0, 0, 512, 768);
  g.fillStyle = '#ecd9a8'; g.beginPath(); g.arc(380, 120, 28, 0, 7); g.fill(); g.fillStyle = '#6a4f58'; g.fillRect(50, 360, 412, 180); g.fillStyle = '#7f3a2c'; g.beginPath(); g.moveTo(30, 360); g.lineTo(256, 280); g.lineTo(482, 360); g.fill();
  g.fillStyle = '#ffd98a'; for (let x = 76; x < 440; x += 58) { g.fillRect(x, 392, 26, 46); g.fillRect(x, 464, 26, 46); }
  g.fillStyle = '#b5271f'; g.fillRect(240, 210, 56, 36); g.fillStyle = '#fff'; g.beginPath(); g.arc(256, 228, 10, 0, 7); g.fill(); g.fillStyle = '#b5271f'; g.beginPath(); g.arc(259, 228, 8, 0, 7); g.fill(); g.fillStyle = '#3a2a1a'; g.fillRect(236, 210, 4, 150);
}
export function drawGazette() {
  const [c, g] = canvas(512, 384); g.fillStyle = '#ddd1b4'; g.fillRect(0, 0, 512, 384); speckle(g, 512, 384, 3000, .08); g.fillStyle = '#231b14'; g.textAlign = 'center'; g.direction = 'rtl';
  g.font = 'bold 46px Georgia, serif'; g.fillText('جمهوريت اعلان اولندى', 256, 80); g.fillRect(40, 102, 432, 3); for (let col = 0; col < 3; col++) for (let y = 124; y < 350; y += 16) g.fillRect(44 + col * 146, y, 126 - (y * 7 % 19), 5); g.direction = 'ltr';
  return tex(c);
}
export function turkFlag() {
  const [c, g] = canvas(256, 170); g.fillStyle = '#c8102e'; g.fillRect(0, 0, 256, 170); g.fillStyle = '#fff'; g.beginPath(); g.arc(90, 85, 42, 0, 7); g.fill(); g.fillStyle = '#c8102e'; g.beginPath(); g.arc(101, 85, 34, 0, 7); g.fill(); g.fillStyle = '#fff'; g.save(); g.translate(142, 85); g.rotate(-Math.PI / 2); g.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 9 : 22, a = i * Math.PI / 5; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.fill(); g.restore();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function meclisFacade() {
  const [c, g] = canvas(1024, 256); g.fillStyle = '#7a5f68'; g.fillRect(0, 0, 1024, 256);
  for (let y = 0; y < 256; y += 18) for (let x = (y / 18 % 2) * -24; x < 1024; x += 48) { const v = rnd() * 24 - 12; g.fillStyle = `rgb(${122 + v},${94 + v},${106 + v})`; g.fillRect(x + 1, y + 1, 46, 16); } speckle(g, 1024, 256, 6000, .06);
  g.fillStyle = '#c8bda8'; g.fillRect(0, 122, 1024, 7); g.fillRect(0, 6, 1024, 7);
  for (const y of [34, 150]) for (let x = 30; x < 1000; x += 66) { if (x > 440 && x < 560 && y > 100) continue; g.fillStyle = '#d9cbb4'; g.fillRect(x - 5, y - 5, 42, 80); g.fillStyle = '#171a24'; g.fillRect(x, y, 32, 70); }
  return tex(c);
}
export function adobe(seed) { const [c, g] = canvas(256, 256); g.fillStyle = ['#a18c72', '#8f7c66', '#b09a7c'][seed % 3]; g.fillRect(0, 0, 256, 256); speckle(g, 256, 256, 3000, .1); g.fillStyle = '#4a3324'; g.fillRect(0, 104, 256, 8); for (let x = 12; x < 256; x += 60) g.fillRect(x, 0, 7, 256); g.fillStyle = '#1b1a1e'; g.fillRect(48, 26, 44, 60); g.fillRect(160, 26, 44, 60); g.fillStyle = '#3a2619'; g.fillRect(100, 140, 58, 116); return tex(c); }

export function crate() { const [c, g] = canvas(256, 256); g.fillStyle = '#6a4a2c'; g.fillRect(0, 0, 256, 256); speckle(g, 256, 256, 2000, .12); g.fillStyle = '#2f1f12'; for (let y = 0; y < 256; y += 62) g.fillRect(0, y, 256, 5); g.fillStyle = '#4a321d'; g.fillRect(0, 0, 18, 256); g.fillRect(238, 0, 18, 256); g.fillRect(0, 0, 256, 18); g.fillRect(0, 238, 256, 18); g.fillStyle = '#1f150c'; for (const [x, y] of [[9, 9], [247, 9], [9, 247], [247, 247]]) { g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); } return tex(c); }

export function sand(rx, ry) { const [c, g] = canvas(256, 256); g.fillStyle = '#d8c79a'; g.fillRect(0, 0, 256, 256); speckle(g, 256, 256, 9000, .08); return tex(c, rx, ry); }
export function thatch(rx, ry) { const [c, g] = canvas(256, 256); g.fillStyle = '#8a6e3e'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 2600; i++) { g.strokeStyle = `rgba(${rnd() > .5 ? '190,160,100' : '60,44,20'},.5)`; g.lineWidth = 1 + rnd() * 2; const x = rnd() * 256, y = rnd() * 256; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - .5) * 6, y + 18 + rnd() * 20); g.stroke(); } return tex(c, rx, ry); }
export function waves() { const [c, g] = canvas(256, 256); g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 900; i++) { const v = rnd() > .5 ? 200 : 60; g.fillStyle = `rgba(${v},${v},${v},.1)`; g.beginPath(); g.ellipse(rnd() * 256, rnd() * 256, 16 + rnd() * 26, 2 + rnd() * 3, (rnd() - .5) * .4, 0, 7); g.fill(); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(40, 40); return pbr(t, 4).normalMap; }
export function drawGuanahani(g) {
  const s = g.createLinearGradient(0, 0, 0, 768); s.addColorStop(0, '#3f7fa8'); s.addColorStop(.42, '#f0cf9e'); s.addColorStop(.46, '#2a7f8c'); s.addColorStop(.74, '#2f8f94'); s.addColorStop(.75, '#e0cf9a'); s.addColorStop(1, '#b89a68'); g.fillStyle = s; g.fillRect(0, 0, 512, 768);
  for (const [x, y, k] of [[150, 320, .7], [340, 340, 1.1]]) { g.fillStyle = '#2a1c12'; g.fillRect(x - 44 * k, y, 88 * k, 22 * k); g.fillRect(x - 2, y - 74 * k, 4, 74 * k); g.fillStyle = '#ecdcbe'; g.fillRect(x - 28 * k, y - 66 * k, 56 * k, 46 * k); g.fillStyle = '#b5271f'; g.fillRect(x - 3, y - 62 * k, 6, 38 * k); g.fillRect(x - 15 * k, y - 48 * k, 30 * k, 6); }
  g.fillStyle = '#2e4a24'; for (const x of [40, 470]) { g.fillStyle = '#4a3320'; g.fillRect(x, 330, 12, 260); g.fillStyle = '#2e4a24'; for (let a = 0; a < 7; a++) { g.beginPath(); g.ellipse(x + 6 + Math.cos(a) * 44, 330 + Math.sin(a) * 18, 52, 10, a, 0, 7); g.fill(); } }
}
export function drawBeads() { const [c, g] = canvas(512, 384); g.fillStyle = '#3a2a1a'; g.fillRect(0, 0, 512, 384); speckle(g, 512, 384, 2200, .07); const cols = ['#c9352c', '#2f7fa8', '#e2c04a', '#ececec', '#2e8a5a']; for (let i = 0; i < 44; i++) { const a = i / 44 * 6.283, x = 256 + Math.cos(a) * 150 + Math.sin(a * 3) * 16, y = 192 + Math.sin(a) * 118; g.fillStyle = cols[i % 5]; g.beginPath(); g.arc(x, y, 11, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.65)'; g.beginPath(); g.arc(x - 3, y - 4, 3, 0, 7); g.fill(); } return tex(c); }

export const islandSky = () => paintSky([[0, '#3f86b4'], [.38, '#a9d3e4'], [.495, '#f2e4c6'], [.51, '#9cc8d0'], [1, '#6f9aa2']], '255,255,250', null);
export function sail() { const [c, g] = canvas(256, 256); g.fillStyle = '#e6d9bb'; g.fillRect(0, 0, 256, 256); speckle(g, 256, 256, 1500, .06); g.strokeStyle = 'rgba(100,80,50,.3)'; for (let x = 0; x < 256; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); } g.fillStyle = '#b5271f'; g.fillRect(108, 30, 40, 196); g.fillRect(40, 98, 176, 40); return tex(c); }
export function greenCross() { const [c, g] = canvas(256, 170); g.fillStyle = '#e6e0cc'; g.fillRect(0, 0, 256, 170); g.fillStyle = '#2e7a3e'; g.fillRect(116, 8, 24, 154); g.fillRect(24, 74, 208, 24); g.font = 'bold 30px Georgia'; g.textAlign = 'center'; g.fillText('F', 60, 54); g.fillText('Y', 196, 54); return tex(c); }

const easel = (paint) => { const [c, g] = canvas(512, 384); paint(g); return tex(c); };
export const drawInvite = () => easel(g => { g.fillStyle = '#e6dcc0'; g.fillRect(0, 0, 512, 384); g.strokeStyle = '#a8842c'; g.lineWidth = 8; g.strokeRect(24, 24, 464, 336); g.fillStyle = '#3a2a1a'; g.textAlign = 'center'; g.font = 'italic 34px Georgia'; g.fillText('Sacre de l’Empereur', 256, 120); g.font = '24px Georgia'; g.fillText('Notre-Dame', 256, 180); g.fillText('11 Frimaire An XIII', 256, 230); });
export const drawCrane = () => easel(g => { g.fillStyle = '#f2ece0'; g.fillRect(0, 0, 512, 384); g.fillStyle = '#c8384a'; g.beginPath(); g.moveTo(90, 200); g.lineTo(256, 150); g.lineTo(420, 120); g.lineTo(300, 230); g.lineTo(256, 320); g.lineTo(210, 230); g.closePath(); g.fill(); g.fillStyle = '#a62c3e'; g.beginPath(); g.moveTo(256, 150); g.lineTo(300, 230); g.lineTo(256, 320); g.fill(); });
export const drawWallPiece = () => easel(g => { g.fillStyle = '#9a968c'; g.fillRect(0, 0, 512, 384); speckle(g, 512, 384, 9000, .16); for (const [c, x, y, w] of [['#d8352a', 70, 90, 180], ['#2f7fa8', 190, 170, 240], ['#e2c04a', 60, 250, 210]]) { g.strokeStyle = c; g.lineWidth = 24; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w / 2, y - 60, x + w, y + 12); g.stroke(); } });
export const drawRibbon = () => easel(g => { g.fillStyle = '#20242c'; g.fillRect(0, 0, 512, 384); g.strokeStyle = '#2f5fa8'; g.lineWidth = 26; g.beginPath(); g.moveTo(190, 310); g.lineTo(300, 90); g.stroke(); g.strokeStyle = '#3f74c2'; g.beginPath(); g.moveTo(322, 310); g.lineTo(212, 90); g.stroke(); g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(226, 40, 16, 200); g.fillRect(270, 40, 16, 200); });
export function drawNotre(g) { const s = g.createLinearGradient(0, 0, 0, 768); s.addColorStop(0, '#20140f'); s.addColorStop(1, '#5a2a22'); g.fillStyle = s; g.fillRect(0, 0, 512, 768); g.fillStyle = '#c8a24a'; g.beginPath(); g.arc(256, 240, 80, 0, 7); g.fill(); g.fillStyle = '#2a4a8c'; for (let a = 0; a < 12; a++) { g.beginPath(); g.arc(256 + Math.cos(a * .52) * 52, 240 + Math.sin(a * .52) * 52, 14, 0, 7); g.fill(); } g.fillStyle = '#8c1f1c'; g.fillRect(120, 380, 272, 180); g.fillStyle = '#d8b050'; g.beginPath(); g.moveTo(216, 450); g.lineTo(226, 410); g.lineTo(256, 436); g.lineTo(286, 410); g.lineTo(296, 450); g.fill(); }
export function drawHiroshima(g) { const s = g.createLinearGradient(0, 0, 0, 768); s.addColorStop(0, '#d8dee0'); s.addColorStop(1, '#8f9498'); g.fillStyle = s; g.fillRect(0, 0, 512, 768); g.fillStyle = '#4a4a4c'; g.fillRect(140, 340, 232, 200); g.beginPath(); g.arc(256, 340, 66, Math.PI, 0); g.lineTo(322, 340); g.fill(); g.strokeStyle = '#d8dee0'; g.lineWidth = 4; for (let a = 0; a < 7; a++) { g.beginPath(); g.moveTo(256, 276); g.lineTo(190 + a * 22, 340); g.stroke(); } g.fillStyle = '#6f7c88'; g.fillRect(0, 560, 512, 208); g.fillStyle = '#ffd98a'; for (let i = 0; i < 14; i++) g.fillRect(40 + i * 31, 610 + i * 37 % 110, 12, 12); }
export function drawBerlin(g) { const s = g.createLinearGradient(0, 0, 0, 768); s.addColorStop(0, '#10182a'); s.addColorStop(1, '#3a3a46'); g.fillStyle = s; g.fillRect(0, 0, 512, 768); g.fillStyle = '#b8b4a8'; g.fillRect(0, 380, 512, 170); for (const [c, x] of [['#d8352a', 70], ['#2f7fa8', 230], ['#e2c04a', 380]]) { g.strokeStyle = c; g.lineWidth = 16; g.beginPath(); g.moveTo(x, 520); g.quadraticCurveTo(x + 40, 400, x + 80, 500); g.stroke(); } }
export function drawNYC(g) { const s = g.createLinearGradient(0, 0, 0, 768); s.addColorStop(0, '#07090f'); s.addColorStop(1, '#1a2130'); g.fillStyle = s; g.fillRect(0, 0, 512, 768); g.fillStyle = 'rgba(180,210,255,.5)'; g.fillRect(208, 0, 26, 520); g.fillRect(278, 0, 26, 520); g.fillStyle = '#0b0d14'; g.fillRect(0, 500, 512, 268); for (let i = 0; i < 40; i++) g.fillRect(i * 13, 470 - i * 37 % 60, 11, 80); }
export function gildedDrape() { const [c, g] = canvas(256, 512); g.fillStyle = '#8c1f1c'; g.fillRect(0, 0, 256, 512); for (let x = 0; x < 256; x += 22) { g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(x, 0, 9, 512); } g.fillStyle = '#d8b050'; for (let y = 40; y < 512; y += 90) for (let x = 44; x < 256; x += 80) { g.beginPath(); g.ellipse(x + (y % 2) * 40, y, 8, 12, 0, 0, 7); g.fill(); } return tex(c); }
export function stainedGlass() { const [c, g] = canvas(128, 256); const cols = ['#2a4a8c', '#b5271f', '#d8a832', '#2e7a4e']; for (let y = 0; y < 256; y += 24) for (let x = 0; x < 128; x += 24) { g.fillStyle = cols[(x + y * 3) % 4 | 0]; g.fillRect(x, y, 22, 22); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
export function grafWall() { const [c, g] = canvas(512, 256); g.fillStyle = '#9a968c'; g.fillRect(0, 0, 512, 256); speckle(g, 512, 256, 8000, .14); for (let x = 0; x < 512; x += 64) { g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x, 0, 3, 256); } for (let i = 0; i < 26; i++) { g.strokeStyle = ['#d8352a', '#2f7fa8', '#e2c04a', '#3f9a5a', '#e8e0d0'][i % 5]; g.lineWidth = 8 + rnd() * 12; g.lineCap = 'round'; const x = rnd() * 512, y = 70 + rnd() * 160; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 50, y - 60 * rnd(), x + 90 * rnd(), y + 20); g.stroke(); } return tex(c, 6, 1); }
export function concrete(rx, ry) { const [c, g] = canvas(256, 128); g.fillStyle = '#8a877e'; g.fillRect(0, 0, 256, 128); speckle(g, 256, 128, 3000, .12); for (let x = 0; x < 256; x += 42) { g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(x, 0, 2, 128); } return tex(c, rx, ry); }
export const paleSky = () => paintSky([[0, '#5f9ccc'], [.4, '#bedcec'], [.495, '#f0ece0'], [.51, '#a6b0b4'], [1, '#6a7074']], '255,255,255', null);
export const greySky = () => paintSky([[0, '#4a4a4c'], [.42, '#7a7672'], [.5, '#8f8678'], [.53, '#5a544e'], [1, '#3a3632']], '60,56,52', null);
