import * as THREE from 'three';
import * as T from './textures.js';
import { Panel } from './ui.js';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';
import { makeActor, scatter, prop } from './actors.js';

// Sabit güneş gölgesi: sahneye girişte bir kez çizilir, her karede maliyet getirmez.
function sunShadow(l, size, map = 2048) { l.castShadow = true; l.shadow.mapSize.set(map, map); const c = l.shadow.camera; c.left = c.bottom = -size; c.right = c.top = size; c.near = 1; c.far = 260; l.shadow.bias = -.0006; l.shadow.normalBias = .05; return l; }
const placed = (actors, g) => (o, x, z, ry = 0, anim) => { const a = makeActor({ anim, ...o }); a.root.position.set(x, 0, z); a.root.rotation.y = ry; g.add(a.root); actors.push(a); return a; };
const runActors = (actors, dt) => { for (const a of actors) if (a.root.parent?.visible) a.update(dt); };
function ring(g, n, mat, spots, w = .9, h = 1.1, d = .7) { const m = new THREE.InstancedMesh(new THREE.BoxGeometry(w, h, d), mat, spots.length), M = new THREE.Matrix4(); spots.forEach(([x, y, z], i) => { M.setPosition(x, y, z); m.setMatrixAt(i, M); }); m.castShadow = m.receiveShadow = true; m.userData.dyn = true; g.add(m); return m; }

const lam = (o) => new THREE.MeshLambertMaterial(o);
export const box = (w, h, d, m, x = 0, y = 0, z = 0) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); return b; };
const hitbox = (r, x, y, z) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); m.position.set(x, y, z); return m; };
export const glow = (size, color) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.soft(color), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); s.scale.setScalar(size); return s; };

// İnsan figürü iki parçadır: gövde ve baş. Parçalar tek geometride birleşir, renkler köşe rengindedir.
const figMat = lam({ vertexColors: true }), statueMat = lam({ color: '#c8c2b5' });
function paint(geo, color, m) { const c = new THREE.Color(color), n = geo.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) c.toArray(a, i * 3); geo.setAttribute('color', new THREE.BufferAttribute(a, 3)); if (m) geo.applyMatrix4(m); return geo.index ? geo.toNonIndexed() : geo; }
const place4 = (x, y, z, rx = 0, ry = 0, rz = 0, s = [1, 1, 1]) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(...s));
const ROBE = [[.001, 1.36], [.14, 1.34], [.2, 1.28], [.19, 1.12], [.145, .98], [.15, .92], [.2, .75], [.26, .42], [.3, .14], [.28, .12]].map(([x, y]) => new THREE.Vector2(x, y));
export function figure({ robe = '#7b2e22', cap = '#d8ccb2', hat = 'bork', skin = '#b98a66', stone = false } = {}) {
  const f = new THREE.Group(), darker = new THREE.Color(robe).multiplyScalar(.55).getStyle(), parts = [
    paint(new THREE.LatheGeometry(ROBE, 10), robe),
    paint(new THREE.CylinderGeometry(.16, .16, .05, 10), darker, place4(0, .95, 0)),
    paint(new THREE.CylinderGeometry(.07, .08, .14, 7), '#2a2019', place4(-.1, .07, 0)), paint(new THREE.CylinderGeometry(.07, .08, .14, 7), '#2a2019', place4(.1, .07, 0)),
  ];
  for (const s of [-1, 1]) {
    parts.push(paint(new THREE.CylinderGeometry(.062, .05, .34, 7), robe, place4(s * .23, 1.14, 0, 0, 0, s * .22)));
    parts.push(paint(new THREE.CylinderGeometry(.05, .04, .3, 7), robe, place4(s * .27, .86, .06, -.5, 0, s * .06)));
    parts.push(paint(new THREE.SphereGeometry(.045, 6, 5), skin, place4(s * .28, .72, .14)));
  }
  const body = new THREE.Mesh(mergeGeometries(parts), stone ? statueMat : figMat); f.add(body);
  const hp = [paint(new THREE.SphereGeometry(.105, 10, 8), skin, place4(0, 0, 0, 0, 0, 0, [.92, 1.08, .98])), paint(new THREE.CylinderGeometry(.05, .055, .12, 7), skin, place4(0, -.13, 0))];
  if (hat === 'turban') { hp.push(paint(new THREE.TorusGeometry(.095, .055, 6, 12), cap, place4(0, .055, 0, Math.PI / 2 - .1)), paint(new THREE.SphereGeometry(.095, 8, 6), cap, place4(0, .085, 0, 0, 0, 0, [1, .6, 1]))); }
  else if (hat === 'helm') { hp.push(paint(new THREE.SphereGeometry(.125, 10, 6, 0, 6.3, 0, 1.65), cap, place4(0, .02, 0)), paint(new THREE.ConeGeometry(.02, .08, 6), cap, place4(0, .15, 0))); }
  else { hp.push(paint(new THREE.CylinderGeometry(.09, .118, .2, 9), cap, place4(0, .13, 0)), paint(new THREE.TorusGeometry(.115, .018, 5, 12), darker, place4(0, .05, 0, Math.PI / 2))); }
  const head = new THREE.Group(), hm = new THREE.Mesh(mergeGeometries(hp), stone ? statueMat : figMat); head.position.y = 1.5; head.add(hm); f.add(head);
  f.userData.head = head; f.userData.dyn = true; f.userData.phase = Math.random() * 7; return f;
}
// Temas gölgeleri: figürleri ve nesneleri zemine oturtur, tek çizimdir.
function contactShadows(g, spots, tex = T.soft('0,0,0')) {
  const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: .55, depthWrite: false, fog: false }), spots.length), M = new THREE.Matrix4();
  spots.forEach(([x, y, z, s], i) => { M.compose(new THREE.Vector3(x, y + .025, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)), new THREE.Vector3(s, s, 1)); m.setMatrixAt(i, M); }); g.add(m); return m;
}
// Toz: havaya hacim katar.
function motes(g, n, [x0, x1], [y0, y1], [z0, z1], color, size) {
  const p = new Float32Array(n * 3); for (let i = 0; i < n; i++) p.set([x0 + Math.random() * (x1 - x0), y0 + Math.random() * (y1 - y0), z0 + Math.random() * (z1 - z0)], i * 3);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const o = new THREE.Points(geo, new THREE.PointsMaterial({ color, size, transparent: true, opacity: .4, depthWrite: false, map: T.soft('255,255,255'), blending: THREE.AdditiveBlending })); o.userData.dyn = true; g.add(o); return o;
}
// Hareket etmeyen ağları malzemeye göre birleştirir; Quest'te çizim çağrısını belirgin azaltır.
export function bakeStatic(root) {
  root.updateMatrixWorld(true); const groups = new Map(), stale = [];
  const walk = (o) => { if (o.userData.dyn || o.isSprite || o.isPoints || o.isInstancedMesh) return; if (o.isMesh && o.constructor === THREE.Mesh && o.material.visible && !o.material.transparent) { const k = o.material.uuid; (groups.get(k) || groups.set(k, []).get(k)).push(o); } o.children.forEach(walk); };
  walk(root);
  for (const list of groups.values()) {
    if (list.length < 2) { list[0].castShadow = list[0].receiveShadow = true; continue; }
    const geos = list.map(m => { const g = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()).applyMatrix4(m.matrixWorld); for (const a of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(a)) g.deleteAttribute(a); return g; });
    const merged = new THREE.Mesh(mergeGeometries(geos), list[0].material); merged.castShadow = merged.receiveShadow = true; root.add(merged); list.forEach(m => stale.push(m));
  }
  for (const m of stale) m.parent.remove(m);
}

