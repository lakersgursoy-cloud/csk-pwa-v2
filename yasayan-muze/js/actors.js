// CC0 iskeletli karakterler: rol renkleri, dönem başlıkları ve animasyon.
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { MeshoptDecoder } from '../vendor/meshopt_decoder.module.js';
import { clone as cloneSkinned } from '../vendor/SkeletonUtils.js';

const HEIGHT = { adv: 1.72, king: 1.76, hood: 1.64 }, FILE = { adv: 'adventurer', king: 'monarch', hood: 'hooded_adventurer' };
const PROPS = ['barrel', 'barrels', 'campfire', 'log', 'rock_large', 'rock_tall', 'stump', 'tree_pine_tall', 'tree_oak', 'crate'];
const kit = { models: {}, props: {} };
const shade = (c, k) => new THREE.Color(c).multiplyScalar(k);

export async function loadKit() {
  const l = new GLTFLoader(); l.setMeshoptDecoder(MeshoptDecoder);
  await Promise.all([
    ...Object.entries(FILE).map(async ([k, f]) => {
      const g = await l.loadAsync(`./assets/${f}.glb`), clips = {}; for (const a of g.animations) clips[a.name.split('|').pop()] = a;
      g.scene.getObjectByName('Sword')?.removeFromParent(); g.scene.getObjectByName('Backpack')?.removeFromParent();
      g.scene.updateMatrixWorld(true); const box = new THREE.Box3().setFromObject(g.scene), s = HEIGHT[k] / (box.max.y - box.min.y), head = g.scene.getObjectByName('Head').getWorldPosition(new THREE.Vector3());
      kit.models[k] = { scene: g.scene, clips, scale: s, headTop: { adv: .2, king: .2, hood: .19 }[k] };
    }),
    ...PROPS.map(async p => { kit.props[p] = (await l.loadAsync(`./assets/${p}.glb`)).scene; }),
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
    if (stone) return stoneM;
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
  a.patrol = (pts, speed = 1.15) => { a.path = pts; a.seg = 0; a.speed = speed; root.position.set(pts[0][0], 0, pts[0][1]); a.play('Walk', 0); };
  a.update = (dt) => {
    if (a.path) { const [tx, tz] = a.path[(a.seg + 1) % a.path.length], dx = tx - root.position.x, dz = tz - root.position.z, d = Math.hypot(dx, dz); if (d < .1) a.seg = (a.seg + 1) % a.path.length; else { root.position.x += dx / d * a.speed * dt; root.position.z += dz / d * a.speed * dt; let e = Math.atan2(dx, dz) - root.rotation.y; e = Math.atan2(Math.sin(e), Math.cos(e)); root.rotation.y += e * Math.min(1, dt * 4); } }
    mixer?.update(dt);
  };
  return a;
}
