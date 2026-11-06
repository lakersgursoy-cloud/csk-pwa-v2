import * as THREE from 'three';
import { advance, initialState, CHOICES } from './story.js';
import { buildMuseum, build1453, makeHand } from './worlds.js';
import { Panel } from './ui.js';
import { Sound } from './audio.js';

const $ = (id) => document.getElementById(id), TEST = new URLSearchParams(location.search).has('test');
const load = () => { try { return JSON.parse(localStorage.getItem('muze-v1')) || {}; } catch { return {}; } };
const save = (v) => { try { localStorage.setItem('muze-v1', JSON.stringify(v)); } catch { /* yalnızca kolaylık */ } };

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.xr.enabled = true; renderer.xr.setReferenceSpaceType('local-floor'); renderer.xr.setFoveation(1);
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, .05, 400), rig = new THREE.Group();
camera.position.y = 1.62; rig.add(camera); scene.add(rig);
const museum = buildMuseum(), siege = build1453(); scene.add(museum.group, siege.group); siege.group.visible = false;
const sound = new Sound();
let world = museum, state = initialState(), mode = load().mode === 'akici' ? 'akici' : 'isinlanma', busy = false, time = 0;
const saved = load(); if (saved.trophy) state.trophy = saved.trophy;

// Kararma küresi: sahne geçişleri kameraya bağlıdır.
const veil = new THREE.Mesh(new THREE.SphereGeometry(.3, 12, 8), new THREE.MeshBasicMaterial({ color: '#000', side: THREE.BackSide, transparent: true, opacity: 1, depthTest: false, depthWrite: false, fog: false }));
veil.renderOrder = 999; camera.add(veil);
let fadeJob = null;
const fade = (to, s) => new Promise(res => { fadeJob = { from: veil.material.opacity, to, s, t: 0, res }; });
const wait = (s) => new Promise(r => { timers.push({ t: s, r }); }); const timers = [];

// Altyazı ve seçim panelleri dünyada sabit durur; rahatsız edici biçimde kafaya kilitlenmez.
const sub = new Panel(1.35, .5); sub.visible = false; scene.add(sub);
const headPos = new THREE.Vector3(), headDir = new THREE.Vector3();
function head() { camera.getWorldPosition(headPos); camera.getWorldDirection(headDir); headDir.y = 0; headDir.normalize(); }
function place(o, dist, dy = -.2, side = 0) { head(); o.position.copy(headPos).addScaledVector(headDir, dist); o.position.y += dy; o.position.x += -headDir.z * side; o.position.z += headDir.x * side; o.lookAt(headPos.x, o.position.y, headPos.z); }
let subT = 0, lastSay = '';
function say(text, title, secs = 6) { sub.set(text, title); place(sub, 1.8, -.34); sub.visible = true; subT = secs; lastSay = text; }
const hint = (t) => { $('hud').textContent = renderer.xr.isPresenting ? '' : t; };

