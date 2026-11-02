/* Anka'nın Yükselişi — ÇSK V2 içi. Tut, bırak, şerit, nefes. */
(function () {
  const LANES = [0.22, 0.5, 0.78];
  const HOLD = [0.3, 0.82];
  const GLIDEW = [0.16, 0.7];
  const INK = "#07090c";
  const BONE = "#f3efe6";
  const OLIVE = "#8fa35a";
  const GOLD = "#e0b15a";
  const MUTE = "#8b9591";

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function loadBest() {
    try {
      return JSON.parse(localStorage.getItem("cskAnka") || "{}");
    } catch {
      return {};
    }
  }

  function saveBest(run) {
    const prev = loadBest();
    const next = {
      distance: Math.max(prev.distance || 0, run.distance),
      score: Math.max(prev.score || 0, run.score),
      tempo: Math.max(prev.tempo || 0, run.tempoBest),
    };
    localStorage.setItem("cskAnka", JSON.stringify(next));
    return next;
  }

  class Rise {
    constructor(canvas, hooks) {
      this.cv = canvas;
      this.ctx = canvas.getContext("2d");
      this.hooks = hooks;
      this.w = 360;
      this.h = 640;
      this.alive = true;
      this.raf = 0;
      this.last = 0;
      this.acc = 0;
      this.reset();
      this.onDown = (e) => this.pointerDown(e);
      this.onMove = (e) => this.pointerMove(e);
      this.onUp = (e) => this.pointerUp(e);
      this.onKey = (e) => this.key(e, true);
      this.onKeyUp = (e) => this.key(e, false);
      canvas.addEventListener("pointerdown", this.onDown);
      canvas.addEventListener("pointermove", this.onMove);
      canvas.addEventListener("pointerup", this.onUp);
      canvas.addEventListener("pointercancel", this.onUp);
      window.addEventListener("keydown", this.onKey);
      window.addEventListener("keyup", this.onKeyUp);
    }

    reset() {
      this.mode = "run";
      this.time = 0;
      this.altitude = 0;
      this.gained = 0;
      this.score = 0;
      this.feathers = 0;
      this.combo = 0;
      this.maxCombo = 0;
      this.breaths = 3;
      this.rise = 10.5;
      this.lane = 1;
      this.x = 0.5;
      this.hold = false;
      this.phase = "glide";
      this.phaseT = 0;
      this.tempo = 0;
      this.tempoOn = false;
      this.tempoRun = 0;
      this.tempoBest = 0;
      this.dashT = 0;
      this.dashCd = 0;
      this.invuln = 0.8;
      this.laneArm = 0;
      this.crashT = 0;
      this.judged = 0;
      this.goods = 0;
      this.ents = [];
      this.nextM = 28;
      this.nextCorridor = 200;
      this.keys = new Set();
      this.pointers = new Map();
      this.swipeX = 0;
    }

    destroy() {
      this.alive = false;
      cancelAnimationFrame(this.raf);
      this.cv.removeEventListener("pointerdown", this.onDown);
      this.cv.removeEventListener("pointermove", this.onMove);
      this.cv.removeEventListener("pointerup", this.onUp);
      this.cv.removeEventListener("pointercancel", this.onUp);
      window.removeEventListener("keydown", this.onKey);
      window.removeEventListener("keyup", this.onKeyUp);
    }

    resize() {
      const r = this.cv.parentElement.getBoundingClientRect();
      this.w = Math.max(280, r.width);
      this.h = Math.max(420, r.height);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      this.cv.width = Math.round(this.w * dpr);
      this.cv.height = Math.round(this.h * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    start() {
      this.resize();
      this.last = performance.now();
      const loop = (now) => {
        if (!this.alive) return;
        const frame = Math.min(0.05, (now - this.last) / 1000);
        this.last = now;
        this.acc += frame;
        let guard = 0;
        while (this.acc >= 1 / 60 && guard++ < 5) {
          this.update(1 / 60);
          this.acc -= 1 / 60;
        }
        this.draw();
        this.hooks.hud(this.snap());
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    }

    snap() {
      return {
        distance: this.gained,
        tempo: this.tempo,
        breaths: this.breaths,
        dash: this.dashCd <= 0 && this.dashT <= 0,
        mode: this.mode,
      };
    }

    pointerDown(e) {
      if (this.mode !== "run") return;
      this.cv.setPointerCapture(e.pointerId);
      const x = e.clientX;
      this.pointers.set(e.pointerId, x);
      this.swipeX = x;
      this.hold = true;
    }

    pointerMove(e) {
      const prev = this.pointers.get(e.pointerId);
      if (prev == null || this.mode !== "run") return;
      const dx = e.clientX - this.swipeX;
      if (Math.abs(dx) > 28) {
        this.shift(dx > 0 ? 1 : -1);
        this.swipeX = e.clientX;
      }
      this.pointers.set(e.pointerId, e.clientX);
    }

    pointerUp(e) {
      this.pointers.delete(e.pointerId);
      this.hold = this.pointers.size > 0 || this.keys.has("Space");
    }

    key(e, down) {
      if (e.code === "Space" || e.code.startsWith("Arrow")) e.preventDefault();
      if (down) this.keys.add(e.code);
      else this.keys.delete(e.code);
      if (down && (e.code === "ShiftLeft" || e.code === "ShiftRight" || e.code === "KeyK")) this.dash();
      if (e.code === "KeyA" || e.code === "ArrowLeft") down && this.shift(-1);
      if (e.code === "KeyD" || e.code === "ArrowRight") down && this.shift(1);
      this.hold = this.pointers.size > 0 || this.keys.has("Space") || this.keys.has("KeyW") || this.keys.has("ArrowUp");
    }

    shift(dir) {
      if (this.laneArm > 0 || this.mode !== "run") return;
      const next = clamp(this.lane + dir, 0, 2);
      if (next === this.lane) return;
      this.lane = next;
      this.laneArm = 0.12;
    }

    dash() {
      if (this.mode !== "run" || this.dashCd > 0 || this.dashT > 0) return;
      this.dashT = 0.42;
      this.dashCd = this.tempoOn ? 1.55 : 2.15;
    }

    py() {
      return this.h * 0.68;
    }

    sy(m) {
      return this.py() - (m - this.altitude) * 11;
    }

    mult() {
      const base = this.combo >= 30 ? 4 : this.combo >= 15 ? 3 : this.combo >= 8 ? 2 : this.combo >= 3 ? 1.5 : 1;
      return this.tempoOn ? base * 1.35 : base;
    }

    judge(seconds, window) {
      if (seconds < 0.12) return;
      this.judged += 1;
      if (seconds >= window[0] && seconds <= window[1]) {
        this.goods += 1;
        const prev = this.tempo;
        this.tempo = Math.min(1, this.tempo + 0.17);
        if (this.tempo >= 1 && prev < 1) this.tempoOn = true;
      } else {
        this.tempo = Math.max(0, this.tempo - 0.12);
        if (this.tempo < 0.98) this.tempoOn = false;
      }
    }

    update(dt) {
      if (this.mode === "done") return;
      this.time += dt;
      this.laneArm = Math.max(0, this.laneArm - dt);
      const holding = this.hold;
      const next = holding ? "hold" : "glide";
      if (next !== this.phase) {
        this.judge(this.phaseT, this.phase === "hold" ? HOLD : GLIDEW);
        this.phase = next;
        this.phaseT = 0;
      } else this.phaseT += dt;

      if (this.mode === "crash") {
        this.crashT -= dt;
        this.rise = Math.max(4, this.rise * Math.exp(-1.05 * dt));
        this.altitude += this.rise * dt;
        this.gained += this.rise * dt;
        this.score += this.rise * dt * this.mult() * 0.5;
        if (this.crashT <= 0) this.finish();
        return;
      }

      const target = (holding ? 19 : 10.5) * (this.dashT > 0 ? 1.45 : 1);
      this.rise += (target - this.rise) * (1 - Math.exp(-4.4 * dt));
      this.dashT = Math.max(0, this.dashT - dt);
      this.dashCd = Math.max(0, this.dashCd - dt * (this.tempoOn ? 1.28 : 1));
      this.invuln = Math.max(0, this.invuln - dt);
      if (this.tempoOn) {
        this.tempoRun += dt;
        this.tempoBest = Math.max(this.tempoBest, this.tempoRun);
      } else this.tempoRun = 0;
      this.x += (LANES[this.lane] - this.x) * (1 - Math.exp(-16 * dt));
      this.altitude += this.rise * dt;
      this.gained += this.rise * dt;
      this.score += this.rise * dt * this.mult();
      this.spawn();
      this.collide();
    }

    spawn() {
      const ahead = this.altitude + this.h / 11 + 24;
      let guard = 0;
      while (this.nextM < ahead && guard++ < 6) {
        if (this.nextM >= this.nextCorridor) {
          for (let i = 0; i < 4; i++) {
            this.ents.push({ kind: "bar", m: this.nextM + i * 16, x: 0.5, gap: 0.42, belt: 1 });
          }
          this.ents.push({ kind: "feather", m: this.nextM + 28, x: 0.5, taken: false });
          this.nextM += 78;
          this.nextCorridor += 200;
          continue;
        }
        const lane = Math.floor(Math.random() * 3);
        const x = LANES[lane];
        this.ents.push({ kind: "bar", m: this.nextM, x, gap: 0.34, belt: 0 });
        this.ents.push({ kind: "feather", m: this.nextM - 8, x, taken: false });
        this.nextM += 30 * (0.9 + Math.random() * 0.2);
      }
      this.ents = this.ents.filter((e) => this.altitude - e.m < 26);
    }

    collide() {
      const px = this.x * this.w;
      const py = this.py();
      const pr = Math.max(14, this.w * 0.03);
      for (const e of this.ents) {
        const y = this.sy(e.m);
        if (e.kind === "feather") {
          if (e.taken) continue;
          const dx = px - e.x * this.w;
          const dy = py - y;
          if (dx * dx + dy * dy < (pr + 14) * (pr + 14)) {
            e.taken = true;
            this.combo += 1;
            this.maxCombo = Math.max(this.maxCombo, this.combo);
            this.feathers += 1;
            this.score += 28 * this.mult();
          }
          continue;
        }
        if (Math.abs(py - y) > 18 + pr * 0.3) continue;
        const half = (e.gap * this.w) / 2;
        const hit = px < e.x * this.w - half || px > e.x * this.w + half;
        if (!hit || this.dashT > 0 || this.invuln > 0) continue;
        this.hurt();
        break;
      }
    }

    hurt() {
      this.combo = 0;
      this.tempo = 0;
      this.tempoOn = false;
      this.breaths -= 1;
      this.invuln = 1.25;
      if (this.breaths > 0) return;
      this.mode = "crash";
      this.crashT = 1.2;
    }

    finish() {
      this.mode = "done";
      const rhythm = this.judged ? Math.round((this.goods / this.judged) * 100) : 0;
      const best = saveBest({
        distance: this.gained,
        score: this.score,
        tempoBest: this.tempoBest,
      });
      this.hooks.over({
        distance: Math.round(this.gained),
        score: Math.round(this.score),
        feathers: this.feathers,
        combo: this.maxCombo,
        rhythm,
        tempo: this.tempoBest.toFixed(1),
        katki: Math.round(this.score / 10),
        best: Math.round(best.distance || 0),
      });
    }

    draw() {
      const ctx = this.ctx;
      const { w, h } = this;
      ctx.fillStyle = INK;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(213,226,176,0.14)";
      ctx.setLineDash([4, 18]);
      for (const lane of LANES) {
        ctx.beginPath();
        ctx.moveTo(lane * w, 0);
        ctx.lineTo(lane * w, h);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      for (const e of this.ents) {
        const y = this.sy(e.m);
        if (y < -40 || y > h + 40) continue;
        if (e.kind === "feather") {
          if (e.taken) continue;
          ctx.fillStyle = GOLD;
          ctx.fillRect(e.x * w - 1, y - 12, 2, 24);
          continue;
        }
        const half = (e.gap * w) / 2;
        const x = e.x * w;
        ctx.fillStyle = "rgba(7,9,12,0.92)";
        ctx.strokeStyle = e.belt ? OLIVE : "rgba(224,177,90,0.7)";
        const slab = (sx, sw) => {
          if (sw < 2) return;
          ctx.fillRect(sx, y - 8, sw, 16);
          ctx.strokeRect(sx, y - 8, sw, 16);
        };
        slab(0, x - half);
        slab(x + half, w - (x + half));
      }
      const bx = this.x * w;
      const by = this.py();
      ctx.save();
      ctx.translate(bx, by);
      ctx.fillStyle = this.dashT > 0 ? BONE : OLIVE;
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.lineTo(18, 8);
      ctx.lineTo(0, 2);
      ctx.lineTo(-18, 8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = BONE;
      ctx.font = "600 28px Oswald, sans-serif";
      ctx.fillText(String(Math.floor(this.gained)), 16, 36);
      ctx.fillStyle = MUTE;
      ctx.font = "12px Manrope, sans-serif";
      ctx.fillText(this.tempoOn ? "TEMPO" : "RİTİM", 16, 54);
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(16, 62, 90, 4);
      ctx.fillStyle = this.tempoOn ? GOLD : OLIVE;
      ctx.fillRect(16, 62, 90 * this.tempo, 4);
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i < this.breaths ? OLIVE : "rgba(255,255,255,0.15)";
        ctx.fillRect(w - 28 - i * 14, 28, 8, 18);
      }
      if (this.mode === "crash") {
        ctx.fillStyle = BONE;
        ctx.font = "600 18px Oswald, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("SON SÜZÜLME", w / 2, h * 0.38);
        ctx.textAlign = "left";
      }
    }
  }

  function mountAnka(host, onExit) {
    host.classList.add("anka-stage");
    host.innerHTML = `
      <div class="anka-fit">
        <canvas id="ankaCv"></canvas>
        <button type="button" id="ankaBack" class="anka-back">Geri</button>
        <button type="button" id="ankaDash" class="anka-dash">DASH</button>
        <div id="ankaOver" class="anka-over" hidden>
          <p class="anka-kicker">SET BİTTİ</p>
          <h2 id="ankaTitle">0 m</h2>
          <p id="ankaLine"></p>
          <button type="button" id="ankaRetry" class="btn">TEKRAR</button>
          <button type="button" id="ankaLeave" class="btn ghost">Play</button>
        </div>
      </div>`;
    const canvas = host.querySelector("#ankaCv");
    const over = host.querySelector("#ankaOver");
    const dashBtn = host.querySelector("#ankaDash");
    let run = null;

    function boot() {
      over.hidden = true;
      if (run) run.destroy();
      run = new Rise(canvas, {
        hud(s) {
          dashBtn.disabled = !s.dash;
          dashBtn.style.opacity = s.dash ? "1" : "0.35";
        },
        over(result) {
          over.hidden = false;
          host.querySelector("#ankaTitle").textContent = result.distance + " m";
          host.querySelector("#ankaLine").textContent =
            "Ritmin: %" + result.rhythm +
            " · En uzun tempo: " + result.tempo +
            " sn · Kulüp katkın: +" + result.katki;
        },
      });
      run.start();
    }

    dashBtn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (run) run.dash();
    });
    host.querySelector("#ankaBack").onclick = () => onExit();
    host.querySelector("#ankaLeave").onclick = () => onExit();
    host.querySelector("#ankaRetry").onclick = boot;
    boot();
    const onResize = () => run && run.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (run) run.destroy();
      host.classList.remove("anka-stage");
    };
  }

  window.mountAnka = mountAnka;
})();
