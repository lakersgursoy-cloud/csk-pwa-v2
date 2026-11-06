import * as THREE from 'three';
import { advance, initialState, currentCharacter } from './story.js';
import { CHAPTERS } from './chapters.js';
import { buildMuseum, buildSiege, buildCity, buildParis, figure, glow, box, makeHand, makeItem } from './worlds.js';
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
const museum = buildMuseum(), worlds = { museum, siege: buildSiege(), city: buildCity(), paris: buildParis() }, sound = new Sound();
for (const w of Object.values(worlds)) { scene.add(w.group); w.group.visible = false; }
const lit = (o) => new THREE.MeshLambertMaterial(o);
let world = museum, state = initialState(), mode = load().mode === 'akici' ? 'akici' : 'isinlanma', busy = false, time = 0, bounds = museum.bounds, floorY = 0;
const saved = load(); if (saved.done) state.done = saved.done;

// Kararma küresi: sahne geçişleri kameraya bağlıdır.
const veil = new THREE.Mesh(new THREE.SphereGeometry(.3, 12, 8), new THREE.MeshBasicMaterial({ color: '#000', side: THREE.BackSide, transparent: true, opacity: 1, depthTest: false, depthWrite: false, fog: false }));
veil.renderOrder = 999; camera.add(veil);
let fadeJob = null; const timers = [];
const fade = (to, s) => new Promise(res => { fadeJob = { from: veil.material.opacity, to, s, t: 0, res }; });
const wait = (s) => new Promise(r => { timers.push({ t: s, r }); });

// Altyazı ve seçim panelleri dünyada sabit durur; rahatsız edici biçimde kafaya kilitlenmez.
const sub = new Panel(1.35, .5); sub.visible = false; scene.add(sub);
const headPos = new THREE.Vector3(), headDir = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
function head() { camera.getWorldPosition(headPos); camera.getWorldDirection(headDir); headDir.y = 0; headDir.normalize(); }
function place(o, dist, dy = -.2, side = 0) { head(); o.position.copy(headPos).addScaledVector(headDir, dist); o.position.y += dy; o.position.x += -headDir.z * side; o.position.z += headDir.x * side; o.lookAt(headPos.x, o.position.y, headPos.z); }
let subT = 0, lastSay = '';
function say(text, title, secs = 6) { sub.set(text, title); place(sub, 1.8, -.34); sub.visible = true; subT = secs; lastSay = text; }
const hint = (t) => { $('hud').textContent = renderer.xr.isPresenting ? '' : t; };

// Etkileşim
const items = [];
const on = (hit, label, fn, active = () => true) => { const it = { hit, label, fn, active }; items.push(it); return it; };
const tick = () => museum.comfort.set(`Hareket: ${mode === 'akici' ? 'Akıcı' : 'Işınlanma'}`, 'değiştirmek için dokun');
tick();
on(museum.comfort, 'Hareket biçimi', () => { mode = mode === 'akici' ? 'isinlanma' : 'akici'; save({ ...load(), mode }); tick(); sound.chime(); }, () => world === museum);
for (const [id, ch] of Object.entries(CHAPTERS)) {
  on(museum.doors[id].userData.hit, `${ch.year} · ${ch.place}`, () => openDoor(id), () => state.stage === 'museum' && !busy);
  on(museum.pedestals[id].hit, ch.trophy.name, () => replay(id), () => world === museum && !!state.done[id] && !busy);
}
const hasTrophy = (id) => { museum.pedestals[id].map.visible = museum.pedestals[id].glow.visible = !!state.done[id]; museum.pedestals[id].glow.material.opacity = .3; };
Object.keys(CHAPTERS).forEach(hasTrophy);