export function buildMuseum() {
  const g = new THREE.Group(), L = 26, W = 13, H = 8, cz = -1;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, L), new THREE.MeshPhongMaterial({ map: T.marbleFloor(W / 2, L / 2), shininess: 70, specular: '#4a4238' })); floor.rotation.x = -Math.PI / 2; floor.position.z = cz; g.add(floor);
  const wall = lam(T.pbr(T.plaster(4, 2), 1.4)), dark = lam({ color: '#1b1411' }), stone = lam({ color: '#b8ae9c' }), gold = lam({ color: '#a97f2e', emissive: '#2f2108' });
  for (const s of [-1, 1]) { const m = box(.3, H, L, wall, s * (W / 2 + .15), H / 2, cz); g.add(m); }
  g.add(box(W, H, .3, wall, 0, H / 2, cz - L / 2 - .15), box(W, H, .3, wall, 0, H / 2, cz + L / 2 + .15), box(W, .3, L, dark, 0, H + .15, cz));
  const colG = new THREE.CylinderGeometry(.3, .36, H - .9, 14), cols = new THREE.InstancedMesh(colG, stone, 12), M = new THREE.Matrix4();
  for (let i = 0; i < 12; i++) { M.setPosition((i % 2 ? 1 : -1) * 5.2, (H - .9) / 2 + .45, 10 - (i >> 1) * 4.4); cols.setMatrixAt(i, M); }
  g.add(cols);
  for (const s of [-1, 1]) { g.add(box(.6, H * .06, L, gold, s * (W / 2 - .2), H - .22, cz)); }
  // Tavan kasetleri, süpürgelik ve ışık sütunları
  const coffer = lam({ color: '#33261c' }), rib = lam({ color: '#5b4530' });
  for (let z = 11; z > -14; z -= 4) g.add(box(W, .35, .28, rib, 0, H - .1, z));
  for (const x of [-4, 0, 4]) g.add(box(.28, .35, L, rib, x, H - .1, cz));
  g.add(box(W, .1, L, coffer, 0, H, cz));
  for (const s of [-1, 1]) g.add(box(.08, .5, L, stone, s * (W / 2 - .03), .25, cz));
  for (const z of [8, -1, -10]) { const beam = glow(9, '255,225,170'); beam.position.set(0, 5.2, z); beam.scale.set(4.5, 10, 1); beam.material.opacity = .08; g.add(beam); }
  // Yan duvar tabloları
  ['deniz', 'kubbe', 'sur', 'orman'].forEach((art, i) => {
    const tx = T.sceneArt(art);
    const s = i % 2 ? 1 : -1, z = 8 - (i >> 1) * 9, p = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.95), new THREE.MeshBasicMaterial({ map: tx }));
    p.position.set(s * (W / 2 - .05), 3, z); p.rotation.y = -s * Math.PI / 2; g.add(box(.06, 2.2, 2.85, gold, s * (W / 2 - .01), 3, z), p);
  });
  // Konuşan heykel
  const stA = makeActor({ model: 'king', stone: true, hat: 'none', scale: 1.18 }), statue = stA.root; statue.position.set(-3, .7, .5); statue.rotation.y = Math.PI / 2 - .1; statue.userData.head = stA.head; g.add(statue, box(1.3, .7, 1.3, stone, -3, .35, .5));
  // Kapılar
  const mkDoor = (x, title, sub, draw, color) => {
    const d = new THREE.Group(); d.position.set(x, 0, cz - L / 2 + .05);
    const p = new T.CrowdPainting(draw, 34), pic = new THREE.Mesh(new THREE.PlaneGeometry(3, 4.5), new THREE.MeshBasicMaterial({ map: p.t })); pic.position.set(0, 2.4, .12);
    d.add(box(3.4, 4.9, .2, gold, 0, 2.45, 0), pic);
    const l = new Panel(3, .72, { size: 62, bg: 'rgba(16,12,8,.92)' }).set(title, sub); l.position.set(0, 5.45, .12); d.add(l);
    const g2 = glow(5.4, color); g2.position.set(0, 2.5, -.2); g2.material.depthTest = false; g2.renderOrder = -1; d.add(g2);
    const hit = box(3.2, 4.8, .6, new THREE.MeshBasicMaterial({ visible: false }), 0, 2.4, .4); d.add(hit);
    Object.assign(d.userData, { painting: p, hit, glow: g2 }); g.add(d); return d;
  };
  const door1453 = mkDoor(-3, '1453', 'İstanbul', T.drawIstanbul, '255,180,100'), door1789 = mkDoor(3, '1789', 'Paris', T.drawParis, '150,180,220');
  // Koleksiyon kaideleri
  const mkPedestal = (z, tx) => {
    const p = new THREE.Group(); p.position.set(3, 0, z); p.add(box(.9, 1.05, .9, stone, 0, .525, 0));
    const m = new THREE.Mesh(new THREE.PlaneGeometry(.8, .6), new THREE.MeshBasicMaterial({ map: tx })); m.position.y = 1.08; m.rotation.x = -1.1; m.visible = false; p.add(m);
    const hit = hitbox(.75, 0, 1.1, 0), gl = glow(1.5, '255,210,130'); gl.position.y = 1.2; gl.visible = false; p.add(hit, gl); g.add(p);
    return { map: m, hit, glow: gl };
  };
  const pedestals = { istanbul: mkPedestal(1, T.drawMap()), paris: mkPedestal(-3.4, T.drawPamphlet()) };
  // Konfor levhası
  const comfort = new Panel(1.3, .46, { size: 50 }); comfort.position.set(W / 2 - .05, 1.45, 8.6); comfort.rotation.y = -Math.PI / 2; g.add(comfort);
  const lights = [[0, 6, 8, 34], [0, 6, -7, 42]].map(([x, y, z, i]) => { const l = new THREE.PointLight('#ffcf9a', i, 26, 1.6); l.position.set(x, y, z); return l; }); g.add(...lights);
  g.add(new THREE.HemisphereLight('#d6c4a8', '#2a1c14', 1.1));
  contactShadows(g, [[-3, 0, .5, 3], [3, 0, 1, 2.2], [3, 0, -3.4, 2.2], ...Array.from({ length: 12 }, (_, i) => [(i % 2 ? 1 : -1) * 5.2, 0, 10 - (i >> 1) * 4.4, 1.9])]);
  const spot = new THREE.SpotLight('#ffe2bb', 42, 30, 1.25, .6, 1.3); spot.position.set(.5, 7.45, 0); spot.target.position.set(0, 0, -1); spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -.0008; spot.shadow.normalBias = .04; g.add(spot, spot.target);
  const dust = motes(g, 90, [-6, 6], [.3, 6], [-13, 11], '#ffe2b0', .05);
  bakeStatic(g);
  return { dust, group: g, bounds: { x: [-6, 6], z: [-12.5, 11] }, floorY: 0, floor, statue, doors: { istanbul: door1453, paris: door1789 }, pedestals, comfort, fog: new THREE.Fog('#17100c', 16, 44), bg: '#120d0a' };
}

