// Tüm sesler kodla üretilir; ek dosya gerekmez.
export class Sound {
  ctx = null; bed = null;
  start() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    this.ctx = new AC(); this.master = this.ctx.createGain(); this.master.gain.value = .75; this.master.connect(this.ctx.destination);
    const n = this.ctx.sampleRate * 2, b = this.ctx.createBuffer(1, n, this.ctx.sampleRate), d = b.getChannelData(0);
    let v = 0; for (let i = 0; i < n; i++) { v = v * .98 + (Math.random() - .5) * .08; d[i] = v; }
    this.noise = b;
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }
  // Tarayıcıda Türkçe ses varsa metni okur; yoksa oyun yalnızca altyazıyla sürer.
  narrate(text) {
    const sp = window.speechSynthesis; if (!sp) return;
    const v = sp.getVoices().find(x => x.lang?.toLowerCase().startsWith('tr')); sp.cancel(); if (!v) return;
    const u = new SpeechSynthesisUtterance(text); u.voice = v; u.lang = v.lang; u.rate = .96; sp.speak(u);
  }
  ambient(kind) {
    if (!this.ctx) return;
    if (this.bed) { const o = this.bed; o.g.gain.setTargetAtTime(0, this.ctx.currentTime, .4); setTimeout(() => o.s.stop(), 1500); this.bed = null; }
    const s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    s.buffer = this.noise; s.loop = true; f.type = kind === 'crowd' ? 'bandpass' : 'lowpass'; f.frequency.value = { camp: 700, crowd: 620, museum: 220, sea: 420 }[kind] ?? 220; g.gain.value = 0;
    s.connect(f).connect(g).connect(this.master); s.start();
    g.gain.setTargetAtTime({ camp: 1.4, crowd: 2.4, sea: 2.2 }[kind] ?? .5, this.ctx.currentTime, 1); this.bed = { s, g };
  }
  thud(freq = 60, dur = 1, vol = 1, delay = 0) {
    if (!this.ctx) return; const t = this.ctx.currentTime + delay, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.frequency.setValueAtTime(freq * 2, t); o.frequency.exponentialRampToValueAtTime(freq / 2, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + dur);
  }
  heartbeat() { for (const d of [0, .32, 1.05, 1.37]) this.thud(48, .24, .8, d); }
  applause(dur = 4) {
    if (!this.ctx) return; for (let i = 0; i < 8; i++) { const s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain(), t = this.ctx.currentTime + i * dur / 9; s.buffer = this.noise; f.type = 'highpass'; f.frequency.value = 1400; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(5, t + .4); g.gain.linearRampToValueAtTime(0, t + 1.4); s.connect(f).connect(g).connect(this.master); s.start(t); s.stop(t + 1.5); }
  }
  // Döneme özgü sessiz müzik: dizi notalarından üretilir, ses kaydı gerekmez.
  score(scale, solemn = false, root = 196) { this.music = scale ? { scale, solemn, root, next: .4, deg: 0 } : null; if (this.drone) { const d = this.drone; d.g.gain.setTargetAtTime(0, this.ctx.currentTime, .8); setTimeout(() => d.o.forEach(o => o.stop()), 3000); this.drone = null; }
    if (scale && this.ctx && !solemn) { const g = this.ctx.createGain(), f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420; g.gain.value = 0; const o = [root / 2, root * .75].map((fr, i) => { const x = this.ctx.createOscillator(); x.type = i ? 'triangle' : 'sawtooth'; x.frequency.value = fr; x.detune.value = i * 4; x.connect(f); x.start(); return x; }); f.connect(g).connect(this.master); g.gain.setTargetAtTime(.05, this.ctx.currentTime, 2.5); this.drone = { g, o }; } }
  tick(dt) { const m = this.music; if (!m || !this.ctx) return; m.next -= dt; if (m.next > 0) return; m.next = (m.solemn ? 3.4 : 1.1) + Math.random() * (m.solemn ? 3 : 1.6); m.deg = Math.max(0, Math.min(m.scale.length * 2 - 1, m.deg + (Math.random() * 5 | 0) - 2)); const oct = m.deg >= m.scale.length ? 2 : 1, fr = m.root * oct * 2 ** (m.scale[m.deg % m.scale.length] / 12); this.pluck(fr, m.solemn ? 3.2 : 1.8, m.solemn ? .07 : .06); }
  pluck(f, dur, vol) { const t = this.ctx.currentTime, o = this.ctx.createOscillator(), o2 = this.ctx.createOscillator(), g = this.ctx.createGain(), lp = this.ctx.createBiquadFilter(); o.type = 'triangle'; o.frequency.value = f; o2.type = 'sine'; o2.frequency.value = f * 2.01; lp.type = 'lowpass'; lp.frequency.setValueAtTime(2400, t); lp.frequency.exponentialRampToValueAtTime(420, t + dur); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .012); g.gain.exponentialRampToValueAtTime(.0008, t + dur); o.connect(lp); o2.connect(lp); lp.connect(g).connect(this.master); o.start(t); o2.start(t); o.stop(t + dur); o2.stop(t + dur); }
  silence() { this.score(null); if (this.bed && this.ctx) { this.bed.g.gain.setTargetAtTime(0, this.ctx.currentTime, .08); } speechSynthesis?.cancel?.(); }
  chime() { if (!this.ctx) return; for (const [i, f] of [392, 587].entries()) { const t = this.ctx.currentTime + i * .08, o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.frequency.value = f; g.gain.setValueAtTime(.12, t); g.gain.exponentialRampToValueAtTime(.001, t + 1.2); o.connect(g).connect(this.master); o.start(t); o.stop(t + 1.2); } }
  cannon() {
    if (!this.ctx) return; this.thud(46, 2.4, 1.3);
    const s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain(), t = this.ctx.currentTime;
    s.buffer = this.noise; f.type = 'lowpass'; f.frequency.setValueAtTime(3200, t); f.frequency.exponentialRampToValueAtTime(90, t + 1.8);
    g.gain.setValueAtTime(9, t); g.gain.exponentialRampToValueAtTime(.001, t + 1.9); s.connect(f).connect(g).connect(this.master); s.start(t); s.stop(t + 2);
    this.thud(70, .9, .6, 1.7);
  }
}
