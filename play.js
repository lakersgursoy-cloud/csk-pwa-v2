/* ÇSK PLAY — keşif ekranı */
function renderPlay(container, user) {
  container.innerHTML = `
    <div class="card">
      <h2>Anka’nın Yükselişi</h2>
      <p class="mut">Tut. Zamanında bırak. Kaydır: şerit. Uygulamanın içinde.</p>
      <button class="btn" id="ankaOpen" type="button">BAŞLA</button>
    </div>
    <div class="mascot-line">${kankaSpeak("home")}</div>
    <div class="card">
      <h2>Maskotlar</h2>
      <div class="liste">
        <div class="row"><span>kAnka</span><span class="mut">Ana maskot</span></div>
        <div class="row"><span>Kulvar</span><span class="mut">Tempo / yoklama</span></div>
        <div class="row"><span>Dalga</span><span class="mut">Yeni üye / nefes</span></div>
        <div class="row"><span>Çivi</span><span class="mut">Takım / kaptan</span></div>
        <div class="row"><span>Kor</span><span class="mut">Passport / damga</span></div>
      </div>
    </div>
    <div class="card">
      <h2>Teknik Lab</h2>
      <p class="mut">Koçun verdiği ödevleri izle.</p>
      <a href="./teknik-lab/" class="btn" style="display:block;text-align:center;text-decoration:none;line-height:46px">Teknik Lab’a git</a>
    </div>
    <div class="card">
      <h2>Yaşayan Müze VR</h2>
      <p class="mut">1453 İstanbul’a gir. Meta Quest 3 tarayıcısında VR olarak açılır.</p>
      <a href="./yasayan-muze/" class="btn" style="display:block;text-align:center;text-decoration:none;line-height:46px">Müzeye gir</a>
    </div>
  `;
  const open = document.getElementById("ankaOpen");
  if (open) open.onclick = () => { if (window.openAnka) window.openAnka(); };
}
