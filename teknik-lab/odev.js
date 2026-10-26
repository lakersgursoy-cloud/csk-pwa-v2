/* ÇSK Teknik Lab — öğrenci ödev bandı.
   Koç panelinden işaretlenen stil/sahne, öğrencinin kişisel kodu (?k=KOD) ile açılır.
   Kod cihazda hatırlanır; Wix uygulamasının içinde bir kez girilmesi yeter. */
(function () {
  var ANAHTAR = 'cskOdevKodlari';
  var GUN = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

  function oku() { try { return JSON.parse(localStorage.getItem(ANAHTAR) || '[]') || []; } catch (e) { return []; } }
  function yaz(l) { try { localStorage.setItem(ANAHTAR, JSON.stringify(l)); } catch (e) {} }
  function temiz(s) { return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
  function e(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  var ilkAcilis = true;
  var kodlar = oku();
  var q = new URLSearchParams(location.search).get('k');
  if (q) {
    q.split(',').map(temiz).filter(Boolean).forEach(function (k) { if (kodlar.indexOf(k) < 0) kodlar.unshift(k); });
    yaz(kodlar);
  }

  var css = document.createElement('style');
  css.textContent = [
    '.odev{margin:12px max(16px,env(safe-area-inset-right,0px)) 0 max(16px,env(safe-area-inset-left,0px));border:1px solid var(--brand-hi,#22a872);background:linear-gradient(180deg,#0f2e22,#0b2219);border-radius:12px;padding:12px 14px;display:grid;gap:10px;color:var(--fg,#eef7f2);font-family:var(--body,system-ui)}',
    '.odev-h{display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap}',
    '.odev-h b{font-family:var(--display,sans-serif);font-size:18px;letter-spacing:.06em;text-transform:uppercase}',
    '.odev-h span{font-family:var(--mono,monospace);font-size:12px;color:var(--muted,#9cc0af)}',
    '.odev-l{display:flex;flex-wrap:wrap;gap:8px}',
    '.odev-b{border:1px solid var(--line2,#2c5e4a);background:var(--bg2,#0a1c15);color:inherit;border-radius:999px;padding:8px 14px;min-height:40px;font:inherit;font-weight:600;display:inline-flex;gap:8px;align-items:center;cursor:pointer}',
    '.odev-b[aria-pressed="true"]{background:#fff;color:#04100b;border-color:#fff}',
    '.odev-b i{font-style:normal;font-size:11px;opacity:.7}',
    '.odev-not{margin:0;padding:8px 10px;border-left:3px solid var(--brand-hi,#22a872);background:rgba(0,0,0,.18);border-radius:0 8px 8px 0;font-size:14px}',
    '.odev-yok{margin:0;color:var(--muted,#9cc0af);font-size:13px}',
    '.odev-kod{display:flex;gap:8px;align-items:center;flex-wrap:wrap}',
    '.odev-kod input{flex:1 1 120px;min-width:0;height:40px;border-radius:8px;border:1px solid var(--line2,#2c5e4a);background:var(--bg2,#0a1c15);color:inherit;padding:0 10px;font:16px var(--mono,monospace);letter-spacing:.15em;text-transform:uppercase}',
    '.odev-kod button,.odev-ac{height:40px;border-radius:8px;border:1px solid var(--brand-hi,#22a872);background:var(--brand,#0f6b47);color:#fff;padding:0 14px;font:inherit;font-weight:600;cursor:pointer}',
    '.odev-ac{position:fixed;right:max(12px,env(safe-area-inset-right,0px));bottom:max(12px,env(safe-area-inset-bottom,0px));z-index:40;border-radius:999px;box-shadow:0 6px 18px rgba(0,0,0,.4)}',
    '.odev-x{background:none;border:0;color:var(--muted,#9cc0af);font:inherit;font-size:12px;text-decoration:underline;cursor:pointer;padding:0}'
  ].join('');
  document.head.appendChild(css);

  var kutu = document.createElement('section');
  kutu.className = 'odev'; kutu.hidden = true; kutu.setAttribute('aria-live', 'polite');
  document.body.insertBefore(kutu, document.body.firstChild);
  var acBtn = document.createElement('button');
  acBtn.className = 'odev-ac'; acBtn.type = 'button'; acBtn.textContent = 'Ödev kodum'; acBtn.hidden = true;
  document.body.appendChild(acBtn);
  acBtn.onclick = function () { kodFormu(); kutu.hidden = false; acBtn.hidden = true; window.scrollTo(0, 0); };

  function stilAd(st) { try { return STROKES[st].name; } catch (x) { return st; } }
  function etiket(o) {
    try {
      var sc = STROKES[o.stil].scenes.find(function (s) { return s.id === o.sahne; });
      if (o.konu && sc.topics) { var t = sc.topics.find(function (x) { return x[0] === o.konu; }); if (t) return stilAd(o.stil) + ' · ' + t[1]; }
      return stilAd(o.stil) + ' · ' + sc.name;
    } catch (x) { return 'Sahne'; }
  }
  function zaman(iso) {
    var d = new Date(iso), bugun = new Date(), yarin = new Date(); yarin.setDate(bugun.getDate() + 1);
    var gun = d.toDateString() === bugun.toDateString() ? 'Bugün' : d.toDateString() === yarin.toDateString() ? 'Yarın' : GUN[d.getDay()] + ' ' + d.getDate() + '.' + (d.getMonth() + 1);
    return gun + ' ' + d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  }
  function git(o, btn) {
    try {
      if (typeof selectStroke === 'function') selectStroke(o.stil, { noScene: true });
      if (typeof selectScene === 'function') selectScene(o.sahne, o.konu || null);
    } catch (x) { console.error(x); }
    Array.prototype.forEach.call(kutu.querySelectorAll('.odev-b'), function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
  }

  function kodFormu(mesaj) {
    kutu.innerHTML = '<div class="odev-h"><b>Antrenman ödevi</b></div>' +
      (mesaj ? '<p class="odev-yok">' + e(mesaj) + '</p>' : '<p class="odev-yok">Koçunun verdiği öğrenci kodunu bir kez gir, ödevin her açılışta burada görünsün.</p>') +
      '<form class="odev-kod"><input name="k" maxlength="8" autocomplete="off" placeholder="KOD" aria-label="Öğrenci kodu"><button>Göster</button></form>';
    kutu.querySelector('form').onsubmit = function (ev) {
      ev.preventDefault();
      var k = temiz(this.k.value); if (!k) return;
      if (kodlar.indexOf(k) < 0) kodlar.unshift(k); yaz(kodlar); ilkAcilis = true; yukle();
    };
  }

  function goster(veri) {
    var od = (veri && veri.odevler) || {};
    var simdi = Date.now();
    var aktif = kodlar.map(function (k) { return { kod: k, o: od[k] }; })
      .filter(function (x) { return x.o && x.o.ogeler && x.o.ogeler.length && Date.parse(x.o.antrenman) > simdi - 4 * 3600e3; });
    if (!aktif.length) {
      if (!kodlar.length) { kutu.hidden = true; acBtn.hidden = false; return; }
      kutu.hidden = false; acBtn.hidden = true;
      kutu.innerHTML = '<div class="odev-h"><b>Antrenman ödevi</b><button class="odev-x" type="button">Kodu değiştir</button></div><p class="odev-yok">Şu an işaretlenmiş bir ödev yok. Koçun işaretleyince burada görünecek.</p>';
      kutu.querySelector('.odev-x').onclick = function () { kodlar = []; yaz(kodlar); kodFormu(); };
      return;
    }
    kutu.hidden = false; acBtn.hidden = true;
    var html = '', ilk = null, cokKod = aktif.length > 1;
    aktif.forEach(function (x, i) {
      html += '<div class="odev-h"><b>' + (cokKod ? 'Kod ' + e(x.kod) + ' · ' : '') + 'Antrenman ödevi</b><span>' + e(zaman(x.o.antrenman)) + '</span></div>';
      html += '<div class="odev-l">' + x.o.ogeler.map(function (o, j) {
        if (!ilk) ilk = [i, j];
        return '<button class="odev-b" type="button" data-i="' + i + '" data-j="' + j + '">▶ ' + e(etiket(o)) + '</button>';
      }).join('') + '</div>';
      if (x.o.not) html += '<p class="odev-not">' + e(x.o.not) + '</p>';
    });
    html += '<div><button class="odev-x" type="button" data-kod>Kodu değiştir</button></div>';
    kutu.innerHTML = html;
    kutu.onclick = function (ev) {
      var b = ev.target.closest('.odev-b');
      if (b) { git(aktif[+b.dataset.i].o.ogeler[+b.dataset.j], b); return; }
      if (ev.target.closest('[data-kod]')) { kodlar = []; yaz(kodlar); kodFormu(); }
    };
    if (ilk && ilkAcilis) git(aktif[ilk[0]].o.ogeler[ilk[1]], kutu.querySelector('.odev-b'));
    ilkAcilis = false;
  }

  function yukle() {
    fetch('veri/odev.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(goster)
      .catch(function () { if (kodlar.length) kodFormu('Ödev listesi şu an alınamadı. İnternet bağlantını kontrol edip sayfayı yenile.'), kutu.hidden = false; });
  }
  yukle();
  document.addEventListener('visibilitychange', function () { if (!document.hidden) yukle(); });
})();
