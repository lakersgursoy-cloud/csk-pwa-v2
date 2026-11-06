import * as THREE from 'three';

function wrap(g, text, max) {
  const lines = []; let l = '';
  for (const w of text.split(' ')) { const t = l ? `${l} ${w}` : w; if (g.measureText(t).width > max && l) { lines.push(l); l = w; } else l = t; }
  if (l) lines.push(l); return lines;
}
// Okunaklı dünya içi metin paneli. Quest'te 1 metrede ~4 cm yazı yüksekliği hedeflenir.
export class Panel extends THREE.Mesh {
  constructor(w = 1.3, h = .42, { bg = 'rgba(14,11,8,.9)', border = '#d9a845', color = '#f1e7d4', size = 54 } = {}) {
    const c = document.createElement('canvas'); c.width = 1024; c.height = Math.round(1024 * h / w);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    super(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, fog: false, toneMapped: false }));
    Object.assign(this, { c, t, bg, border, color, size }); this.renderOrder = 20;
  }
  set(text, sub) {
    const { c, size } = this, g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height);
    g.fillStyle = this.bg; g.fillRect(0, 0, c.width, c.height); g.strokeStyle = this.border; g.lineWidth = 5; g.strokeRect(4, 4, c.width - 8, c.height - 8);
    g.fillStyle = this.color; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `${size}px Georgia, serif`;
    const ls = wrap(g, text, c.width - 90), lh = size * 1.26, total = ls.length * lh + (sub ? size : 0); let y = (c.height - total) / 2 + lh / 2;
    for (const l of ls) { g.fillText(l, c.width / 2, y); y += lh; }
    if (sub) { g.fillStyle = '#d9a845'; g.font = `${size * .66}px Georgia, serif`; g.fillText(sub, c.width / 2, y + size * .2); }
    this.t.needsUpdate = true; return this;
  }
}
