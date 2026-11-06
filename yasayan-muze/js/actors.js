// CC0 iskeletli karakterler: rol renkleri, dönem başlıkları ve animasyon.
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { MeshoptDecoder } from '../vendor/meshopt_decoder.module.js';
import { clone as cloneSkinned } from '../vendor/SkeletonUtils.js';

const HEIGHT = { adv: 1.72, king: 1.76, hood: 1.64 }, FILE = { adv: 'adventurer', king: 'monarch', hood: 'hooded_adventurer' };
const PROPS = ['barrel', 'barrels', 'campfire', 'log', 'rock_large', 'rock_tall', 'stump', 'tree_pine_tall', 'tree_oak', 'crate', 'taxi', 'firetruck', 'bush'];
const kit = { models: {}, props: {} };
const shade = (c, k) => new THREE.Color(c).multiplyScalar(k);

export const getSky = (n) => kit.skies[n];
export async function loadKit(onStep = () => {}) {
  const l = new GLTFLoader(), tl = new THREE.TextureLoader(); l.setMeshoptDecoder(MeshoptDecoder); kit.skies = {};
  const step = (p) => p.then(v => { onStep(); return v; });
  await Promise.all([
    ...['day', 'grey'].map(n => step(tl.loadAsync(`./assets/sky/${n}.jpg`).then(t => { t.colorSpace = THREE.SRGBColorSpace; kit.skies[n] = t; }))),
    ...Object.entries(FILE).map(([k, f]) => step((async () => {
      const g = await l.loadAsync(`./assets/${f}.glb`), clips = {}; for (const a of g.animations) clips[a.name.split('|').pop()] = a;
      g.scene.getObjectByName('Sword')?.removeFromParent(); g.scene.getObjectByName('Backpack')?.removeFromParent();
      g.scene.updateMatrixWorld(true); const box = new THREE.Box3().setFromObject(g.scene), s = HEIGHT[k] / (box.max.y - box.min.y), head = g.scene.getObjectByName('Head').getWorldPosition(new THREE.Vector3());
      kit.models[k] = { scene: g.scene, clips, scale: s, headTop: { adv: .2, king: .2, hood: .19 }[k] };
    })())),
    ...PROPS.map(p => step(l.loadAsync(`./assets/${p}.glb`).then(g => { kit.props[p] = g.scene; }))),
  ]);
  return kit;
}

// Tekrarlanan doğa nesneleri tek çizimde: ağaçlar, kayalar.
export function scatter(group, name, spots) {
  const src = kit.props[name]; src.updateMatrixWorld(true); const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0);
  src.traverse(o => {
    if (!o.isMesh) return; const m = new THREE.InstancedMesh(o.geometry, o.material, spots.length);
    spots.forEach(([x, y, z, s, r = 0], i) => { M.compose(new THREE.Vector3(x, y, z), Q.setFromAxisAngle(UP, r), new THREE.Vector3(s, s, s)).multiply(o.matrixWorld); m.setMatrixAt(i, M); });
    m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; m.userData.dyn = true; group.add(m);
  });
}
export function prop(group, name, x, y, z, s = 1, r = 0) { const o = kit.props[name].clone(true); o.position.set(x, y, z); o.scale.setScalar(s); o.rotation.y = r; o.userData.dyn = true; o.traverse(m => { if (m.isMesh) m.castShadow = m.receiveShadow = true; }); group.add(o); return o; }