// Etkileşim
const items = [];
const on = (hit, label, fn, active = () => true) => { items.push({ hit, label, fn, active }); };
function tick() { museum.comfort.set(`Hareket: ${mode === 'akici' ? 'Akıcı' : 'Işınlanma'}`, 'değiştirmek için dokun'); }
tick();
on(museum.comfort, 'Hareket biçimi', () => { mode = mode === 'akici' ? 'isinlanma' : 'akici'; save({ ...load(), mode }); tick(); sound.chime(); }, () => world === museum);
on(museum.door1453.userData.hit, '1453 · İstanbul', () => openDoor(), () => state.stage === 'museum' && !busy);
on(museum.door1789.userData.hit, '1789 · Paris', () => { say('Paris kapısı henüz açılmıyor. Bu prototipte yalnızca 1453 oynanabilir.', '1789'); }, () => state.stage === 'museum' && !busy);
on(museum.pedHit, 'Tarihî harita kopyası', () => replay(), () => world === museum && !!state.trophy && !busy);
on(siege.helperHit, 'Topçu yardımcısına dokun', () => memoryShift(), () => state.stage === 'traveller' && !busy);
on(siege.wadHit, 'Ahşap tapa', () => { go('takeWad'); holdWad(); }, () => state.stage === 'wakeInCamp');
on(siege.gunHit, 'Tapayı topa ver', () => { go('deliverWad'); }, () => state.stage === 'carryWad');
on(siege.linHit, 'Fitili ateşe değdir', () => go('fire'), () => state.stage === 'cannon' && !busy);
on(siege.mapHit, 'Haritayı al', () => go('returnToMuseum'), () => state.stage === 'aftermath' && siege.mapItem.visible && !busy);
const choiceUi = Object.keys(CHOICES).map((id, i) => { const p = new Panel(.95, .32, { size: 58 }).set(CHOICES[id].label); p.visible = false; scene.add(p); on(p, CHOICES[id].label, () => go('choose', id), () => state.stage === 'choice'); p.userData.side = i ? .54 : -.54; return p; });

function go(event, payload) { const prev = state; state = advance(state, event, payload); if (event !== 'listen' && state !== prev) enter(state.stage); }
function setWorld(w, x, z, faceX, faceZ) {
  world = w; museum.group.visible = w === museum; siege.group.visible = w === siege; scene.fog = w.fog; scene.background = new THREE.Color(w.bg);
  const yaw = Math.atan2(x - faceX, z - faceZ);
  if (renderer.xr.isPresenting) { // Başın odadaki konumu ve yönü hesaba katılır; oyuncu tam hedef noktaya, hedefe bakarak gelir.
    const local = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ').y; rig.rotation.y = yaw - local;
    const off = new THREE.Vector3(camera.position.x, 0, camera.position.z).applyAxisAngle(UP, rig.rotation.y); rig.position.set(x - off.x, 0, z - off.z);
  } else { rig.position.set(x, 0, z); rig.rotation.y = yaw; pitch = 0; camera.rotation.x = 0; }
}
const hands = [];
const setPersona = (v) => hands.forEach(h => h.userData.setPersona(v));
function holdWad() { const h = hands.find(h => h.visible && h.parent) || hands[0]; h.add(siege.wad); siege.wad.position.set(0, .05, -.1); siege.wad.rotation.set(0, 0, 0); siege.wadGlow.visible = false; }