export function buildSiege() {
  const g = new THREE.Group();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(220, 24, 16), new THREE.MeshBasicMaterial({ map: T.duskSky(), side: THREE.BackSide, fog: false })); g.add(sky);
  const floorGeo = new THREE.PlaneGeometry(240, 160, 72, 48), fp = floorGeo.attributes.position;
  for (let i = 0; i < fp.count; i++) { const x = fp.getX(i), wz = -fp.getY(i) - 10, out = Math.max(0, Math.max(Math.abs(x) - 30, wz - 18) / 40); fp.setZ(i, Math.min(1, out) * (5.5 + 3 * Math.sin(x * .05) * Math.cos(wz * .07))); }
  floorGeo.computeVertexNormals();
  const floor = new THREE.Mesh(floorGeo, lam(T.pbr(T.dirt(38, 26), 1.6))); floor.rotation.x = -Math.PI / 2; floor.position.z = -10; g.add(floor);
  // Hendek, dış sur, iç sur
  const wa = lam(T.pbr(T.theodosianWall(44, 2.5))), ta = lam(T.pbr(T.theodosianWall(2.5, 5))), wb = lam(T.pbr(T.theodosianWall(44, 3.8))), dark = lam({ color: '#40362b' });
  g.add(box(240, .2, 15, lam({ color: '#2d2720' }), 0, .02, -33), box(240, 2.2, .8, dark, 0, 1.1, -26.5));
  g.add(box(240, 8.5, 2.4, wa, 0, 4.25, -41), box(240, 13, 4.8, wb, 0, 6.5, -52));
  const towers = [], merlons = new THREE.InstancedMesh(new THREE.BoxGeometry(.9, 1.1, .7), lam({ color: '#6f6658' }), 180), M = new THREE.Matrix4(); let mi = 0;
  for (let x = -96; x <= 96; x += 24) { towers.push(box(8, 8.5 + 3, 6, ta, x + 12, 5.75, -41), box(10, 21, 10, ta, x, 10.5, -52)); }
  g.add(...towers);
  for (let x = -108; x <= 108 && mi < 180; x += 2.4) { M.setPosition(x, 9, -40.2); merlons.setMatrixAt(mi++, M); M.setPosition(x, 13.5, -49.8); merlons.setMatrixAt(mi++, M); }
  merlons.count = mi; g.add(merlons); merlons.castShadow = merlons.receiveShadow = true; merlons.userData.dyn = true;
  // Kule mazgalları, ok yarıkları, gedik ve geçici onarım
  const stoneM = lam({ color: '#6f6658' }), tm = [], slits = [];
  for (let x = -96; x <= 96; x += 24) { for (let k = -2; k <= 2; k++) tm.push([x + k * 2.2, 21.5, -47.2], [x + 5, 21.5, -52 + k * 2.2], [x - 5, 21.5, -52 + k * 2.2]); for (let k = -1; k <= 1; k++) tm.push([x + 12 + k * 3, 12, -38]); for (const y of [8, 13, 17]) slits.push([x, y, -46.95]); slits.push([x + 12, 7, -37.95]); }
  ring(g, 0, stoneM, tm, 1, 1.2, .8); ring(g, 0, new THREE.MeshBasicMaterial({ color: '#17120e' }), slits, .35, 1.5, .08);
  scatter(g, 'rock_large', Array.from({ length: 16 }, (_, i) => [8 + i * .85 + Math.sin(i) * 1.2, -.1, -38.6 + (i % 4) * .9 + Math.cos(i * 2), 1.1 + (i % 3) * .55, i]));
  const stock = lam({ map: T.wood(1, 3) }); for (let x = 10; x < 20; x += .55) { const b = new THREE.Mesh(new THREE.CylinderGeometry(.14, .17, 3.4, 6), stock); b.position.set(x, 8.8 + (x * 7 % 1) * .5, -40.2); b.rotation.z = Math.sin(x * 3) * .14; g.add(b); }
  scatter(g, 'tree_pine_tall', Array.from({ length: 26 }, (_, i) => [(i % 2 ? 1 : -1) * (30 + (i * 17 % 60)), 2, 8 + (i * 23 % 70), 3 + i % 3, i]));
  scatter(g, 'tree_oak', Array.from({ length: 12 }, (_, i) => [(i % 2 ? 1 : -1) * (29 + (i * 13 % 40)), 1, -12 + (i * 11 % 28), 2.4 + i % 2, i]));
  // Ordugâh çadırları
  const tentMat = [lam({ color: '#c5b190' }), lam({ color: '#a1402f' }), lam({ color: '#d8c8a8' })], tentGeo = new THREE.ConeGeometry(2.3, 2.9, 10);
  const tents = [[-17, 7], [-11, 11], [-3, 13], [6, 12], [13, 8], [17, 3], [-20, -2], [20, -8], [-22, 15], [2, 20], [14, 18], [-13, 20]];
  tents.forEach(([x, z], i) => { const t = new THREE.Mesh(tentGeo, tentMat[i % 3]); t.position.set(x, 1.45, z); t.scale.setScalar(1 + (i % 3) * .2); g.add(t); });
  // Çit: hendek gerisindeki ahşap perde
  const woodM = lam({ map: T.wood(3, 1) }), posts = new THREE.InstancedMesh(new THREE.CylinderGeometry(.11, .14, 2.6, 6), woodM, 44); let pi = 0;
  for (let x = -24; x <= 24; x += 1.12) { if (Math.abs(x - 4) < 1.7) continue; M.setPosition(x, 1.3, -18); posts.setMatrixAt(pi++, M); } posts.count = pi; g.add(posts);
  // Büyük top
  const bronze = lam({ color: '#7b5d33', emissive: '#150c04' }), gun = new THREE.Group(); gun.position.set(4, 0, -12.5);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(.62, .55, 5.4, 18, 1), bronze); barrel.rotation.x = Math.PI / 2 - .05; barrel.position.y = 1.15; gun.add(barrel);
  const chamber = new THREE.Mesh(new THREE.CylinderGeometry(.46, .46, 2.8, 16), bronze); chamber.rotation.x = Math.PI / 2 - .05; chamber.position.set(0, 1, 3.9); gun.add(chamber);
  for (let i = 0; i < 6; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(i % 2 ? .47 : .63, .05, 6, 18), bronze); r.position.set(0, 1.15 - .05 + i * 0 , -2.4 + i * 1.3); gun.add(r); }
  gun.add(box(2.2, .25, 8.4, woodM, 0, .13, 1), box(.3, .5, 8.4, woodM, -.98, .4, 1), box(.3, .5, 8.4, woodM, .98, .4, 1));
  const muzzle = new THREE.Vector3(4, 1.3, -15.6); g.add(gun);
  // Taş gülleler
  const ballM = lam({ color: '#a89e8d' });
  for (const [x, z] of [[8.5, -8], [9.8, -7.2], [9, -6.2], [8.7, -7.1]]) { const b = new THREE.Mesh(new THREE.SphereGeometry(.62, 12, 10), ballM); b.position.set(x, .62, z); g.add(b); }
  // Ateşler
  const fires = [[-9, 0], [11, 2], [-1, 7]].map(([x, z]) => { const s = glow(2.4, '255,130,50'); s.position.set(x, .8, z); prop(g, 'campfire', x, 0, z, 1.4); return s; });
  for (const [n, x, z, s, r] of [['barrels', 7, -10.5, 1.6, .4], ['barrels', 0, -5, 1.3, 2], ['barrel', 1, -3.8, 1.5, 0], ['log', -3, -9, 1, .7], ['log', 7, -2.5, 1.1, 2], ['crate', 6.8, -4.5, 1.3, .5]]) prop(g, n, x, 0, z, s, r);
  const fireLight = new THREE.PointLight('#ff8a3c', 45, 24, 1.8); fireLight.position.set(-1, 2.6, 1); g.add(fireLight);
  // İnsanlar
  const people = [], actors = [], hero = placed(actors, g);
  const add = (o, x, z, ry) => { const f = figure(o); f.position.set(x, 0, z); f.rotation.y = ry; g.add(f); people.push(f); return f; };
  hero({ robe: '#3d3a4a', cap: '#e4dcc8', hat: 'turban', hair: '#6a6258' }, 2.4, -6.8, -1.1, 'Idle_Sword');
  hero({ robe: '#7a3a25', cap: '#a89a7e', hat: 'bork' }, -1.2, -7, .8, 'HitRecieve_2');
  hero({ robe: '#3b4f3c', cap: '#d8ccb2', hat: 'bork' }, 0, 0, 0).patrol([[-13, -8], [-3, 2], [9, -1], [13, -9]]);
  hero({ robe: '#6e2a21', cap: '#e8e0ce', hat: 'turban' }, 0, 0, 0).patrol([[12, -19], [-10, -21]], 1);
  const groups = [[hero({ robe: '#27415a', cap: '#e8e0ce', hat: 'turban' }, 9, -21, -1.4, 'Interact').root, hero({ robe: '#6e2a21', cap: '#e8e0ce', hat: 'bork' }, 10.4, -20.6, -2.2).root], [hero({ robe: '#4a4f34', cap: '#cfc3a6', hat: 'bork' }, -11, -19.5, 1.2, 'Idle_Sword').root, hero({ robe: '#3f2d24', cap: '#cfc3a6', hat: 'turban' }, -12.2, -20.4, .3).root]];
  for (const [x, z, r] of [[-6, 0, .4], [7, 4, 2.5], [-13, 3, 1], [12, -3, 3.5], [0, 3, 1.5], [-15, -8, 2], [15, -12, 4]]) add({ robe: ['#6e2a21', '#27415a', '#5a4a30'][Math.abs(x) % 3], hat: x % 2 ? 'bork' : 'turban' }, x, z, r);
  // Sur üzerindeki savunmacılar
  for (let x = -30; x <= 30; x += 10) { const f = figure({ robe: '#4e4b53', cap: '#8d8d92', hat: 'helm' }); f.position.set(x + 1.5, 13, -50.9); g.add(f); }
  const nikolas = makeActor({ model: 'adv', robe: '#4a4f60', hat: 'none', anim: 'Idle_Neutral' }); nikolas.root.position.set(16, 13, -53); nikolas.root.rotation.y = .4; g.add(nikolas.root); actors.push(nikolas);
  // Duvardan görülen ordugâh ateşleri ve toz
  const far = new Float32Array(900); for (let i = 0; i < 300; i++) far.set([-140 + Math.random() * 280, .8, 16 + Math.random() * 110], i * 3);
  const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(far, 3)); const campfires = new THREE.Points(fg, new THREE.PointsMaterial({ color: '#ff9440', size: 1.1, map: T.soft('255,255,255'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); campfires.userData.dyn = true; g.add(campfires);
  motes(g, 120, [-24, 24], [.4, 7], [-26, 14], '#ffc890', .08);
  contactShadows(g, [...people.map(p => [p.position.x, 0, p.position.z, 1.1]), ...groups.flat().map(p => [p.position.x, 0, p.position.z, 1.1]), [2.4, 0, -6.8, 1.1], [-1.2, 0, -7, 1.1], [4, 0, -11.5, 6], ...tents.map(([x, z]) => [x, 0, z, 7]), ...[[8.5, -8], [9.8, -7.2], [9, -6.2], [8.7, -7.1]].map(([x, z]) => [x, 0, z, 2])]);
  bakeStatic(g);
  const smoke = makeSmoke(g, 10), flash = glow(11, '255,210,140'); flash.position.copy(muzzle); flash.visible = false; g.add(flash);
  g.add(new THREE.HemisphereLight('#c8a68a', '#32281e', 1.2)); const sun = sunShadow(new THREE.DirectionalLight('#ffb878', 2.6), 72); sun.position.set(-60, 42, 90); sun.target.position.set(0, 0, -20); g.add(sun, sun.target);
  let flashT = 0;
  return { group: g, groups, actors, floorY: 0, fog: new THREE.Fog('#7c5a48', 30, 150), bg: '#3a2c2c',
    climax(sound) { sound.cannon(); flash.visible = true; flashT = .18; smoke.burst(muzzle, 6, 2.4); smoke.burst(new THREE.Vector3(14, 7, -39.6), 4, 1.1, 1.3); },
    reset() { smoke.clear(); flash.visible = false; },
    tick(dt, t) { runActors(actors, dt); fires.forEach((f, i) => f.scale.setScalar(2.2 + Math.sin(t * 9 + i * 2) * .3)); fireLight.intensity = 42 + Math.sin(t * 11) * 7; for (const f of people) f.userData.head.rotation.y = Math.sin(t * .7 + f.userData.phase) * .35; if (flashT > 0 && (flashT -= dt) <= 0) flash.visible = false; smoke.tick(dt); } };
}

function makeSmoke(g, n) {
  const list = Array.from({ length: n }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.soft('190,180,165'), transparent: true, opacity: 0, depthWrite: false })); s.visible = false; g.add(s); return s; }); let next = 0;
  return {
    burst(pos, k, v, delay = 0) { for (let i = 0; i < k; i++) { const p = list[next++ % n]; p.position.copy(pos); p.position.x += (i - k / 2) * .35; p.userData = { v, age: -delay, dx: (i - k / 2) * .2 }; p.material.opacity = 0; p.visible = true; } },
    clear() { list.forEach(p => { p.visible = false; }); },
    tick(dt) { for (const p of list) { const u = p.userData; if (!p.visible) continue; u.age += dt; if (u.age < 0) continue; const o = .6 - u.age * .11; if (o <= 0) { p.visible = false; continue; } p.material.opacity = o; p.position.y += u.v * dt * .5; p.position.x += u.dx * dt; p.scale.setScalar(1.8 + u.age * 1.3); } },
  };
}