function hatMesh(kind, cap) {
  const m = new THREE.MeshLambertMaterial({ color: cap }), d = new THREE.MeshLambertMaterial({ color: shade(cap, .6) }), g = new THREE.Group(), mesh = (geo, mat, y = 0, sx = 1, sy = 1) => { const o = new THREE.Mesh(geo, mat); o.position.y = y; o.scale.set(sx, sy, sx); g.add(o); return o; };
  if (kind === 'turban') { const t = mesh(new THREE.TorusGeometry(.095, .052, 7, 14), m, .0); t.rotation.x = Math.PI / 2; mesh(new THREE.SphereGeometry(.09, 9, 6), m, .03, 1, .7); }
  if (kind === 'bork') { mesh(new THREE.CylinderGeometry(.085, .112, .19, 10), m, .055); const b = mesh(new THREE.TorusGeometry(.11, .016, 5, 14), d, -.03); b.rotation.x = Math.PI / 2; }
  if (kind === 'helm') { mesh(new THREE.SphereGeometry(.122, 11, 7, 0, 6.3, 0, 1.65), m, -.035); mesh(new THREE.ConeGeometry(.018, .07, 6), m, .11); }
  if (kind === 'tricorne') { const b = mesh(new THREE.CylinderGeometry(.16, .17, .03, 3), m, -.015); b.rotation.y = .5; mesh(new THREE.CylinderGeometry(.09, .105, .08, 10), m, .03); }
  if (kind === 'fez') { mesh(new THREE.CylinderGeometry(.075, .1, .13, 12), m, .03); mesh(new THREE.CylinderGeometry(.004, .004, .09, 4), d, .1); }
  if (kind === 'kalpak') { mesh(new THREE.CylinderGeometry(.1, .105, .15, 12), new THREE.MeshLambertMaterial({ color: '#2a2422' }), .06); }
  if (kind === 'sultan') { const t = mesh(new THREE.TorusGeometry(.105, .06, 8, 16), m, 0); t.rotation.x = Math.PI / 2; mesh(new THREE.SphereGeometry(.1, 10, 7), m, .04, 1, .75); mesh(new THREE.CylinderGeometry(.045, .06, .13, 10), new THREE.MeshLambertMaterial({ color: '#8c1f1c' }), .1); }
  if (kind === 'laurel') { const r = mesh(new THREE.TorusGeometry(.115, .018, 6, 20), new THREE.MeshLambertMaterial({ color: '#d8b050', emissive: '#4a3a10' }), .02); r.rotation.x = Math.PI / 2; for (let i = 0; i < 14; i++) { const a = i / 14 * 6.28, l = new THREE.Mesh(new THREE.PlaneGeometry(.035, .06), new THREE.MeshLambertMaterial({ color: '#e0c060', side: THREE.DoubleSide })); l.position.set(Math.cos(a) * .12, .03 + (i % 2) * .02, Math.sin(a) * .12); l.rotation.set(.3, -a, 0); g.add(l); } }
  if (kind === 'scarf') { mesh(new THREE.SphereGeometry(.118, 10, 7, 0, 6.3, 0, 1.8), m, -.05, 1, 1.05); }
  return g;
}