async function openDoor() {
  busy = true; const d = museum.door1453.userData; sound.chime(); d.motion = 1; say('Tablodaki kalabalık hareket etmeye başladı.', '1453', 3);
  await wait(2); await fade(1, .7); go('doorIstanbul'); busy = false;
}
async function memoryShift() {
  busy = true; siege.helperGlow.visible = false; say('Gözlerin kararıyor. Birinin kalbi seninkinin yerine atıyor.', 'Hafıza Geçişi', 3); sound.heartbeat();
  await wait(1.6); await fade(1, .9); go('touchSoldier'); await wait(1.1); await fade(0, 1.3); busy = false;
}
async function replay() {
  busy = true; await fade(.86, .5); sound.cannon(); const c = CHOICES[state.trophy.choice]; say(c ? c.memory : 'Topun gölgesinde geçen bir akşam.', 'Anı · Mayıs 1453', 4.5); await wait(4.5); await fade(0, .8); busy = false;
}
function resetSiege() {
  const s = siege; s.helper.visible = true; s.helperGlow.visible = true; s.wadGlow.visible = true; s.group.add(s.wad); s.wad.position.set(-5.2, .84, -4.2); s.wad.visible = true;
  s.gunGlow.visible = false; s.linstock.visible = false; s.mapItem.visible = false; s.mapGlow.visible = false; heard.clear();
}
const heard = new Set();
async function enter(stage) {
  const s = siege;
  if (stage === 'traveller') {
    resetSiege(); setPersona(false); setWorld(siege, 0, -19.5, 0, -45); sound.ambient('camp'); hands.forEach(h => h.visible = true);
    await fade(0, 1.2); say('Mayıs 1453. Surların önündesin. Kimse seni göremiyor.', 'Zaman Yolcusu', 7); hint('Yakındaki askerleri dinle, sonra parlayan yardımcıya dokun.');
    await wait(7); if (state.stage === 'traveller' && !busy) say('Askerlerin yanına git ve onları dinle. Hazır olunca ışıldayan topçu yardımcısına dokun.', 'Zaman Yolcusu', 8);
  } else if (stage === 'wakeInCamp') {
    s.helper.visible = false; setPersona(true); setWorld(siege, -6.6, -1.4, 3, -9); hint('Sandıktaki ahşap tapayı al.');
    await wait(.8); say('Gözlerini açtın. Bu eller artık senin. Usta bağırıyor: “Tapayı getir!”', 'Topçu Yardımcısı', 8);
  } else if (stage === 'carryWad') {
    s.gunGlow.visible = true; hint('Tapayı büyük topun yanına götür.'); say('Önce barut, sonra tapa, sonra taş gülle. Tapayı topa götür.', 'Topçu Yardımcısı', 7);
  } else if (stage === 'choice') {
    s.wad.visible = false; s.gunGlow.visible = false; hint('');
    say('Yusuf elini yaktı ve seni çağırıyor. Usta da yanından ayrılmamanı istiyor.', 'Kararın', 60);
    choiceUi.forEach(p => { p.visible = true; place(p, 1.7, -.72, p.userData.side); });
  } else if (stage === 'outcome') {
    choiceUi.forEach(p => { p.visible = false; }); say(CHOICES[state.choice].result, 'Sonuç', 6); await wait(6); go('outcomeDone');
  } else if (stage === 'cannon') {
    s.linstock.visible = true; say('Top yüklendi. Usta sana başıyla işaret ediyor.', 'Topçu Yardımcısı', 7); hint('Fitili ateşe değdir.');
  } else if (stage === 'aftermath') {
    busy = true; hint(''); fire(); await wait(3.5);
    say('Bu top bir günde ancak yedi kez ateşlenebiliyordu. Kuşatma 29 Mayıs 1453’te sona erecek. Senin kararın bunu değiştirmedi; yalnızca Yusuf’la hikâyeni değiştirdi.', 'Tarih', 9);
    await wait(9); s.mapItem.visible = true; s.mapGlow.visible = true; say('Sandığın üstünde eski bir harita kopyası duruyor.', 'Topçu Yardımcısı', 6); busy = false; hint('Haritayı al.');
  } else if (stage === 'museum') {
    busy = true; hint(''); await fade(1, 1); setPersona(false); hands.forEach(h => h.visible = false); setWorld(museum, 3, 4.2, 3, 1); sound.ambient('museum'); museum.door1453.userData.motion = 0;
    if (state.trophy) { save({ ...load(), trophy: state.trophy }); showTrophy(); }
    await fade(0, 1); say('Harita artık müzede. Ona dokunursan o anı yeniden canlanır.', 'Saat 00.24', 7); busy = false;
  }
}
function showTrophy() { museum.map.visible = true; museum.pedGlow.visible = true; }
if (state.trophy) showTrophy();

function fire() {
  const s = siege; sound.cannon(); s.flash.visible = true; flashT = .18; s.smoke.forEach((p, i) => { const wall = i > 5; p.position.copy(wall ? new THREE.Vector3(3 + i * .5, 7, -39.6) : s.muzzle); p.userData = { v: wall ? .9 : 2 + i * .3, age: wall ? -1.3 : 0, wall, dx: (i - 5) * .22 }; p.material.opacity = 0; p.scale.setScalar(wall ? 3 : 1.6); });
  pulse(1, 260);
}
let flashT = 0;