function houses(g, side, from, to, x, colors, roof) {
  const r = lam({ color: roof });
  for (let z = from, i = 0; z > to; z -= 6, i++) {
    const h = 6.5 + (i * 37 % 4), m = colors[i % colors.length]; g.add(box(6, h, 5.6, m, side * x, h / 2, z), box(6.5, .25, 6.1, r, side * x, h, z));
    const c = new THREE.Mesh(new THREE.ConeGeometry(4.6, 2, 4), r); c.position.set(side * x, h + 1, z); c.rotation.y = Math.PI / 4; c.scale.z = .9; g.add(c);
  }
}

export function buildCity() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.SphereGeometry(200, 20, 12), new THREE.MeshBasicMaterial({ map: T.duskSky(), side: THREE.BackSide, fog: false })));
  const f = new THREE.Mesh(new THREE.PlaneGeometry(40, 120), lam(T.pbr(T.cobbles(18, 54), 3))); f.rotation.x = -Math.PI / 2; f.position.z = -30; g.add(f);
  const walls = [0, 1, 2].map(i => lam(T.pbr(T.facade('istanbul', i), 1.2)));
  houses(g, -1, 10, -20, 7.5, walls, '#6e3a2a'); houses(g, 1, 10, -20, 7.5, walls, '#5c3226');
  g.add(box(8, 5, .4, walls[0], 0, 2.5, 13));
  // Ayasofya'nın uzak silueti: sokağın sonunda görünür
  const dome = lam({ color: '#8d6f62' }), d = new THREE.Mesh(new THREE.SphereGeometry(13, 18, 10, 0, 6.3, 0, 1.6), dome); d.position.set(0, 23, -74); d.scale.y = .62;
  g.add(d, box(38, 20, 34, dome, 0, 10, -74), box(30, 3.4, 30, dome, 0, 21, -74));
  for (const k of [-1, 1]) { const hd = new THREE.Mesh(new THREE.SphereGeometry(9.5, 16, 8, 0, 6.3, 0, 1.6), dome); hd.position.set(0, 17.5, -74 + k * 15); hd.scale.y = .62; g.add(hd); for (const s of [-1, 1]) g.add(box(4, 24, 9, dome, s * 21, 12, -74 + k * 12)); }
  const glowW = lam({ color: '#ffb864', emissive: '#c07020' }); for (let i = 0; i < 24; i++) { const a = i / 24 * 6.283; g.add(box(.9, 1.4, .3, glowW, Math.sin(a) * 12.6, 23.5, -74 + Math.cos(a) * 12.6)); }
  // Fırın
  const brick = lam({ color: '#7a4a38' }), oven = new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 8, 0, 6.3, 0, 1.6), brick); oven.position.set(-3.9, .9, 5.4); g.add(oven);
  const coal = glow(1.2, '255,120,40'); coal.position.set(-3.3, .9, 5.4); g.add(coal);
  // Eleni, ev kapısı ve komşular
  const actors = [], hero = placed(actors, g); hero({ model: 'hood', robe: '#b9a06a', hat: 'none', scale: .72 }, 2.6, -8, 0);
  hero({ model: 'hood', robe: '#4d3b5b', hat: 'none' }, -2.8, -4, 1.3, 'Interact'); hero({ robe: '#3e4f4a', hat: 'none' }, 3.3, 0, -2);
  hero({ robe: '#6a3a30', hat: 'none' }, 0, 0, 0).patrol([[1.4, 9], [-1.5, -16]], 1); hero({ model: 'hood', robe: '#51443a', hat: 'none' }, 0, 0, 0).patrol([[-2, -15], [2, 7]], .9);
  g.add(box(1.5, 2.5, .15, lam({ map: T.wood(1, 1) }), 3.6, 1.25, -8.8));
  const people = [];
  for (const [x, z, r, c] of [[-3.4, -12, .6, '#3e4f4a'], [1.5, -15, 3, '#51443a'], [-1.5, -17, 3.1, '#3d3a4a']]) { const p = figure({ robe: c, hat: 'turban', cap: '#ddd2bc' }); p.position.set(x, 0, z); p.rotation.y = r; g.add(p); people.push(p); }
  motes(g, 70, [-4, 4], [.4, 5], [-18, 10], '#ffc890', .05);
  contactShadows(g, [...people.map(p => [p.position.x, 0, p.position.z, 1.1]), ...Array.from({ length: 12 }, (_, i) => [i % 2 ? 4.6 : -4.6, 0, 10 - (i >> 1) * 5, 3])]);
  const smoke = makeSmoke(g, 8), light = new THREE.PointLight('#ff9550', 30, 16, 1.6); light.position.set(-3, 2.6, 5); g.add(light);
  g.add(new THREE.HemisphereLight('#c8a68a', '#2c221a', 1.2)); const sun = sunShadow(new THREE.DirectionalLight('#ffb878', 2.4), 34, 1536); sun.position.set(-24, 30, 34); sun.target.position.set(0, 0, -6); g.add(sun, sun.target);
  bakeStatic(g);
  return { group: g, groups: [], actors, floorY: 0, fog: new THREE.Fog('#a07458', 70, 320), bg: '#3a2c2c',
    climax(sound) { sound.thud(40, 2.4, 1.2, .25); smoke.burst(new THREE.Vector3(0, 11, -22), 8, 1.1); },
    reset() { smoke.clear(); },
    tick(dt, t) { runActors(actors, dt); light.intensity = 28 + Math.sin(t * 9) * 4; for (const p of people) p.userData.head.rotation.y = Math.sin(t * .6 + p.userData.phase) * .3; smoke.tick(dt); } };
}