const RECOLOR = {
  adv: (robe, hair) => ({ Green: robe, LightGreen: shade(robe, .68), Brown: shade(robe, .42), Brown2: '#3a2a1c', Hair: hair, Eyebrows: hair }),
  king: (robe, hair) => ({ Blue: robe, Beige: shade(robe, 1.4), Hair_White: hair, DarkBrown: shade(robe, .5) }),
  hood: (robe) => ({ LightBrown: robe, DarkBrown: shade(robe, .6), Black: shade(robe, .4), Brown: '#2c2118' }),
};
export function makeActor({ model = 'adv', robe = '#6c5236', cap = '#c9bb9e', hat = 'bork', hair = '#3a2a1e', scale = 1, anim = 'Idle_Neutral', stone = false }) {
  const base = kit.models[model], root = new THREE.Group(), rig = cloneSkinned(base.scene), map = RECOLOR[model](robe, hair), cache = {}, stoneM = stone && new THREE.MeshLambertMaterial({ color: '#c9c3b6' });
  const convert = (m) => {
    if (stone) { if (m.name !== 'Gold') return stoneM; const h = stoneM.clone(); h.visible = false; return h; }
    if (cache[m.name]) return cache[m.name]; const n = new THREE.MeshLambertMaterial({ color: m.color, flatShading: false, name: m.name });
    if (map[m.name]) n.color.set(map[m.name]); if (m.name === 'Gold' || (model === 'hood' && m.name === 'Metal')) n.visible = false; return (cache[m.name] = n);
  };
  rig.traverse(o => { if (o.isMesh) { o.material = Array.isArray(o.material) ? o.material.map(convert) : convert(o.material); o.frustumCulled = false; if (stone) o.castShadow = true; } });
  rig.scale.setScalar(base.scale * scale); root.add(rig); root.userData.dyn = true;
  const mixer = stone ? null : new THREE.AnimationMixer(rig), a = { root, rig, mixer, head: rig.getObjectByName('Head'), action: null, path: null, seg: 0, clip: '' };
  a.play = (name, fade = .3) => { if (a.clip === name || !mixer) return; const c = base.clips[name]; if (!c) return; const n = mixer.clipAction(c); n.reset().setEffectiveTimeScale(.92 + Math.random() * .16).play(); n.time = Math.random() * c.duration; if (a.action) a.action.crossFadeTo(n, fade, false); a.action = n; a.clip = name; };
  if (stone) { const p = new THREE.AnimationMixer(rig); p.clipAction(base.clips.Idle_Neutral).play(); p.update(.4); a.head.userData.base = a.head.rotation.y; } else a.play(anim, 0);
  root.updateMatrixWorld(true);
  if (hat && hat !== 'none') {
    const h = hatMesh(hat, stone ? '#c9c3b6' : cap), q = a.head.getWorldQuaternion(new THREE.Quaternion()).invert(), sw = a.head.getWorldScale(new THREE.Vector3()).x;
    h.quaternion.copy(q); h.position.set(0, (base.headTop - .015) * scale / sw, 0).applyQuaternion(q); h.scale.setScalar(scale / sw); a.head.add(h); h.traverse(o => { if (o.isMesh && stone) o.material = stoneM; });
  }
  // Yakındaki oyuncuya bakma ve konuşurken baş hareketi. Animasyonun üstüne eklenir.
  const _fwd = new THREE.Vector3(), _cur = new THREE.Vector3(), _want = new THREE.Vector3(), _hp = new THREE.Vector3(), _pq = new THREE.Quaternion(), _wq = new THREE.Quaternion(), _d = new THREE.Quaternion(), _id = new THREE.Quaternion(), _side = new THREE.Vector3();
  const fwdLocal = a.head ? _fwd.set(0, 0, 1).applyQuaternion(root.quaternion).applyQuaternion(a.head.getWorldQuaternion(new THREE.Quaternion()).invert()).clone() : null;
  a.lookW = 0; a.talkT = 0; a.lookTarget = null; a.talk = (s) => { a.talkT = s; };
  a.look = (target) => { a.lookTarget = target; };
  const applyHead = (dt) => {
    const h = a.head; if (!h || !fwdLocal) return; h.getWorldPosition(_hp); h.getWorldQuaternion(_wq); h.parent.getWorldQuaternion(_pq);
    let want = 0; if (a.lookTarget) { _want.copy(a.lookTarget).sub(_hp); const dist = _want.length(); _want.normalize(); _cur.copy(fwdLocal).applyQuaternion(_wq); const dot = _cur.dot(_want); if (dist < 7 && dot > .1) want = 1; }
    a.lookW += (want - a.lookW) * Math.min(1, dt * 3);
    if (a.lookW > .01) { _cur.copy(fwdLocal).applyQuaternion(_wq); _d.setFromUnitVectors(_cur, _want); const ang = 2 * Math.acos(Math.min(1, Math.abs(_d.w))), k = Math.min(1, 1.05 / Math.max(ang, 1e-4)) * a.lookW; _d.slerp(_id, 1 - k); _pq.invert(); h.quaternion.premultiply(_pq.clone().multiply(_d).multiply(_pq.clone().invert())); }
    if (a.talkT > 0) { a.talkT -= dt; _cur.copy(fwdLocal).applyQuaternion(_wq); _side.crossVectors(new THREE.Vector3(0, 1, 0), _cur).normalize(); _d.setFromAxisAngle(_side, Math.sin(performance.now() * .011) * .05 + Math.sin(performance.now() * .0037) * .03); h.parent.getWorldQuaternion(_pq).invert(); h.quaternion.premultiply(_pq.clone().multiply(_d).multiply(_pq.clone().invert())); }
  };
  a.patrol = (pts, speed = 1.15) => { a.path = pts; a.seg = 0; a.speed = speed; root.position.set(pts[0][0], 0, pts[0][1]); a.play('Walk', 0); };
  a.update = (dt) => {
    if (a.path) { const [tx, tz] = a.path[(a.seg + 1) % a.path.length], dx = tx - root.position.x, dz = tz - root.position.z, d = Math.hypot(dx, dz); if (d < .1) a.seg = (a.seg + 1) % a.path.length; else { root.position.x += dx / d * a.speed * dt; root.position.z += dz / d * a.speed * dt; let e = Math.atan2(dx, dz) - root.rotation.y; e = Math.atan2(Math.sin(e), Math.cos(e)); root.rotation.y += e * Math.min(1, dt * 4); } }
    mixer?.update(dt); if (mixer) applyHead(dt);
  };
  root.userData.actor = a; return a;
}

