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
    s.buffer = this.noise; s.loop = true; f.type = kind === 'crowd' ? 'bandpass' : 'lowpass'; f.frequency.value = { camp: 700, crowd: 620, museum: 220 }[kind] ?? 220; g.gain.value = 0;
    s.connect(f).connect(g).connect(this.master); s.start();
    g.gain.setTargetAtTime({ camp: 1.4, crowd: 2.4 }[kind] ?? .5, this.ctx.currentTime, 1); this.bed = { s, g };
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
  chime() { if (!this.ctx) return; for (const [i, f] of [392, 587].entries()) { const t = this.ctx.currentTime + i * .08, o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.frequency.value = f; g.gain.setValueAtTime(.12, t); g.gain.exponentialRampToValueAtTime(.001, t + 1.2); o.connect(g).connect(this.master); o.start(t); o.stop(t + 1.2); } }
  cannon() {
    if (!this.ctx) return; this.thud(46, 2.4, 1.3);
    const s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain(), t = this.ctx.currentTime;
    s.buffer = this.noise; f.type = 'lowpass'; f.frequency.setValueAtTime(3200, t); f.frequency.exponentialRampToValueAtTime(90, t + 1.8);
    g.gain.setValueAtTime(9, t); g.gain.exponentialRampToValueAtTime(.001, t + 1.9); s.connect(f).connect(g).connect(this.master); s.start(t); s.stop(t + 2);
    this.thud(70, .9, .6, 1.7);
  }
}
