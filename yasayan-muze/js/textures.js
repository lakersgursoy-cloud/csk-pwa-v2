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
export function duskSky() {
  const [c, g] = canvas(32, 256), s = g.createLinearGradient(0, 0, 0, 256);
  s.addColorStop(0, '#12182e'); s.addColorStop(.32, '#3a3550'); s.addColorStop(.44, '#a85c3c'); s.addColorStop(.5, '#e0a25a'); s.addColorStop(.53, '#4a3a2e'); s.addColorStop(1, '#2a2118');
  g.fillStyle = s; g.fillRect(0, 0, 32, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function soft(color = '255,190,110') {
  const [c, g] = canvas(64, 64), s = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  s.addColorStop(0, `rgba(${color},1)`); s.addColorStop(1, `rgba(${color},0)`);
  g.fillStyle = s; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
}
// Tablodaki kalabalık: kapı açılırken kişiler hareket eder.
export class CrowdPainting {
  constructor(draw, n) {
    [this.c, this.g] = canvas(512, 768); this.draw = draw;
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
export function daySky() {
  const [c, g] = canvas(32, 256), s = g.createLinearGradient(0, 0, 0, 256);
  s.addColorStop(0, '#6c8197'); s.addColorStop(.42, '#b3bcbf'); s.addColorStop(.5, '#d9d3c4'); s.addColorStop(.54, '#56504a'); s.addColorStop(1, '#3a342e');
  g.fillStyle = s; g.fillRect(0, 0, 32, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function drawPamphlet() {
  const [c, g] = canvas(512, 384); g.fillStyle = '#e2d7bd'; g.fillRect(0, 0, 512, 384); speckle(g, 512, 384, 3000, .08);
  g.fillStyle = '#2a211a'; g.textAlign = 'center'; g.font = 'bold 42px Georgia'; g.fillText('AUX ARMES', 256, 90); g.font = '24px Georgia'; g.fillText('Citoyens de Paris', 256, 135);
  g.fillRect(90, 160, 332, 3); for (let y = 190; y < 330; y += 24) g.fillRect(90, y, 332 - (y % 48), 7); g.font = '18px Georgia'; g.fillText('14 juillet 1789', 256, 360);
  return tex(c);
}