// Kalabalık atlası: iskeletli karakterlerin yürüme kareleri dokuya çizilir. Her kişi iki üçgendir.
export const ATLAS = { cols: 8, rows: 4 };
let bakeRenderer = null; export const setBakeRenderer = (r) => { bakeRenderer = r; };
export function bakeCrowd(looks, { spear = false, yaw = Math.PI } = {}) {
  const r = bakeRenderer, size = 1024, rt = new THREE.WebGLRenderTarget(size, size, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, samples: 0 }), scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#ffffff', '#6a6a70', 2.4)); const dl = new THREE.DirectionalLight('#ffffff', 2.2); dl.position.set(1.5, 3, yaw === 0 ? 3 : -3); scene.add(dl);
  const cam = new THREE.OrthographicCamera(-.5, .5, 2.05, -.05, -5, 5); cam.position.set(0, 0, 0); cam.lookAt(0, 0, -1);
  const vp = r.getViewport(new THREE.Vector4()), sp = r.getScissor(new THREE.Vector4()), xr = r.xr.enabled, prevT = r.getRenderTarget(), pc = new THREE.Color(); r.getClearColor(pc); const pa = r.getClearAlpha(), tm = r.toneMapping, sm = r.shadowMap.autoUpdate, sc = r.getScissorTest();
  r.xr.enabled = false; r.toneMapping = THREE.NoToneMapping; r.setRenderTarget(rt); r.setClearColor(0, 0); r.clear(); r.setScissorTest(true);
  const cw = size / ATLAS.cols, ch = size / ATLAS.rows;
  looks.slice(0, ATLAS.rows).forEach((lk, row) => {
    const a = makeActor({ anim: 'Walk', ...lk }); a.root.rotation.y = yaw; scene.add(a.root); if (spear) { const s = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, 2.2, 4), new THREE.MeshLambertMaterial({ color: '#4a3a2a' })); s.position.set(.26, 1.1, 0); a.root.add(s); }
    const base = kit.models[lk.model || 'adv'], walk = a.mixer.clipAction(base.clips.Walk), idle = a.mixer.clipAction(base.clips.Idle_Neutral);
    for (let c = 0; c < ATLAS.cols; c++) {
      a.mixer.stopAllAction(); const act = c < 6 ? walk : idle, dur = act.getClip().duration; act.reset().play(); act.time = c < 6 ? c / 6 * dur : (c - 6) * .9; a.mixer.update(0);
      const x = c * cw, y = row * ch; r.setViewport(x, y, cw, ch); r.setScissor(x, y, cw, ch); r.render(scene, cam);
    }
    scene.remove(a.root);
  });
  r.setViewport(vp); r.setScissor(sp); r.setScissorTest(sc); r.setRenderTarget(prevT); r.setClearColor(pc, pa); r.toneMapping = tm; r.xr.enabled = xr; rt.texture.anisotropy = 2; return rt.texture;
}