export function buildParis() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.SphereGeometry(220, 20, 12), new THREE.MeshBasicMaterial({ map: T.daySky(), side: THREE.BackSide, fog: false })));
  const f = new THREE.Mesh(new THREE.PlaneGeometry(90, 130), lam(T.pbr(T.cobbles(40, 58), 3))); f.rotation.x = -Math.PI / 2; f.position.z = -20; g.add(f);
  const walls = [0, 1, 2].map(i => lam(T.pbr(T.facade('paris', i), 1.2)));
  houses(g, -1, 13, -30, 18, walls, '#3f4449'); houses(g, 1, 13, -30, 18, walls, '#3f4449');
  g.add(box(30, 7, .5, walls[1], 0, 3.5, 15));
  // Bastille: sekiz kule ve hendek. Çağdaş ölçümlere göre çevre binalarla yakın yükseklikteydi.
  const s = lam(T.pbr(T.ashlar(8, 3))), Z = -44;
  g.add(box(36, 15, 16, s, 0, 7.5, Z), box(60, .25, 8, new THREE.MeshPhongMaterial({ color: '#2a3a3c', shininess: 90, specular: '#7a8a8a' }), 0, .06, Z + 11));
  const tg = new THREE.CylinderGeometry(4.2, 4.2, 19, 16);
  for (const [x, z] of [[-18, 8], [-6, 8.5], [6, 8.5], [18, 8], [-18, -8], [-6, -8.5], [6, -8.5], [18, -8]]) { const t = new THREE.Mesh(tg, s); t.position.set(x, 9.5, Z + z); g.add(t); }
  const bm = [], bs = []; for (const [x, z] of [[-18, 8], [-6, 8.5], [6, 8.5], [18, 8]]) { for (let a = 0; a < 12; a++) bm.push([x + Math.sin(a * .5236) * 4.3, 19.5, Z + z + Math.cos(a * .5236) * 4.3]); for (const y of [7, 12, 16]) bs.push([x, y, Z + z + 4.25]); } for (let x = -13.2; x <= 13.2; x += 2.4) bm.push([x, 15.5, Z + 7.6]);
  ring(g, 0, lam({ color: '#6f685c' }), bm, .95, 1.1, .95); ring(g, 0, new THREE.MeshBasicMaterial({ color: '#17130f' }), bs, .3, 1.5, .08);
  const gate = box(4.4, 6, .5, new THREE.MeshBasicMaterial({ color: '#15110e' }), 0, 3, Z + 12.8); g.add(gate);
  const bridge = new THREE.Group(); bridge.position.set(0, .35, Z + 12.9); const plank = box(4, .25, 8.5, lam({ map: T.wood(2, 3) }), 0, 0, 4.2); bridge.add(plank); bridge.rotation.x = -Math.PI / 2 + .12; bridge.userData.dyn = true; g.add(bridge);
  for (const sx of [-1.9, 1.9]) g.add(box(.08, .08, 8, lam({ color: '#222' }), sx, 3.8, Z + 16.6));
  // Pazar tezgâhları ve matbaa
  const wood = lam({ map: T.wood(2, 1) }), cloth = [lam({ color: '#a33c2e' }), lam({ color: '#d8c8a8' }), lam({ color: '#2f4a68' })];
  for (const [i, [x, z]] of [[9, 7], [12, 2], [-12, -3]].entries()) { g.add(box(3, .8, 1.5, wood, x, .4, z), box(3.5, .08, 2.1, cloth[i], x, 2.3, z)); for (const k of [-1.5, 1.5]) g.add(box(.08, 2.3, .08, wood, x + k, 1.15, z + .9)); }
  g.add(box(1.4, 1.9, 1, lam({ map: T.wood(1, 2) }), -11.2, .95, 3.4), box(.5, 1.4, .5, wood, -11.2, 2.4, 3.4));
  // Kalabalık: performans için tek çizimde
  const cb = new THREE.InstancedMesh(new THREE.CylinderGeometry(.17, .28, 1.3, 7), lam({ color: '#fff' }), 90), ch = new THREE.InstancedMesh(new THREE.SphereGeometry(.12, 8, 6), lam({ color: '#b98a66' }), 90), M = new THREE.Matrix4(), col = new THREE.Color(), base = [];
  for (let i = 0; i < 90; i++) { const x = (i * 73 % 200) / 10 - 10, z = -30 + (i * 41 % 180) / 10; base.push([x, z, i * 1.7]); M.setPosition(x, .65, z); cb.setMatrixAt(i, M); M.setPosition(x, 1.45, z); ch.setMatrixAt(i, M); cb.setColorAt(i, col.set(['#3a3f4a', '#6e2a21', '#2d3f73', '#5a4a30', '#c8bda6'][i % 5])); }
  g.add(cb, ch);
  const people = [], actors = [], hero = placed(actors, g);
  const add = (o, x, z, r) => { const p = figure(o); p.position.set(x, 0, z); p.rotation.y = r; g.add(p); people.push(p); return p; };
  hero({ robe: '#26303a', hat: 'none' }, -3.4, -9, 1, 'Wave'); hero({ robe: '#2d3f73', cap: '#16161c', hat: 'tricorne' }, 6, -16, 2.6, 'Idle_Gun'); hero({ model: 'hood', robe: '#5a4a50', hat: 'none' }, -5, 1, 1.4);
  hero({ robe: '#3a3f4a', hat: 'none' }, 0, 0, 0).patrol([[-10, 6], [-2, -8], [8, -4]]); hero({ model: 'hood', robe: '#7a5a2a', hat: 'none' }, 0, 0, 0).patrol([[10, 9], [3, -2], [-9, 2]], 1);
  const groups = [[hero({ robe: '#6e2a21', hat: 'none' }, 8, -2, -1, 'Interact').root, hero({ robe: '#3a3f4a', hat: 'none' }, 9.2, -1.6, -2).root], [hero({ model: 'hood', robe: '#c8bda6', hat: 'none' }, -8, -2, 1.2, 'Interact').root, hero({ model: 'hood', robe: '#5a4a30', hat: 'none' }, -9.3, -2.8, .3).root]];
  motes(g, 100, [-16, 16], [.4, 6], [-28, 12], '#ffffff', .06);
  contactShadows(g, [...people.map(p => [p.position.x, 0, p.position.z, 1.1]), ...base.filter((_, i) => i % 2).map(([x, z]) => [x, 0, z, 1])]);
  bakeStatic(g);
  const smoke = makeSmoke(g, 10);
  g.add(new THREE.HemisphereLight('#dfe1dc', '#544a3e', 1.35)); const sun = sunShadow(new THREE.DirectionalLight('#fff0d8', 2.4), 60); sun.position.set(36, 60, 40); sun.target.position.set(0, 0, -18); g.add(sun, sun.target);
  let drop = 0, cheer = 0;
  return { group: g, groups, actors, floorY: 0, fog: new THREE.Fog('#aeb2ae', 34, 150), bg: '#aeb2ae',
    climax(sound) { sound.thud(70, 1.1, .9, .1); sound.thud(52, 1.6, 1.2, .9); drop = 1; cheer = 1; smoke.burst(new THREE.Vector3(0, 2, -30), 8, 1.6, .4); },
    reset() { smoke.clear(); bridge.rotation.x = -Math.PI / 2 + .12; drop = 0; cheer = 0; },
    tick(dt, t) { runActors(actors, dt); if (drop) { bridge.rotation.x = Math.min(0, bridge.rotation.x + dt * 1.1); if (bridge.rotation.x === 0) drop = 0; }
      for (let i = 0; i < 90; i += cheer ? 1 : 3) { const [x, z, ph] = base[i], y = Math.abs(Math.sin(t * (2 + cheer * 4) + ph)) * (.05 + cheer * .32); M.setPosition(x, .65 + y, z); cb.setMatrixAt(i, M); M.setPosition(x, 1.45 + y, z); ch.setMatrixAt(i, M); } cb.instanceMatrix.needsUpdate = true; ch.instanceMatrix.needsUpdate = true;
      for (const p of people) p.userData.head.rotation.y = Math.sin(t * .7 + p.userData.phase) * .35; smoke.tick(dt); } };
}