// Girdi
const ray = new THREE.Raycaster(), tmpM = new THREE.Matrix4(), controllers = [], hover = new Panel(.9, .19, { size: 76 }); hover.visible = false; scene.add(hover);
function pick(origin, dir) {
  ray.set(origin, dir); ray.far = 16; let best = null;
  for (const it of items) { if (!it.active() || !it.hit.visible) continue; if (it.hit.parent && !visibleChain(it.hit)) continue; const h = ray.intersectObject(it.hit, false)[0]; if (h && (!best || h.distance < best.d)) best = { it, d: h.distance, point: h.point }; }
  return best;
}
const visibleChain = (o) => { for (let p = o.parent; p; p = p.parent) if (p.visible === false) return false; return true; };
function pulse(v, ms) { for (const c of controllers) c.source?.gamepad?.hapticActuators?.[0]?.pulse?.(v, ms); }
const marker = new THREE.Mesh(new THREE.RingGeometry(.25, .33, 24), new THREE.MeshBasicMaterial({ color: '#8fd0ff', side: THREE.DoubleSide, fog: false })); marker.rotation.x = -Math.PI / 2; marker.visible = false; scene.add(marker);
const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]);
for (let i = 0; i < 2; i++) {
  const c = renderer.xr.getController(i), grip = renderer.xr.getControllerGrip(i), line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: '#ffe6b0' })), h = makeHand();
  h.visible = false; grip.add(h); hands.push(h); c.add(line); rig.add(c, grip);
  const st = { c, line, source: null, hover: null, aiming: false, turned: false, hitD: 3 };
  c.addEventListener('connected', e => { st.source = e.data; line.visible = e.data.targetRayMode !== 'gaze'; });
  c.addEventListener('disconnected', () => { st.source = null; });
  c.addEventListener('selectstart', () => { if (st.hover) { st.hover.it.fn(); pulse(.5, 40); } });
  controllers.push(st);
}
// Masaüstü elleri
const dHands = [makeHand(), makeHand()]; dHands.forEach((h, i) => { h.position.set(i ? .22 : -.22, -.3, -.42); h.rotation.set(.55, i ? .3 : -.3, 0); h.visible = false; camera.add(h); });
const O = new THREE.Vector3(), D = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
const keys = {}; let pitch = 0, deskHover = null;
addEventListener('keydown', e => { keys[e.code] = true; }); addEventListener('keyup', e => { keys[e.code] = false; });
renderer.domElement.addEventListener('click', () => { if (renderer.xr.isPresenting) return; if (deskHover) deskHover.it.fn(); else if (document.pointerLockElement !== renderer.domElement) renderer.domElement.requestPointerLock?.(); });
addEventListener('mousemove', e => { if (document.pointerLockElement !== renderer.domElement) return; rig.rotation.y -= e.movementX * .0022; pitch = THREE.MathUtils.clamp(pitch - e.movementY * .0022, -1.2, 1.2); camera.rotation.x = pitch; });
addEventListener('resize', () => { if (renderer.xr.isPresenting) return; camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

function clampRig() { const b = world.bounds; rig.position.x = THREE.MathUtils.clamp(rig.position.x, b.x[0], b.x[1]); rig.position.z = THREE.MathUtils.clamp(rig.position.z, b.z[0], b.z[1]); }
function moveXZ(dx, dz, dt, speed) { D.set(dx, 0, dz); if (D.lengthSq() < .01) return; D.applyAxisAngle(UP, rigYaw()); rig.position.addScaledVector(D, speed * dt); clampRig(); }
function rigYaw() { if (!renderer.xr.isPresenting) return rig.rotation.y; head(); return Math.atan2(-headDir.x, -headDir.z); }
function xrInput(dt) {
  marker.visible = false;
  for (const st of controllers) {
    if (!st.source) { st.line.visible = false; continue; }
    tmpM.identity().extractRotation(st.c.matrixWorld); O.setFromMatrixPosition(st.c.matrixWorld); D.set(0, 0, -1).applyMatrix4(tmpM);
    const h = pick(O, D); st.hover = h; st.line.visible = true; st.line.scale.z = h ? h.d : 2.2;
    if (h && !hover.visible) { hover.set(h.it.label); hover.position.copy(h.point).lerp(O, .08); hover.position.y += .22; hover.lookAt(headPos); hover.visible = true; }
    const g = st.source.gamepad; if (!g) continue; const ax = g.axes, x = ax[2] ?? 0, y = ax[3] ?? 0, isLeft = st.source.handedness === 'left';
    if (isLeft && mode === 'akici') moveXZ(x, y, dt, 2.1);
    else if (mode === 'isinlanma') {
      if (y < -.6) { st.aiming = true; const t = -O.y / Math.min(D.y, -.04), d = Math.min(t, 9); marker.position.set(O.x + D.x * d, .02, O.z + D.z * d); const b = world.bounds; marker.position.x = THREE.MathUtils.clamp(marker.position.x, b.x[0], b.x[1]); marker.position.z = THREE.MathUtils.clamp(marker.position.z, b.z[0], b.z[1]); marker.visible = true; }
      else if (st.aiming) { st.aiming = false; head(); rig.position.x += marker.position.x - headPos.x; rig.position.z += marker.position.z - headPos.z; }
    }
    if (!isLeft) { if (Math.abs(x) > .7 && !st.turned) { st.turned = true; head(); const a = x > 0 ? -Math.PI / 6 : Math.PI / 6, dx = rig.position.x - headPos.x, dz = rig.position.z - headPos.z, c = Math.cos(a), s = Math.sin(a); rig.rotation.y += a; rig.position.x = headPos.x + dx * c + dz * s; rig.position.z = headPos.z - dx * s + dz * c; } if (Math.abs(x) < .3) st.turned = false; }
    const a = g.buttons[4]?.pressed; if (a && !st.was) { mode = mode === 'akici' ? 'isinlanma' : 'akici'; save({ ...load(), mode }); tick(); say(`Hareket: ${mode === 'akici' ? 'Akıcı' : 'Işınlanma'}`, null, 2); } st.was = a;
  }
}
function deskInput(dt) {
  moveXZ((keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0), (keys.KeyS ? 1 : 0) - (keys.KeyW ? 1 : 0), dt, 3.2);
  camera.getWorldPosition(O); camera.getWorldDirection(D); deskHover = pick(O, D); dHands.forEach(h => { h.visible = world === siege; h.userData.setPersona(state.stage !== 'traveller'); });
  $('arti').style.display = 'block'; $('arti').style.background = deskHover ? '#d9a845' : 'none'; if (deskHover && !sub.visible) $('hud').textContent = deskHover.it.label;
}
function animate(dt) {
  time += dt;
  if (fadeJob) { const j = fadeJob; j.t = Math.min(j.s, j.t + dt); veil.material.opacity = j.from + (j.to - j.from) * (j.t / j.s); veil.visible = veil.material.opacity > .005; if (j.t >= j.s) { fadeJob = null; j.res(); } }
  for (let i = timers.length - 1; i >= 0; i--) if ((timers[i].t -= dt) <= 0) timers.splice(i, 1)[0].r();
  if (subT > 0 && (subT -= dt) <= 0) sub.visible = false;
  for (const d of [museum.door1453]) { const u = d.userData; if (u.motion) { u.t = (u.t || 0) + dt; u.painting.render(u.t, 1); } }
  head();
  if (world === museum) {
    museum.door1453.userData.glow.material.opacity = .45 + Math.sin(time * 1.6) * .12; museum.door1789.userData.glow.material.opacity = .16;
    const h = museum.statue.userData.head, s = museum.statue, dx = headPos.x - s.position.x, dz = headPos.z - s.position.z, d = Math.hypot(dx, dz);
    if (d < 7) { const tgt = THREE.MathUtils.clamp(Math.atan2(dx, dz) - s.rotation.y, -1, 1); h.rotation.y += (tgt - h.rotation.y) * Math.min(1, dt * 2.5); }
    if (d < 5.2 && !statueSpoke && state.stage === 'museum' && !state.trophy) { statueSpoke = true; say('Tarihi bildiğini sanıyorsun. Peki, onu yaşayanların ne hissettiğini biliyor musun?', 'Heykel', 9); }
  } else {
    const s = siege; s.fires.forEach((f, i) => { f.scale.setScalar(2.2 + Math.sin(time * 9 + i * 2) * .3); }); s.fireLight.intensity = 42 + Math.sin(time * 11) * 7;
    s.helperGlow.material.opacity = .4 + Math.sin(time * 3) * .2; s.wadGlow.material.opacity = .7 + Math.sin(time * 4) * .3;
    for (const f of s.people) f.userData.head.rotation.y = Math.sin(time * .7 + f.userData.phase) * .35;
    if (flashT > 0 && (flashT -= dt) <= 0) s.flash.visible = false;
    for (const p of s.smoke) { const u = p.userData; if (u.v === undefined) continue; u.age += dt; if (u.age < 0) continue; const o = Math.max(0, .6 - u.age * .11); p.material.opacity = o; p.position.y += u.v * dt * (u.wall ? .9 : .5); p.position.z -= u.wall ? 0 : u.v * dt * .9; p.position.x += u.dx * dt; p.scale.setScalar((u.wall ? 3 : 1.6) + u.age * 1.2); }
    if (state.stage === 'traveller') s.groups.forEach((g, i) => { const dx = headPos.x - g[0].position.x, dz = headPos.z - g[0].position.z; if (dx * dx + dz * dz < 14 && !heard.has(i)) { heard.add(i); go('listen', `g${i}`); say(LINES[i][0], LINES[i][1], 8); } });
  }
  hover.visible = false;
  if (renderer.xr.isPresenting) xrInput(dt); else deskInput(dt);
}
let statueSpoke = false;
const LINES = [['“Duvarın dibine kadar yürüsek de geri dönen olur mu?” diye fısıldıyor biri.', 'Asker'], ['“Yedi kez ateş edecek, sonra soğumasını bekleyeceğiz.”', 'Topçu']];

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => { const dt = Math.min(clock.getDelta(), .1); animate(dt); renderer.render(scene, camera); });

async function begin(xr) {
  sound.start(); sound.ambient('museum'); $('giris').hidden = true;
  if (xr) {
    const session = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'hand-tracking'] });
    await renderer.xr.setSession(session); session.addEventListener('end', () => { $('giris').hidden = false; });
  }
  setWorld(museum, 0, 9.5, 0, -14); await fade(0, 1.4);
  say('Saat 00.24. Koridorun sonunda iki kapı aydınlanıyor.', 'Yaşayan Müze', 7);
  hint(xr ? '' : 'Tıkla: fare ile bak · WASD: yürü · Tıkla: dokun');
}
$('masa').onclick = () => begin(false);
$('vr').onclick = () => begin(true).catch(e => { $('giris').hidden = false; $('bilgi').textContent = `VR başlatılamadı: ${e.message}`; });
navigator.xr?.isSessionSupported('immersive-vr').then(ok => { $('vr').disabled = !ok; if (!ok) $('bilgi').textContent = 'VR için bu sayfayı Meta Quest 3 tarayıcısında aç.'; }).catch(() => {});
if (!navigator.xr) $('bilgi').textContent = 'VR için bu sayfayı Meta Quest 3 tarayıcısında aç.';

if (TEST) window.__muze = { get state() { return state; }, get world() { return world === museum ? 'museum' : '1453'; }, get mode() { return mode; }, get busy() { return busy; }, get said() { return lastSay; }, items, rig, camera, renderer, siege, activate(label) { const i = items.find(x => x.label === label && x.active()); if (!i) return false; i.fn(); return true; }, info: () => renderer.info.render };