// Zaman yolcusunun gördüğü hafıza izleri
const traces = {};
for (const [cid, ch] of Object.entries(CHAPTERS)) {
  traces[cid] = Object.entries(ch.characters).map(([id, c], i) => {
    const [x, z] = ch.traces[i], g = new THREE.Group(), f = figure(c), hl = glow(2.4, '170,210,255'), plate = new Panel(1.5, .24, { size: 62 }).set(c.label);
    g.position.set(x, 0, z); f.rotation.y = Math.atan2(ch.arrive.at[0] - x, ch.arrive.at[1] - z); hl.position.y = 1.05; plate.position.y = 2.15; g.add(f, hl, plate);
    const hit = new THREE.Mesh(new THREE.SphereGeometry(.85, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 1; g.add(hit); worlds[ch.world].group.add(g); g.visible = false;
    on(hit, c.label, () => memoryShift(id), () => state.stage === 'traveller' && state.chapter === cid && !busy);
    return { id, g, hl, plate, f };
  });
}
// Karakter sahnesi nesneleri: her geçişte etkin dünyaya taşınır.
const prop = { group: new THREE.Group(), crate: box(1.1, .7, .7, lit({ color: '#5a3d22' })), kinds: {}, itemGlow: glow(.7, '255,210,120'), targetGlow: glow(1.3, '255,200,110'), climaxGlow: glow(1, '255,150,70') };
const pHit = (r) => new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
Object.assign(prop, { itemHit: pHit(.5), targetHit: pHit(1), climaxHit: pHit(.9), trophyHit: pHit(.6) });
prop.group.add(prop.crate, prop.itemGlow, prop.targetGlow, prop.climaxGlow, prop.itemHit, prop.targetHit, prop.climaxHit, prop.trophyHit);
for (const k of ['wad', 'basket', 'bread', 'paper', 'box']) { prop.kinds[k] = makeItem(k); prop.kinds[k].visible = false; prop.group.add(prop.kinds[k]); }
prop.trophy = new THREE.Group(); prop.group.add(prop.trophy);
prop.trophy.add(new THREE.Mesh(new THREE.PlaneGeometry(.7, .52), new THREE.MeshBasicMaterial({ color: '#d8caa6' }))); prop.trophy.children[0].rotation.x = -Math.PI / 2;
let held = null;
const itemOn = on(prop.itemHit, '', () => { go('takeItem'); holdItem(); }, () => state.stage === 'wake' && !busy);
const targetOn = on(prop.targetHit, '', () => go('deliver'), () => state.stage === 'carry');
const climaxOn = on(prop.climaxHit, '', () => go('act'), () => state.stage === 'climax' && !busy);
const trophyOn = on(prop.trophyHit, '', () => go('collect'), () => state.stage === 'aftermath' && prop.trophy.visible && !busy);
const choiceUi = [-.54, .54].map((side) => { const p = new Panel(.95, .32, { size: 54 }); p.visible = false; scene.add(p); const it = on(p, '', () => go('choose', p.userData.id), () => state.stage === 'choice'); Object.assign(p.userData, { side, it }); return p; });

function setupProps(c) {
  const g = worlds[c.world].group, y = c.floorY, [ix, iz] = c.item.at, m = prop.kinds[c.item.kind]; g.add(prop.group);
  for (const k in prop.kinds) { prop.kinds[k].visible = false; prop.group.add(prop.kinds[k]); }
  prop.crate.position.set(ix, y + .35, iz); m.visible = true; m.position.set(ix, y + .84, iz); m.rotation.set(0, 0, 0); held = m;
  prop.itemHit.position.copy(m.position); prop.itemGlow.position.copy(m.position); prop.itemGlow.position.y += .12; prop.itemGlow.visible = true;
  prop.targetHit.position.set(...c.target.at); prop.targetGlow.position.set(...c.target.at); prop.targetGlow.visible = false;
  prop.climaxHit.position.set(...c.climax.at); prop.climaxGlow.position.set(...c.climax.at); prop.climaxGlow.visible = false;
  const tm = prop.trophy.children[0].material; tm.map = museum.pedestals[state.chapter].map.material.map; tm.color.set('#fff'); tm.needsUpdate = true; prop.trophy.position.set(ix, y + .74, iz); prop.trophyHit.position.copy(prop.trophy.position); prop.trophy.visible = false;
  itemOn.label = c.item.label; targetOn.label = c.target.label; climaxOn.label = c.climax.label; trophyOn.label = CHAPTERS[state.chapter].trophy.name;
}

function go(event, payload) { const prev = state; state = advance(state, event, payload); if (event !== 'listen' && state !== prev) enter(state.stage); }
function setWorld(w, x, z, faceX, faceZ, y = 0, b = w.bounds) {
  world = w; bounds = b; floorY = y; for (const v of Object.values(worlds)) v.group.visible = v === w; scene.fog = w.fog; scene.background = new THREE.Color(w.bg);
  const yaw = Math.atan2(x - faceX, z - faceZ);
  if (renderer.xr.isPresenting) { // Başın odadaki konumu ve yönü hesaba katılır; oyuncu tam hedef noktaya, hedefe bakarak gelir.
    const local = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ').y; rig.rotation.y = yaw - local;
    const off = new THREE.Vector3(camera.position.x, 0, camera.position.z).applyAxisAngle(UP, rig.rotation.y); rig.position.set(x - off.x, y, z - off.z);
  } else { rig.position.set(x, y, z); rig.rotation.y = yaw; pitch = 0; camera.rotation.x = 0; }
}
const hands = [], dHands = [makeHand(), makeHand()];
const allHands = () => [...hands, ...dHands];
const setPersona = (v, color) => allHands().forEach(h => { h.userData.setPersona(v); if (color) h.userData.setSleeve(color); });
function holdItem() { const h = renderer.xr.isPresenting ? (hands.find(x => x.parent?.visible) || hands[0]) : dHands[1]; h.add(held); held.position.set(0, .06, -.11); prop.itemGlow.visible = false; }

async function openDoor(id) {
  busy = true; const d = museum.doors[id].userData, ch = CHAPTERS[id]; sound.chime(); d.motion = 1; say('Tablodaki kalabalık hareket etmeye başladı.', ch.year, 3);
  await wait(2); await fade(1, .7); busy = false; go('door', id);
}
async function memoryShift(id) {
  busy = true; say('Gözlerin kararıyor. Birinin kalbi seninkinin yerine atıyor.', 'Hafıza Geçişi', 3); sound.heartbeat();
  await wait(1.6); await fade(1, .9); go('touch', id); await wait(1.1); await fade(0, 1.3); busy = false;
}
async function replay(id) {
  busy = true; await fade(.86, .5); sound.thud(52, 1.6, 1); const ch = CHAPTERS[id], pick = Object.entries(state.done[id] || {}).pop();
  say(pick ? ch.characters[pick[0]].options[pick[1]].memory : ch.place, ch.trophy.title, 4.5); await wait(4.5); await fade(0, .8); busy = false;
}
const showTraces = (cid) => { for (const k in traces) traces[k].forEach(t => { t.g.visible = k === cid; const d = !!state.done[cid]?.[t.id]; t.hl.visible = !d; t.plate.set(`${CHAPTERS[k].characters[t.id].label}${d ? ' ✓' : ''}`); }); };
const heard = new Set();
let token = 0;
async function enter(stage) {
  const ch = CHAPTERS[state.chapter], c = currentCharacter(state), me = ++token;
  if (stage === 'traveller') {
    const w = worlds[ch.world]; w.reset(); heard.clear(); prop.group.parent?.remove(prop.group); showTraces(state.chapter); setPersona(false, '#264a66');
    setWorld(w, ...ch.arrive.at, ...ch.arrive.face); sound.ambient('camp'); allHands().forEach(h => { h.visible = true; });
    await fade(0, 1.2); say(ch.arrive.text, 'Zaman Yolcusu', 7); hint('Çevreyi dinle, sonra içine gireceğin hayatı seç.');
    await wait(7); if (token === me) say('Işıldayan izlerden birine dokun. İstediğin zaman dönüp başka birini seçebilirsin.', 'Zaman Yolcusu', 8);
  } else if (stage === 'wake') {
    for (const t of traces[state.chapter]) t.g.visible = false;
    worlds[c.world].reset(); setupProps(c); setPersona(true, c.sleeve); setWorld(worlds[c.world], ...c.spawn, ...c.face, c.floorY, c.bounds); hint(`${c.item.label}: al.`);
    await wait(.8); if (token === me) say(c.wake, c.label, 8);
  } else if (stage === 'carry') {
    prop.targetGlow.visible = true; hint(`${c.target.label}.`); say(c.carry, c.label, 7);
  } else if (stage === 'choice') {
    held.visible = false; prop.targetGlow.visible = false; hint(''); say(c.prompt, 'Kararın', 90);
    Object.entries(c.options).forEach(([id, o], i) => { const p = choiceUi[i]; p.set(o.label); p.userData.id = id; p.userData.it.label = o.label; p.visible = true; place(p, 1.7, -.72, p.userData.side); });
  } else if (stage === 'outcome') {
    choiceUi.forEach(p => { p.visible = false; }); say(c.options[state.choice].result, 'Sonuç', 6); await wait(6); if (token === me) go('outcomeDone');
  } else if (stage === 'climax') {
    prop.climaxGlow.visible = true; say(c.climax.text, c.label, 8); hint(`${c.climax.label}.`);
  } else if (stage === 'aftermath') {
    busy = true; hint(''); prop.climaxGlow.visible = false; worlds[c.world].climax(sound); pulse(1, 260); await wait(3.5);
    say(c.history, 'Tarih', 9); await wait(9); prop.trophy.visible = true; prop.itemGlow.visible = true; prop.itemGlow.position.copy(prop.trophy.position); say(`${ch.trophy.name} burada duruyor.`, c.label, 6); busy = false; hint('Nesneyi al.');
  } else if (stage === 'finale') {
    busy = true; prop.group.parent?.remove(prop.group); await fade(1, 1); setPersona(false, '#264a66'); setWorld(worlds[ch.world], ...ch.arrive.at, ...ch.arrive.face); await fade(0, 1.2);
    say('Aynı an. Üç hayat.', 'Ortak Final', 4); await wait(4);
    for (const [id, o] of Object.entries(state.done[state.chapter])) { say(ch.characters[id].options[o].finale, ch.characters[id].label, 5); await wait(5); }
    say(ch.closing, 'Tarih', 9); await wait(9); busy = false; go('finish');
  } else if (stage === 'museum') {
    busy = true; hint(''); await fade(1, 1); setPersona(false); allHands().forEach(h => { h.visible = false; }); for (const k in traces) traces[k].forEach(t => { t.g.visible = false; });
    setWorld(museum, 3, ch && state.chapter === 'paris' ? -.6 : 4.2, 3, ch && state.chapter === 'paris' ? -3.4 : 1); sound.ambient('museum');
    for (const d of Object.values(museum.doors)) d.userData.motion = 0; save({ ...load(), done: state.done }); Object.keys(CHAPTERS).forEach(hasTrophy);
    await fade(0, 1); say(`${ch.trophy.name} artık müzede. Ona dokunursan o an yeniden canlanır. Aynı kapıdan dönüp başka bir hayata da girebilirsin.`, 'Saat 00.24', 8); busy = false;
  }
}

// Girdi
const ray = new THREE.Raycaster(), tmpM = new THREE.Matrix4(), controllers = [], hover = new Panel(.9, .19, { size: 76 }); hover.visible = false; scene.add(hover);
function pick(origin, dir) {
  ray.set(origin, dir); ray.far = 60; let best = null;
  for (const it of items) { if (!it.active() || !it.hit.visible) continue; if (it.hit.parent && !visibleChain(it.hit)) continue; const h = ray.intersectObject(it.hit, false)[0]; if (h && (!best || h.distance < best.d)) best = { it, d: h.distance, point: h.point }; }
  return best;
}
const visibleChain = (o) => { for (let p = o.parent; p; p = p.parent) if (p.visible === false) return false; return true; };
function pulse(v, ms) { for (const c of controllers) c.source?.gamepad?.hapticActuators?.[0]?.pulse?.(v, ms); }
const marker = new THREE.Mesh(new THREE.RingGeometry(.25, .33, 24), new THREE.MeshBasicMaterial({ color: '#8fd0ff', side: THREE.DoubleSide, fog: false })); marker.rotation.x = -Math.PI / 2; marker.visible = false; scene.add(marker);
const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]);
for (let i = 0; i < 2; i++) {
  const c = renderer.xr.getController(i), grip = renderer.xr.getControllerGrip(i), line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: '#ffe6b0' })), h = makeHand();
  grip.add(h); hands.push(h); c.add(line); rig.add(c, grip);
  const st = { c, line, source: null, hover: null, aiming: false, turned: false, hitD: 3 };
  c.addEventListener('connected', e => { st.source = e.data; line.visible = e.data.targetRayMode !== 'gaze'; });
  c.addEventListener('disconnected', () => { st.source = null; });
  c.addEventListener('selectstart', () => { if (st.hover) { st.hover.it.fn(); pulse(.5, 40); } });
  controllers.push(st);
}
// Masaüstü elleri
dHands.forEach((h, i) => { h.position.set(i ? .22 : -.22, -.3, -.42); h.rotation.set(.55, i ? .3 : -.3, 0); h.visible = false; camera.add(h); });
const O = new THREE.Vector3(), D = new THREE.Vector3();
const keys = {}; let pitch = 0, deskHover = null;
addEventListener('keydown', e => { keys[e.code] = true; }); addEventListener('keyup', e => { keys[e.code] = false; });
renderer.domElement.addEventListener('click', () => { if (renderer.xr.isPresenting) return; if (deskHover) deskHover.it.fn(); else if (document.pointerLockElement !== renderer.domElement) renderer.domElement.requestPointerLock?.(); });
addEventListener('mousemove', e => { if (document.pointerLockElement !== renderer.domElement) return; rig.rotation.y -= e.movementX * .0022; pitch = THREE.MathUtils.clamp(pitch - e.movementY * .0022, -1.2, 1.2); camera.rotation.x = pitch; });
addEventListener('resize', () => { if (renderer.xr.isPresenting) return; camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

function clampRig() { const b = bounds; rig.position.x = THREE.MathUtils.clamp(rig.position.x, b.x[0], b.x[1]); rig.position.z = THREE.MathUtils.clamp(rig.position.z, b.z[0], b.z[1]); }
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
      if (y < -.6) { st.aiming = true; const t = (floorY - O.y) / Math.min(D.y, -.04), d = Math.min(t, 9); marker.position.set(O.x + D.x * d, floorY + .02, O.z + D.z * d); const b = bounds; marker.position.x = THREE.MathUtils.clamp(marker.position.x, b.x[0], b.x[1]); marker.position.z = THREE.MathUtils.clamp(marker.position.z, b.z[0], b.z[1]); marker.visible = true; }
      else if (st.aiming) { st.aiming = false; head(); rig.position.x += marker.position.x - headPos.x; rig.position.z += marker.position.z - headPos.z; }
    }
    if (!isLeft) { if (Math.abs(x) > .7 && !st.turned) { st.turned = true; head(); const a = x > 0 ? -Math.PI / 6 : Math.PI / 6, dx = rig.position.x - headPos.x, dz = rig.position.z - headPos.z, c = Math.cos(a), s = Math.sin(a); rig.rotation.y += a; rig.position.x = headPos.x + dx * c + dz * s; rig.position.z = headPos.z - dx * s + dz * c; } if (Math.abs(x) < .3) st.turned = false; }
    const a = g.buttons[4]?.pressed; if (a && !st.was) { mode = mode === 'akici' ? 'isinlanma' : 'akici'; save({ ...load(), mode }); tick(); say(`Hareket: ${mode === 'akici' ? 'Akıcı' : 'Işınlanma'}`, null, 2); } st.was = a;
  }
}
function deskInput(dt) {
  moveXZ((keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0), (keys.KeyS ? 1 : 0) - (keys.KeyW ? 1 : 0), dt, 3.2);
  camera.getWorldPosition(O); camera.getWorldDirection(D); deskHover = pick(O, D); 
  $('arti').style.display = 'block'; $('arti').style.background = deskHover ? '#d9a845' : 'none'; if (deskHover && !sub.visible) $('hud').textContent = deskHover.it.label;
}
function animate(dt) {
  time += dt;
  if (fadeJob) { const j = fadeJob; j.t = Math.min(j.s, j.t + dt); veil.material.opacity = j.from + (j.to - j.from) * (j.t / j.s); veil.visible = veil.material.opacity > .005; if (j.t >= j.s) { fadeJob = null; j.res(); } }
  for (let i = timers.length - 1; i >= 0; i--) if ((timers[i].t -= dt) <= 0) timers.splice(i, 1)[0].r();
  if (subT > 0 && (subT -= dt) <= 0) sub.visible = false;
  head();
  if (world === museum) {
    for (const d of Object.values(museum.doors)) { const u = d.userData; u.glow.material.opacity = .4 + Math.sin(time * 1.6) * .12; if (u.motion) { u.t = (u.t || 0) + dt; u.painting.render(u.t, 1); } }
    const h = museum.statue.userData.head, s = museum.statue, dx = headPos.x - s.position.x, dz = headPos.z - s.position.z, d = Math.hypot(dx, dz);
    if (d < 7) { const tgt = THREE.MathUtils.clamp(Math.atan2(dx, dz) - s.rotation.y, -1, 1); h.rotation.y += (tgt - h.rotation.y) * Math.min(1, dt * 2.5); }
    if (d < 5.2 && !statueSpoke && !busy) { statueSpoke = true; say('Tarihi bildiğini sanıyorsun. Peki, onu yaşayanların ne hissettiğini biliyor musun?', 'Heykel', 9); }
  } else {
    world.tick(dt, time); prop.itemGlow.material.opacity = .7 + Math.sin(time * 4) * .3;
    if (state.stage === 'traveller') {
      traces[state.chapter].forEach(t => { t.hl.material.opacity = .32 + Math.sin(time * 3) * .15; t.plate.lookAt(headPos); });
      world.groups.forEach((g, i) => { const dx = headPos.x - g[0].position.x, dz = headPos.z - g[0].position.z, l = CHAPTERS[state.chapter].lines[i]; if (dx * dx + dz * dz < 16 && !heard.has(i)) { heard.add(i); go('listen', `g${i}`); say(l[0], l[1], 8); } });
    }
  }
  hover.visible = false;
  if (renderer.xr.isPresenting) xrInput(dt); else deskInput(dt);
}
let statueSpoke = false;

const clock = new THREE.Clock(), SPEED = TEST ? +(new URLSearchParams(location.search).get('hiz') || 1) : 1;
renderer.setAnimationLoop(() => { const dt = Math.min(clock.getDelta(), .1) * SPEED; animate(dt); renderer.render(scene, camera); });

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

if (TEST) window.__muze = { get state() { return state; }, get world() { return Object.keys(worlds).find(k => worlds[k] === world); }, get mode() { return mode; }, get busy() { return busy; }, get said() { return lastSay; }, items, rig, camera, renderer, prop, hideSub() { sub.visible = false; subT = 0; }, activate(label) { const i = items.find(x => x.label === label && x.active()); if (!i) return false; i.fn(); return true; }, info: () => renderer.info.render };