// Karakterin taşıdığı nesneler
export function makeItem(kind) {
  const it = new THREE.Group(), wood = lam({ map: T.wood(1, 1) });
  if (kind === 'wad') { it.add(new THREE.Mesh(new THREE.CylinderGeometry(.13, .13, .16, 12), wood)); }
  if (kind === 'basket') { const b = new THREE.Mesh(new THREE.CylinderGeometry(.2, .14, .24, 10), lam({ color: '#8b6a3e' })); const e = new THREE.Mesh(new THREE.CircleGeometry(.19, 10), lam({ color: '#3b2c1e' })); e.rotation.x = -Math.PI / 2; e.position.y = .1; it.add(b, e); }
  if (kind === 'bread') { const b = new THREE.Mesh(new THREE.SphereGeometry(.13, 10, 8), lam({ color: '#b98745' })); b.scale.set(1.5, .7, 1); it.add(b); }
  if (kind === 'paper') { it.add(box(.3, .06, .22, lam({ color: '#e4dcc8' }))); }
  if (kind === 'box') { it.add(box(.28, .16, .18, lam({ color: '#2a2622' }))); }
  return it;
}

// Dönem kollu el. Zaman yolcusuyken saydam, hafıza geçişinde gerçek kıyafetli görünür.
export function makeHand() {
  const skin = lam({ color: '#b98a66', transparent: true }), sleeve = lam({ color: '#6c5236', transparent: true }), h = new THREE.Group();
  h.add(box(.075, .028, .09, skin, 0, 0, -.015));
  const fingers = []; for (let i = 0; i < 4; i++) { const p = new THREE.Group(); p.position.set(-.027 + i * .018, 0, -.058); p.add(box(.015, .017, .07, skin, 0, 0, -.033)); h.add(p); fingers.push(p); }
  h.userData.setGrip = (v) => { for (const p of fingers) p.rotation.x = -v * 1.25; };
  const th = box(.02, .019, .055, skin, .05, 0, -.03); th.rotation.y = -.6; h.add(th);
  const s = new THREE.Mesh(new THREE.CylinderGeometry(.042, .062, .3, 10), sleeve); s.rotation.x = Math.PI / 2; s.position.z = .19; h.add(s);
  const cuff = new THREE.Mesh(new THREE.TorusGeometry(.046, .009, 6, 12), lam({ color: '#c9b48a', transparent: true })); cuff.position.z = .05; h.add(cuff);
  h.userData.setSleeve = (c) => sleeve.color.set(c);
  h.userData.setPersona = (on) => { for (const m of [skin, sleeve, cuff.material]) { m.opacity = on ? 1 : .22; m.emissive?.set(on ? '#000' : '#264a66'); } };
  h.userData.setPersona(false); return h;
}
