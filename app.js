/* ÇSK PWA V2 — ana uygulama */
const appEl = document.getElementById("app");
let currentUser = null;
let currentScreen = "home";
let ankaStop = null;

window.openAnka = () => {
  currentScreen = "anka";
  render();
};

function loadUser() {
  try { return JSON.parse(localStorage.getItem("cskUser") || "null"); } catch { return null; }
}
function saveUser(u) {
  localStorage.setItem("cskUser", JSON.stringify(u));
}
function logout() {
  localStorage.removeItem("cskUser");
  currentUser = null;
  render();
}

function renderLogin() {
  appEl.innerHTML = `
    <div class="shell">
      <header><div class="hd"><h1>ÇSK <b>V2</b></h1></div></header>
      <main style="justify-content:center;padding-top:40px">
        <div class="card" style="text-align:center">
          <div class="nm">Çukurambar Spor Kulübü</div>
          <p class="mut">Bağımsız ekosistem</p>
          <input id="email" type="email" placeholder="E-posta" value="nil@cukurambar.com" autocomplete="email" />
          <button class="btn" id="loginBtn">Giriş Yap</button>
          <p class="mut" style="margin-top:12px">Demo: yigit@ · sedanur@ · nil@ · pinar@ · veli.ada@cukurambar.com</p>
        </div>
      </main>
    </div>
  `;
  document.getElementById("loginBtn").onclick = () => {
    const email = document.getElementById("email").value.trim();
    const user = findUser(email);
    if (!user) { alert("Bu e-posta demo hesaplarında yok."); return; }
    currentUser = user;
    saveUser(user);
    render();
  };
}

function renderShell() {
  if (ankaStop) {
    ankaStop();
    ankaStop = null;
  }
  const u = currentUser;
  const marked = currentScreen === "anka" ? "play" : currentScreen;
  const mascot = pickMascot(u, currentScreen);
  appEl.innerHTML = `
    <div class="shell">
      <header>
        <div class="hd">
          <h1>ÇSK <b>V2</b></h1>
          <span class="user-chip">${u.name} · ${u.title}</span>
        </div>
        <nav>
          <button data-s="home" aria-current="${marked==='home'?'page':'false'}">Ana</button>
          <button data-s="antrenman" aria-current="${marked==='antrenman'?'page':'false'}">Antrenman</button>
          <button data-s="takim" aria-current="${marked==='takim'?'page':'false'}">Takım</button>
          <button data-s="play" aria-current="${marked==='play'?'page':'false'}">Play</button>
        </nav>
      </header>
      <main id="main"></main>
      <div class="bottom">
        <button class="btn ghost" id="logout">Çıkış</button>
      </div>
    </div>
  `;

  document.querySelectorAll("nav button").forEach(btn => {
    btn.onclick = () => { currentScreen = btn.dataset.s; render(); };
  });
  document.getElementById("logout").onclick = logout;

  const main = document.getElementById("main");
  if (currentScreen === "anka") {
    ankaStop = mountAnka(main, () => {
      currentScreen = "play";
      render();
    });
    return;
  }
  if (currentScreen === "play") {
    renderPlay(main, u);
  } else if (currentScreen === "antrenman") {
    main.innerHTML = `
      <div class="mascot-line">${mascotLine(mascot, "home")}</div>
      <div class="card"><h2>Sıradaki Antrenmanlar</h2>
        <div class="liste">${TRAININGS.map(t => `
          <div class="row">
            <div><b>${t.date}</b> ${t.time}<br><span class="mut">${t.place} · ${t.type}</span></div>
            <span class="mut">${t.coach}</span>
          </div>`).join("")}
        </div>
      </div>
    `;
  } else if (currentScreen === "takim") {
    main.innerHTML = `
      <div class="card"><h2>Kadro</h2>
        <div class="liste">${ATHLETES.map(a => `
          <div class="row">
            <div><b>#${a.number}</b> ${a.name}</div>
            <span class="mut">${a.group}</span>
          </div>`).join("")}
        </div>
      </div>
    `;
  } else {
    main.innerHTML = `
      <div class="mascot-line">${kankaSpeak("home")}</div>
      <div class="card">
        <p class="mut">Merhaba</p>
        <div class="nm">${u.name}</div>
        <p>${u.role === "veli" ? "Çocuğun: " + (u.child || "") : u.title}</p>
      </div>
      <div class="card">
        <h2>Bugün</h2>
        <p>${TRAININGS[0].date} · ${TRAININGS[0].time}<br><span class="mut">${TRAININGS[0].place}</span></p>
      </div>
      <div class="card">
        <h2>Kulüp</h2>
        ${NEWS.map(n => `<p><b>${n.title}</b><br><span class="mut">${n.text}</span></p>`).join("")}
      </div>
    `;
  }
}

function render() {
  if (!currentUser) {
    currentUser = loadUser();
  }
  if (!currentUser) {
    renderLogin();
  } else {
    renderShell();
  }
}

render();
