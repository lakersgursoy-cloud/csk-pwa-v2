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
  const mkDoor = (x, title, sub, draw, color, side = 0, wz = 0) => {
    const d = new THREE.Group(); d.position.set(x, 0, cz - L / 2 + .05); if (side) { d.position.set(side * (W / 2 - .05), 0, wz); d.rotation.y = -side * Math.PI / 2; } d.scale.set(.86, .86, 1);
    const p = new T.CrowdPainting(draw, 34), pic = new THREE.Mesh(new THREE.PlaneGeometry(3, 4.5), new THREE.MeshBasicMaterial({ map: p.t })); pic.position.set(0, 2.4, .12);
    d.add(box(3.4, 4.9, .2, gold, 0, 2.45, 0), pic);
    const l = new Panel(3, .72, { size: 62, bg: 'rgba(16,12,8,.92)' }).set(title, sub); l.position.set(0, 5.45, .12); d.add(l);
    const g2 = glow(5.4, color); g2.position.set(0, 2.5, -.2); g2.material.depthTest = false; g2.renderOrder = -1; d.add(g2);
    const hit = box(3.2, 4.8, .6, new THREE.MeshBasicMaterial({ visible: false }), 0, 2.4, .4); d.add(hit);
    Object.assign(d.userData, { painting: p, hit, glow: g2 }); g.add(d); return d;
  };
  const door1453 = mkDoor(-4.65, '1453', 'İstanbul', T.drawIstanbul, '255,180,100'), door1492 = mkDoor(-1.55, '1492', 'Guanahani', T.drawGuanahani, '120,200,210'), door1789 = mkDoor(1.55, '1789', 'Paris', T.drawParis, '150,180,220'), door1923 = mkDoor(4.65, '1923', 'Ankara', T.drawAnkara, '255,120,110'), door1804 = mkDoor(0, '1804', 'Notre-Dame', T.drawNotre, '255,200,110', -1, -5.4), door1945 = mkDoor(0, '1945', 'Hiroşima', T.drawHiroshima, '200,210,220', -1, -9.8), door1989 = mkDoor(0, '1989', 'Berlin', T.drawBerlin, '160,180,230', 1, -5.4), door2001 = mkDoor(0, '2001', 'New York', T.drawNYC, '190,215,255', 1, -9.8);
  // Koleksiyon kaideleri
  const mkPedestal = (z, tx, x = 3) => {
    const p = new THREE.Group(); p.position.set(x, 0, z); p.add(box(.9, 1.05, .9, stone, 0, .525, 0));
    const m = new THREE.Mesh(new THREE.PlaneGeometry(.8, .6), new THREE.MeshBasicMaterial({ map: tx })); m.position.y = 1.08; m.rotation.x = -1.1; m.visible = false; p.add(m);
    const hit = hitbox(.75, 0, 1.1, 0), gl = glow(1.5, '255,210,130'); gl.position.y = 1.2; gl.visible = false; p.add(hit, gl); g.add(p);
    return { map: m, hit, glow: gl, pos: [x, z] };
  };
  const pedestals = { istanbul: mkPedestal(1, T.drawMap()), paris: mkPedestal(-3.4, T.drawPamphlet()), ankara: mkPedestal(-7.8, T.drawGazette()), guanahani: mkPedestal(-5.4, T.drawBeads(), -3), napolyon: mkPedestal(5.4, T.drawInvite(), -3), hiroshima: mkPedestal(5.4, T.drawCrane(), 3), berlin: mkPedestal(-9.6, T.drawWallPiece(), -2.4), nyc: mkPedestal(-11, T.drawRibbon(), 1.6) };
  // Konfor levhası
  const comfort = new Panel(1.3, .46, { size: 50 }); comfort.position.set(W / 2 - .05, 1.45, 8.6); comfort.rotation.y = -Math.PI / 2; g.add(comfort);
  const lights = [[0, 6, 8, 34], [0, 6, -7, 42]].map(([x, y, z, i]) => { const l = new THREE.PointLight('#ffcf9a', i, 26, 1.6); l.position.set(x, y, z); return l; }); g.add(...lights);
  g.add(new THREE.HemisphereLight('#d6c4a8', '#2a1c14', 1.1));
  contactShadows(g, [[-3, 0, .5, 3], [3, 0, 1, 2.2], [3, 0, -3.4, 2.2], [3, 0, -7.8, 2.2], [-3, 0, -5.4, 2.2], [-3, 0, 5.4, 2.2], [3, 0, 5.4, 2.2], [-2.4, 0, -9.6, 2.2], [1.6, 0, -11, 2.2], ...Array.from({ length: 12 }, (_, i) => [(i % 2 ? 1 : -1) * 5.2, 0, 10 - (i >> 1) * 4.4, 1.9])]);
  const spot = new THREE.SpotLight('#ffe2bb', 42, 30, 1.25, .6, 1.3); spot.position.set(.5, 7.45, 0); spot.target.position.set(0, 0, -1); spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -.0008; spot.shadow.normalBias = .04; g.add(spot, spot.target);
  const dust = motes(g, 90, [-6, 6], [.3, 6], [-13, 11], '#ffe2b0', .05);
  bakeStatic(g);
  return { dust, group: g, bounds: { x: [-6, 6], z: [-12.5, 11] }, floorY: 0, floor, statue, doors: { istanbul: door1453, guanahani: door1492, paris: door1789, ankara: door1923, napolyon: door1804, hiroshima: door1945, berlin: door1989, nyc: door2001 }, pedestals, comfort, fog: new THREE.Fog('#17100c', 16, 44), bg: '#120d0a' };
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
  for (let x = -24; x <= 24; x += 1.12) { if (Math.abs(x - 4) < 1.7) continue; M.setPosition(x, 1.3, -18); posts.setMatrixAt(pi++, M); } posts.count = pi; posts.userData.dyn = true; g.add(posts);
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
  // Son dalganın merdiveni: tırmanış burada olur.
  const ladder = lam({ map: T.wood(1, 1) }); for (const x of [2.72, 3.28]) g.add(box(.1, 10, .1, ladder, x, 4.7, -39.1)); for (let y = .5; y < 9.6; y += .55) g.add(box(.56, .07, .07, ladder, 3, y, -39.1));
  const hemi = new THREE.HemisphereLight('#c8a68a', '#32281e', 1.2); g.add(hemi); const sun = sunShadow(new THREE.DirectionalLight('#ffb878', 2.6), 72); sun.position.set(-60, 42, 90); sun.target.position.set(0, 0, -20); g.add(sun, sun.target);
  let flashT = 0;
  const spect = buildSpectacle(g, { sky, hemi, sun, posts, smoke, fog: null, actors });
  return { group: g, groups, actors, spect, floorY: 0, fog: new THREE.Fog('#7c5a48', 30, 150), bg: '#3a2c2c',
    climax(sound) { sound.cannon(); flash.visible = true; flashT = .18; smoke.burst(muzzle, 6, 2.4); smoke.burst(new THREE.Vector3(14, 7, -39.6), 4, 1.1, 1.3); },
    reset() { smoke.clear(); flash.visible = false; },
    tick(dt, t) { spect.tick(dt); runActors(actors, dt); fires.forEach((f, i) => f.scale.setScalar(2.2 + Math.sin(t * 9 + i * 2) * .3)); fireLight.intensity = 42 + Math.sin(t * 11) * 7; for (const f of people) f.userData.head.rotation.y = Math.sin(t * .7 + f.userData.phase) * .35; if (flashT > 0 && (flashT -= dt) <= 0) flash.visible = false; smoke.tick(dt); } };
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

// Fatih'in Gözünden: tepe, otağ, binlerce asker ve son saldırı.
// Kalabalık figürü: uzaktan insan silüeti, baş ten rengindedir. Geometri hafif tutulur.
function crowdFigure(spear) {
  const b = new THREE.CylinderGeometry(.13, .27, 1.2, 6, 1, true); b.translate(0, .6, 0); const h = new THREE.OctahedronGeometry(.125, spear ? 0 : 1); h.scale(.9, 1.1, .95); h.translate(0, 1.4, 0);
  const parts = [b.toNonIndexed(), h]; if (spear) { const sp = new THREE.PlaneGeometry(.05, 2.3); sp.translate(.22, 1.1, 0); parts.push(sp.toNonIndexed()); }
  const flags = parts.map((p, i) => { const pos = p.attributes.position, f = new Float32Array(pos.count); if (i === 1) for (let k = 0; k < pos.count; k++) f[k] = pos.getY(k) < 1.43 ? 1 : 0; return f; }); parts.forEach((p, i) => { p.deleteAttribute('uv'); p.setAttribute('aHead', new THREE.BufferAttribute(flags[i], 1)); }); return mergeGeometries(parts);
}
const SOLDIER = crowdFigure(true);
const CIVILIAN = crowdFigure(false);
function army(n, make, enter = false, base = SOLDIER) {
  const geo = base.clone(), w = new Float32Array(n * 4), ax = new Float32Array(n), m = new THREE.InstancedMesh(geo, lam({ color: '#fff', side: THREE.DoubleSide }), n), M = new THREE.Matrix4(), c = new THREE.Color();
  const uni = { uT: { value: 0 } };
  for (let i = 0; i < n; i++) { const o = make(i); M.setPosition(o.x, o.y ?? 0, o.z); m.setMatrixAt(i, M); m.setColorAt(i, c.set(o.color)); w.set([o.delay, o.speed, o.dist, o.back], i * 4); ax[i] = o.ax || 0; }
  geo.setAttribute('aW', new THREE.InstancedBufferAttribute(w, 4)); geo.setAttribute('aX', new THREE.InstancedBufferAttribute(ax, 1));
  m.material.onBeforeCompile = (s) => {
    s.uniforms.uT = uni.uT;
    s.fragmentShader = s.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += vColor * .2;');
    s.vertexShader = 'attribute vec4 aW; attribute float aX; attribute float aHead; uniform float uT;\n' + s.vertexShader.replace('#include <color_vertex>', '#include <color_vertex>\n vColor = mix(vColor, vec3(.3, .2, .14), aHead);').replace('#include <begin_vertex>', `#include <begin_vertex>
      float p = max(0., uT - aW.x), d = min(p * aW.y, aW.z), r = max(0., uT - aW.w) * aW.y * 1.3; d = max(0., d - r);
      transformed.z -= d; if (aW.y > 0. && p > 0.) transformed.y += abs(sin(uT * 6. + aW.x * 9.)) * .12; transformed.x -= aX * smoothstep(.45, .95, d / max(aW.z, .01))${enter ? '; if (aW.y > 0. && d >= aW.z - .02) transformed.y -= 40.' : ''};`);
  };
  m.material.customProgramCacheKey = () => `muze-army-${enter}`; m.frustumCulled = false; m.userData.dyn = true; m.userData.uni = uni; return m;
}
function buildSpectacle(g, { sky, hemi, sun, posts, smoke, actors }) {
  const root = new THREE.Group(); root.visible = false; g.add(root); const R = (a) => Math.random() * a;
  const hill = new THREE.Mesh(new THREE.CylinderGeometry(7, 13, 9, 18), lam(T.pbr(T.dirt(5, 2), 1.6))); hill.position.set(0, 4.5, 12); hill.castShadow = hill.receiveShadow = true; root.add(hill);
  const red = lam({ color: '#8c1f1c' }), gold = lam({ color: '#b98a35' }), otag = new THREE.Mesh(new THREE.ConeGeometry(5.6, 5, 12), red); otag.position.set(0, 12, 19.5); const wallT = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 2.6, 12), lam({ color: '#c9b48a' })); wallT.position.set(0, 10.3, 19.5); const band = new THREE.Mesh(new THREE.TorusGeometry(4.6, .1, 6, 24), gold); band.rotation.x = Math.PI / 2; band.position.set(0, 11.6, 19.5); root.add(otag, wallT, band);
  const banners = []; const banner = (x, z, color, y = 9, h = 7) => { const f = new THREE.Group(); f.position.set(x, y, z); const pole = new THREE.Mesh(new THREE.CylinderGeometry(.05, .06, h, 6), lam({ color: '#3a2a1a' })); pole.position.y = h / 2; const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.1, 8, 3), new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide })); cloth.position.set(.95, h - .7, 0); f.add(pole, cloth); f.userData.cloth = cloth; root.add(f); banners.push(cloth); return f; };
  for (const [x, z] of [[-5, 8], [5, 8], [-6, 15], [6, 15]]) banner(x, z, '#a81f1c');
  for (const [x, z, r] of [[-3.5, 9.5, 0], [3.5, 9.5, 0], [-5, 13, 1.4], [5, 13, -1.4]]) { const a = makeActor({ robe: '#d8d0bc', cap: '#ece6d6', hat: 'bork', anim: 'Idle_Sword' }); a.root.position.set(x, 9, z); a.root.rotation.y = Math.PI + r; root.add(a.root); actors.push(a); }
  // Dalgalar: her asker GPU'da hareket eder, Quest'te işlemciyi yormaz.
  const waves = [{ n: 2600, delay: 11, back: 31, colors: ['#6e4a30', '#4f3d2c', '#7a6a50', '#3a3a30'], speed: 3 }, { n: 2200, delay: 41, back: 57, colors: ['#8c2a22', '#6a6f78', '#a8382a'], speed: 3.2 }, { n: 1800, delay: 58, back: 9999, colors: ['#e0dac8', '#2f4a78', '#e8e0d0'], speed: 3.4 }];
  const wavesAll = waves.flatMap(w => Array.from({ length: w.n }, () => w)); for (let i = wavesAll.length - 1; i > 0; i--) { const j = R(i + 1) | 0; [wavesAll[i], wavesAll[j]] = [wavesAll[j], wavesAll[i]]; }
  const fullCount = wavesAll.length + 900, men = army(fullCount, (i0) => {
    const i = (i0 + 900) % fullCount; if (i >= wavesAll.length) { const b = i % 3; return b === 0 ? { x: -100 + R(200), y: 9, z: -39.9 - R(.8), color: '#4e4b53', delay: 0, speed: 0, dist: 0, back: 9999 } : { x: -100 + R(200), y: 13, z: -49.9 - R(1), color: '#4e4b53', delay: 0, speed: 0, dist: 0, back: 9999 }; }
    const w = wavesAll[i], u = R(2) - 1, x = Math.sign(u) * Math.pow(Math.abs(u), 1.5) * 90, rank = R(1), z0 = 3 - rank * 28; return { x, z: z0, color: w.colors[i % w.colors.length], delay: w.delay + rank * 7, speed: w.speed + R(.5), dist: Math.max(1, z0 + 30 + R(2.5)), back: w.back + R(4) };
  }); root.add(men);
  const lad = new THREE.InstancedMesh(new THREE.BoxGeometry(.5, 10, .08), lam({ map: T.wood(1, 6) }), 60), M = new THREE.Matrix4(), Q = new THREE.Quaternion().setFromEuler(new THREE.Euler(.2, 0, 0));
  for (let i = 0; i < 60; i++) { M.compose(new THREE.Vector3(-90 + i * 3.1 + R(1.5), 4.6, -38.8), Q, new THREE.Vector3(1, 1, 1)); lad.setMatrixAt(i, M); } lad.userData.dyn = true; lad.visible = false; root.add(lad);
  const guns = [-46, -28, -12, 4, 22, 40].map(x => { const s = glow(9, '255,200,120'); s.position.set(x, 1.3, -16); s.visible = false; root.add(s); return s; });
  const wallFires = Array.from({ length: 16 }, (_, i) => { const s = glow(2, '255,140,60'); s.position.set(-80 + i * 11, i % 2 ? 9.6 : 13.8, i % 2 ? -39.8 : -49.6); root.add(s); return s; });
  const flags = [-24, 0, 24].map(x => { const f = banner(x, -52, '#a81f1c', 21, 7); f.scale.y = .001; f.visible = false; return f; });
  const fill = new THREE.DirectionalLight('#ffdcb8', 0); fill.position.set(0, 24, 90); root.add(fill);
  const own = banner(0, 0, '#a81f1c', 0, 4); own.visible = false;
  const night = new THREE.Color('#4a5680'), day = new THREE.Color('#fff'), fogN = new THREE.Color('#2c3350'), fogD = new THREE.Color('#c08a68');
  const s = { active: false, t: 0, sound: null, nextGun: 2, fog: null, flagT: -1 };
  s.setDensity = (k) => { men.count = Math.floor(fullCount * k); };
  s.start = (sound, fog, from = 0) => { s.active = true; s.t = from; s.sound = sound; s.nextGun = 3; s.fog = fog; s.flagT = -1; s.saved = fog.color.clone(); s.far = [fog.near, fog.far]; fog.near = 60; fog.far = 240; root.visible = true; lad.visible = false; posts.visible = false; sky.rotation.y = Math.PI; sun.position.set(30, 22, -130); men.userData.uni.uT.value = 0; flags.forEach(f => { f.visible = false; f.scale.y = .001; }); own.visible = false; };
  s.stop = () => { s.active = false; root.visible = false; posts.visible = true; sky.rotation.y = 0; sky.material.color.set('#fff'); sun.position.set(-60, 42, 90); sun.intensity = 2.6; hemi.intensity = 1.2; s.fog.color.copy(s.saved); s.fog.near = s.far[0]; s.fog.far = s.far[1]; };
  s.plant = (x, y, z) => { own.position.set(x, y, z); own.scale.y = .001; own.visible = true; s.ownT = s.t; };
  s.raiseFlag = () => { if (s.flagT < 0) s.flagT = s.t; };
  s.tick = (dt) => {
    if (!s.active) return; s.t += dt; const t = s.t, n = THREE.MathUtils.smoothstep(t, 50, 92); men.userData.uni.uT.value = t;
    sky.material.color.lerpColors(night, day, n); hemi.intensity = 1 + n * 1; sun.intensity = .12 + n * 2.3; fill.intensity = .5 + n * 1.5; s.fog.color.lerpColors(fogN, fogD, n);
    lad.visible = (t > 22 && t < 34) || (t > 50 && t < 60) || t > 68;
    wallFires.forEach((f, i) => { f.scale.setScalar(2 + Math.sin(t * 8 + i) * .5); f.material.opacity = 1 - n * .6; });
    for (const b of banners) { const p = b.geometry.attributes.position; b.userData.x0 ??= Array.from({ length: p.count }, (_, i) => p.getX(i)); for (let i = 0; i < p.count; i++) { const x = b.userData.x0[i] + .9; p.setZ(i, Math.sin(x * 3 - t * 5) * .12 * x); } p.needsUpdate = true; }
    if (own.visible && own.scale.y < 1) own.scale.y = Math.min(1, (t - s.ownT) / 1.2 + .001);
    guns.forEach(g2 => { g2.visible = false; });
    if (t > s.nextGun && t < 80) { s.nextGun = t + 3.6 + R(4); const g2 = guns[R(6) | 0]; g2.visible = true; s.sound?.cannon(); smoke.burst(g2.position, 4, 2); smoke.burst(new THREE.Vector3(g2.position.x + R(6), 7 + R(5), -39.6), 3, 1, 1.2); }
    if (t > 84 && s.flagT < 0) s.flagT = t; if (s.flagT > 0) flags.forEach((f, i) => { const k = Math.min(1, (t - s.flagT - i * 2.2) / 2); if (k > 0) { f.visible = true; f.scale.y = k; } });
  };
  return s;
}

const flagMat = () => new THREE.MeshBasicMaterial({ map: T.turkFlag(), side: THREE.DoubleSide });
function flagPole(g, x, y, z, h, w = 1.5) { const f = new THREE.Group(); f.position.set(x, y, z); const pole = new THREE.Mesh(new THREE.CylinderGeometry(.03, .04, h, 6), lam({ color: '#3a2a1a' })); pole.position.y = h / 2; const cl = new THREE.Mesh(new THREE.PlaneGeometry(w, w * .66, 8, 2), flagMat()); cl.position.set(w / 2 + .03, h - w * .4, 0); f.add(pole, cl); f.userData.cloth = cl; f.userData.dyn = true; g.add(f); return f; }
function waveFlag(cl, t) { const p = cl.geometry.attributes.position; cl.userData.x0 ??= Array.from({ length: p.count }, (_, i) => p.getX(i)); for (let i = 0; i < p.count; i++) { const x = cl.userData.x0[i] + .75; p.setZ(i, Math.sin(x * 4 - t * 4) * .06 * x); } p.needsUpdate = true; }

export function buildAnkara() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.SphereGeometry(230, 20, 12), new THREE.MeshBasicMaterial({ map: T.nightSky(), side: THREE.BackSide, fog: false })));
  const f = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), lam(T.pbr(T.dirt(20, 20), 1.6))); f.rotation.x = -Math.PI / 2; f.position.z = -20; g.add(f);
  const pave = new THREE.Mesh(new THREE.PlaneGeometry(28, 44), lam(T.pbr(T.cobbles(26, 42), 3))); pave.rotation.x = -Math.PI / 2; pave.position.set(0, .02, -9); g.add(pave);
  const M = -29, stone = lam({ map: T.meclisFacade() }), side = lam({ map: T.plasterTone('#7a5f68', 2, 2) }), tile = lam({ color: '#7f3a2c' });
  const front = box(32, 10, .3, stone, 0, 5, M + 6); g.add(front, box(.3, 10, 13, side, -16, 5, M), box(.3, 10, 13, side, 16, 5, M), box(32, 10, .3, side, 0, 5, M - 6.5));
  const roof = new THREE.Mesh(new THREE.ConeGeometry(23.5, 4, 4), tile); roof.rotation.y = Math.PI / 4; roof.scale.z = .4; roof.position.set(0, 12, M); g.add(roof);
  const porch = lam({ color: '#c8bda8' }); g.add(box(7, .35, 3, porch, 0, 3.4, M + 7.5), box(.45, 3.4, .45, porch, -3, 1.7, M + 8.5), box(.45, 3.4, .45, porch, 3, 1.7, M + 8.5), box(6.4, .35, 2.4, lam({ color: '#6f6658' }), 0, .18, M + 7.8), box(3.4, 3.2, .1, new THREE.MeshBasicMaterial({ color: '#2a1a0c' }), 0, 1.6, M + 6.2));
  const glowMat = new THREE.MeshBasicMaterial({ color: '#ffcf80', transparent: true, opacity: .25 }), wins = []; for (const y of [2.1, 6.6]) for (let x = -14.2; x < 14.5; x += 1.87 * 1) { if (Math.abs(x) < 2.6 && y < 5) continue; wins.push([x, y]); } const wm = new THREE.InstancedMesh(new THREE.PlaneGeometry(.92, 1.9), glowMat, wins.length), W = new THREE.Matrix4(); wins.forEach(([x, y], i) => { W.setPosition(x, y, M + 6.18); wm.setMatrixAt(i, W); }); wm.userData.dyn = true; g.add(wm);
  const walls = [0, 1, 2].map(i => lam({ map: T.adobe(i) })); const r1 = lam({ color: '#6e3a2a' });
  for (const [x, z, w, h, d] of [[-14, 3, 7, 5, 7], [-18, -7, 9, 7, 8], [-19, -17, 8, 5.5, 8], [14, 3, 7, 5, 7], [18, -7, 9, 6.5, 8], [18, -17, 8, 6, 8], [-5, 13, 8, 5, 5], [6, 13, 8, 5.5, 5]]) { const m = walls[(x + z + 99) % 3 | 0]; g.add(box(w, h, d, m, x, h / 2, z)); const c = new THREE.Mesh(new THREE.ConeGeometry(Math.hypot(w, d) * .55, 2.2, 4), r1); c.rotation.y = Math.PI / 4; c.scale.z = d / w; c.position.set(x, h + 1.1, z); g.add(c); }
  // Ankara Kalesi tepesi: uzakta silüet
  const hill = new THREE.Mesh(new THREE.ConeGeometry(90, 34, 12), lam({ color: '#27232a' })); hill.position.set(62, 17, -95); hill.scale.z = .6; g.add(hill); for (let x = 34; x < 92; x += 8) g.add(box(5, 6 + (x % 3), 4, lam({ color: '#332e36' }), x, 31 - Math.abs(x - 62) * .42, -92));
  // Telgraf direkleri ve fenerler
  const wood = lam({ map: T.wood(1, 3) }); const lights = []; for (const [x, z] of [[-11.5, 1], [-11.5, -11], [11.5, 1], [11.5, -11]]) { g.add(box(.16, 6.5, .16, wood, x, 3.25, z), box(1.4, .1, .1, wood, x, 6, z)); const s = glow(1.8, '255,205,130'); s.position.set(x - Math.sign(x) * .5, 3.6, z); g.add(s); lights.push(s); }
  g.add(box(3.4, 3, 2.4, lam({ map: T.wood(3, 2) }), -9.6, 1.5, -7.4), box(3.8, .16, 2.8, r1, -9.6, 3.1, -7.4), box(1.6, .9, .7, wood, -9.6, .45, -5.5));
  // Çocuk ve kalabalık
  const actors = [], hero = placed(actors, g);
  hero({ model: 'hood', robe: '#7a4a58', hat: 'none', scale: .68 }, 4.2, -3, -.6); hero({ robe: '#3b3a3e', cap: '#8c1f1c', hat: 'fez', hair: '#6a6258' }, 5.4, -3.6, -.9);
  hero({ robe: '#3e4450', cap: '#201e22', hat: 'fez' }, 0, 0, 0).patrol([[-8, 7], [-4, -14], [6, -16]]); hero({ model: 'hood', robe: '#5a4a50', hat: 'none' }, 0, 0, 0).patrol([[7, 7], [2, -8], [-7, -4]], .95);
  const groups = [[hero({ robe: '#2f3a48', cap: '#8c1f1c', hat: 'fez' }, 8, -7, -1, 'Interact').root, hero({ robe: '#4a3a30', cap: '#23202a', hat: 'fez' }, 9.3, -6.7, -2).root], [hero({ model: 'hood', robe: '#54607a', hat: 'none' }, -7, -9, 1.2, 'Interact').root, hero({ robe: '#3a3f4a', cap: '#8c1f1c', hat: 'fez' }, -8.2, -9.6, .4).root]];
  const fg = [flagPole(g, 0, 10, M + 6.5, 4, 2.4), flagPole(g, -3, 3.6, M + 8.4, 2.2, 1.2), flagPole(g, 3, 3.6, M + 8.4, 2.2, 1.2)];
  motes(g, 70, [-14, 14], [.4, 7], [-22, 10], '#ffdca8', .05);
  contactShadows(g, [...groups.flat().map(p => [p.position.x, 0, p.position.z, 1.1]), [4.2, 0, -3, .9], [5.4, 0, -3.6, 1.1]]);
  bakeStatic(g);
  const hemi = new THREE.HemisphereLight('#6b7ba8', '#2a2228', 1.5); g.add(hemi); const moon = sunShadow(new THREE.DirectionalLight('#a9bbdd', 1), 46, 1536); moon.position.set(26, 50, 26); moon.target.position.set(0, 0, -12); g.add(moon, moon.target);
  const warm = new THREE.PointLight('#ffcf8a', 60, 34, 1.5); warm.position.set(0, 5, -16); g.add(warm);
  // Cumhuriyet Gecesi: sahne, meşaleli kalabalık, yanan pencereler
  const stage = new THREE.Group(); stage.visible = false; g.add(stage); const R = (a) => Math.random() * a, ww = lam({ map: T.wood(2, 1) }); stage.add(box(7, .22, 4, ww, 0, 4.7, 3)); for (const [x, z] of [[-3.4, 1.2], [3.4, 1.2], [-3.4, 4.8], [3.4, 4.8]]) stage.add(box(.2, 4.7, .2, ww, x, 2.35, z));
  const N = 2400, mob = army(N, () => { const u = R(2) - 1, x = Math.sign(u) * Math.pow(Math.abs(u), 1.2) * 13, z = 12 - R(1) * 9; return { x, z, ax: x * .25, color: ['#d8b070', '#8c3a2c', '#cfc5ae', '#6a7a9a', '#b98a50'][R(5) | 0], delay: 55 + R(14), speed: 1.8 + R(.9), dist: z + 3 + R(1) * R(1) * 20, back: 9999 }; }, false, CIVILIAN); mob.visible = false; stage.add(mob);
  const torches = new Float32Array(600); for (let i = 0; i < 200; i++) torches.set([-13 + R(26), 2 + R(.3), -20 + R(10)], i * 3); const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(torches, 3)); const tp = new THREE.Points(tg, new THREE.PointsMaterial({ color: '#ffb060', size: .4, map: T.soft('255,255,255'), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); stage.add(tp);
  const spect = { active: false, t: 0, sound: null, setDensity: (k) => { mob.count = Math.floor(N * k); }, raiseFlag() {} };
  let lit = 0;
  spect.start = (sound) => { Object.assign(spect, { active: true, t: 0, sound, fired: [] }); stage.visible = true; mob.visible = false; lit = 0; mob.userData.uni.uT.value = 0; tp.material.opacity = 0; };
  spect.stop = () => { spect.active = false; stage.visible = false; lit = 0; };
  spect.tick = (dt) => {
    if (!spect.active) return; spect.t += dt; const t = spect.t; mob.userData.uni.uT.value = t; if (t > 54) mob.visible = true;
    if (t > 26 && !spect.fired[0]) { spect.fired[0] = 1; lit = 1; spect.sound?.applause(5); spect.sound?.chime(); } if (t > 43 && !spect.fired[1]) { spect.fired[1] = 1; spect.sound?.applause(6); } if (t > 60 && !spect.fired[2]) { spect.fired[2] = 1; spect.sound?.applause(10); }
    tp.material.opacity = THREE.MathUtils.smoothstep(t, 55, 70);
  };
  return { group: g, groups, actors, spect, floorY: 0, fog: new THREE.Fog('#1a1e30', 40, 200), bg: '#0e1120',
    climax(sound) { lit = 1; sound.applause(6); },
    reset() { lit = 0; },
    tick(dt, t) { spect.tick(dt); runActors(actors, dt); glowMat.opacity += ((lit ? .95 : .25) - glowMat.opacity) * Math.min(1, dt * 2); warm.intensity = (lit ? 160 : 60) + Math.sin(t * 7) * 6; fg.forEach(x => waveFlag(x.userData.cloth, t)); } };
}

export function buildMeclis() {
  const g = new THREE.Group(), floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 18), lam(T.pbr(T.wood(8, 10), 1.4))); floor.rotation.x = -Math.PI / 2; g.add(floor);
  const wall = lam(T.pbr(T.plasterTone('#a8987e', 3, 2), 1.2)), dark = lam({ color: '#3a2a1e' }), wood = lam({ map: T.wood(3, 1) });
  g.add(box(14, 6.5, .3, wall, 0, 3.25, -9), box(14, 6.5, .3, wall, 0, 3.25, 9), box(.3, 6.5, 18, wall, -7, 3.25, 0), box(.3, 6.5, 18, wall, 7, 3.25, 0), box(14, .2, 18, new THREE.MeshBasicMaterial({ color: '#4a3a2a' }), 0, 6.5, 0));
  for (let z = -7.5; z < 9; z += 3) g.add(box(14, .22, .3, dark, 0, 6.36, z));
  for (let z = -7; z < 9; z += 3.2) for (const s of [-1, 1]) { g.add(box(.06, 2.4, 1.3, new THREE.MeshBasicMaterial({ color: '#141a2c' }), s * 6.84, 3.3, z), box(.1, 2.6, 1.5, dark, s * 6.86, 3.3, z)); }
  // Kürsü ve Divan
  g.add(box(10, .5, 3, lam({ map: T.wood(5, 2) }), 0, .25, -7), box(1.4, 1.2, .8, wood, 0, 1.1, -5.9), box(6, .9, 1, wood, 0, .95, -7.6));
  const benches = []; for (let r = 0; r < 6; r++) for (const s of [-1, 1]) benches.push([s * 3.2, .4, -3 + r * 1.6]); ring(g, 0, wood, benches, 4.6, .8, .55);
  flagPole(g, -3.2, .5, -8.1, 3.4, 1.4);
  const actors = [], hero = placed(actors, g), hats = ['#8c1f1c', '#23202a', '#8c1f1c'];
  [[-1.5, -.6], [2.6, 1], [-3.6, 2.6], [4.5, -.6], [-4.8, -2.2], [3, 4.2]].forEach(([x, z], i) => hero({ robe: ['#2b2b33', '#3a3f4a', '#3b3430'][i % 3], cap: hats[i % 3], hat: 'fez', hair: ['#3a2a1e', '#6a6258'][i % 2] }, x, z, 3.14, i % 2 ? 'Interact' : 'Idle_Neutral'));
  hero({ robe: '#26262c', cap: '#8c1f1c', hat: 'fez' }, 1.4, -7.8, 0, 'Interact');
  const rows = []; for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) if ((r + c) % 2 === 0) rows.push([(c < 2 ? -4.9 : 1.5) + (c % 2) * 2.3, 0, -2.2 + r * 1.6]); rows.forEach(([x, , z], i) => { const f = figure({ robe: ['#2b2b33', '#3a3f4a', '#3b3430', '#23232a'][i % 4], cap: i % 3 ? '#8c1f1c' : '#23202a', hat: 'bork' }); f.position.set(x, 0, z); f.rotation.y = Math.PI; g.add(f); });
  const lamps = [[-3.5, -3], [3.5, -3], [-3.5, 4], [3.5, 4]].map(([x, z]) => { const l = glow(1.1, '255,190,110'); l.material.opacity = .55; l.position.set(x, 5.2, z); g.add(l, box(.04, 1.3, .04, dark, x, 5.85, z)); return l; });
  motes(g, 40, [-6, 6], [.5, 5], [-8, 8], '#ffe2b0', .04);
  contactShadows(g, rows.map(([x, , z]) => [x, 0, z, .7]));
  bakeStatic(g);
  const main = new THREE.SpotLight('#ffdcb0', 70, 22, 1.4, .7, 1.2); main.position.set(0, 6.2, 0); main.target.position.set(0, 0, -2); main.castShadow = true; main.shadow.mapSize.set(1024, 1024); main.shadow.bias = -.0008; g.add(main, main.target, new THREE.HemisphereLight('#d6c4a8', '#2a1c14', 1.1));
  return { group: g, groups: [], actors, floorY: 0, fog: new THREE.Fog('#1b140e', 20, 60), bg: '#120d0a', bounds: { x: [-.75, .75], z: [-4.6, 8] },
    climax(sound) { sound.applause(7); sound.chime(); }, reset() {},
    tick(dt, t) { runActors(actors, dt); lamps.forEach((l, i) => l.scale.setScalar(1.1 + Math.sin(t * 6 + i) * .05)); } };
}

// Gemi: gövde, direkler, haçlı yelkenler.
function makeShip(scale = 1) {
  const s = new THREE.Group(), w = lam({ map: T.wood(4, 2) }), sail = new THREE.MeshLambertMaterial({ map: T.sail(), side: THREE.DoubleSide }), hs = new THREE.Shape();
  hs.moveTo(-9, 3); hs.lineTo(-7, .4); hs.quadraticCurveTo(0, -.6, 7, .6); hs.lineTo(9.5, 4.5); hs.lineTo(6, 3.4); hs.lineTo(-5, 2.4); hs.lineTo(-9, 3);
  const hull = new THREE.Mesh(new THREE.ExtrudeGeometry(hs, { depth: 5, bevelEnabled: true, bevelSize: .9, bevelThickness: 1.1, bevelSegments: 1 }), w); hull.position.z = -2.5; s.add(hull);
  for (const [x, h, sw] of [[-3, 13, 7], [2.6, 15.5, 8.5], [7.4, 11, 4]]) { const m = new THREE.Mesh(new THREE.CylinderGeometry(.13, .2, h, 7), w); m.position.set(x, h / 2 + 2.4, 0); s.add(m); const sg = new THREE.PlaneGeometry(sw, sw * .85, 8, 4), p = sg.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.cos(p.getX(i) / sw * 3) * .9); sg.computeVertexNormals(); const sl = new THREE.Mesh(sg, sail); sl.rotation.y = Math.PI / 2; sl.position.set(x, h * .62 + 2.4, 0); s.add(sl); }
  s.scale.setScalar(scale); s.userData.dyn = true; return s;
}
function makePalm(g, x, z, h, lean = .6, ang = 0) {
  const pts = [new THREE.Vector3(x, 0, z), new THREE.Vector3(x + Math.cos(ang) * lean * .3, h * .5, z + Math.sin(ang) * lean * .3), new THREE.Vector3(x + Math.cos(ang) * lean, h, z + Math.sin(ang) * lean)], tr = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 6, .16, 6), palmBark()); tr.castShadow = true; g.add(tr);
  const top = pts[2], fm = palmLeaf(); for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28, fg = new THREE.PlaneGeometry(.7, 3.6, 1, 4), p = fg.attributes.position; for (let k = 0; k < p.count; k++) { const u = (p.getY(k) + 1.8) / 3.6; p.setX(k, p.getX(k) * (1 - u * .8)); p.setZ(k, u * u * 1.5); } fg.translate(0, 1.8, 0); fg.computeVertexNormals(); const f = new THREE.Mesh(fg, fm); f.position.copy(top); f.rotation.order = 'YXZ'; f.rotation.set(1.05 + (i % 2) * .2, a, 0); g.add(f); }
}
let _bark, _leaf; const palmBark = () => (_bark ??= lam({ color: '#6a5238' })), palmLeaf = () => (_leaf ??= new THREE.MeshLambertMaterial({ color: '#3f6a34', side: THREE.DoubleSide }));
function seaPlane(g, color, y = .02) { const n = T.waves(), sea = new THREE.Mesh(new THREE.PlaneGeometry(700, 500), new THREE.MeshPhongMaterial({ color, normalMap: n, shininess: 90, specular: '#a0c0c8' })); sea.rotation.x = -Math.PI / 2; sea.position.set(0, y, -240); sea.userData.dyn = true; g.add(sea); return { sea, n }; }

export function buildIsland() {
  const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.SphereGeometry(330, 20, 12), new THREE.MeshBasicMaterial({ map: T.islandSky(), side: THREE.BackSide, fog: false })));
  const { n } = seaPlane(g, '#2a8a96', -.25);
  const groundGeo = new THREE.PlaneGeometry(220, 90, 44, 24), gp = groundGeo.attributes.position; for (let i = 0; i < gp.count; i++) { const wz = -gp.getY(i) + 28, sl = THREE.MathUtils.smoothstep(wz, -14, -8); gp.setZ(i, -.7 + sl * .75 + THREE.MathUtils.smoothstep(wz, 16, 34) * 3.5); } groundGeo.computeVertexNormals();
  const sand = new THREE.Mesh(groundGeo, lam(T.pbr(T.sand(40, 16), 1.4))); sand.rotation.x = -Math.PI / 2; sand.position.z = 28; g.add(sand);
  for (const [x, z, h, l, a] of [[-16, -2, 8, 1, .4], [-12, 4, 9, .8, 2], [-19, 9, 7.6, .6, 1], [14, -3, 8.4, 1.1, 2.6], [11, 5, 7.6, .7, 3.4], [18, 8, 9, .9, 2], [-6, 12, 8, .6, 1], [6, 13, 8.6, .7, 2], [-24, -6, 7, 1.2, .3], [25, -5, 7.6, 1, 3], [-30, 4, 8.6, .7, 1], [30, 6, 8, .7, 2.4]]) makePalm(g, x, z, h, l, a);
  scatter(g, 'tree_oak', Array.from({ length: 18 }, (_, i) => [-55 + i * 6.6, .6, 26 + (i * 7 % 10), 1.9 + i % 2, i]));
  const th = lam(T.pbr(T.thatch(4, 2), 2)), wallT = lam(T.pbr(T.thatch(5, 1), 1.4)), bohio = (x, z, r, h) => { const w2 = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 14, 1, true), wallT); w2.material.side = THREE.DoubleSide; w2.position.set(x, h / 2, z); const c = new THREE.Mesh(new THREE.ConeGeometry(r * 1.25, r * 1.3, 14), th); c.position.set(x, h + r * .6, z); g.add(w2, c, box(.9, h * .8, .1, new THREE.MeshBasicMaterial({ color: '#160f0a' }), x, h * .4, z - r + .02)); };
  for (const [x, z, r, h] of [[-8, 8, 3, 2.2], [0, 10.5, 3.6, 2.4], [8.6, 8.6, 3, 2.2], [-14, 13, 2.8, 2], [13, 14, 2.8, 2]]) bohio(x, z, r, h);
  const canoeGeo = new THREE.SphereGeometry(1, 12, 6, 0, 6.3, 1.57, 1.57); canoeGeo.scale(.55, .35, 3); const canoeM = lam({ map: T.wood(1, 3) }); for (const [x, z, r] of [[-9, -8.4, .5], [-5.8, -9, -.3], [9.5, -8.2, .7], [14, -7, -.4]]) { const c = new THREE.Mesh(canoeGeo, canoeM); c.position.set(x, .25, z); c.rotation.y = r; g.add(c); }
  // Üç gemi ve kayık
  const ships = [[-46, -92, 1.7, .2], [8, -110, 2, -.05], [52, -96, 1.5, -.2]].map(([x, z, s, r]) => { const m = makeShip(s); m.position.set(x, 0, z); m.rotation.y = r; g.add(m); return m; });
  const boat = new THREE.Group(), bh = new THREE.Mesh(canoeGeo.clone().scale(1.5, 1.2, .9), canoeM); bh.position.y = .4; boat.add(bh); for (const [x, c] of [[-.3, '#2e7a3e'], [.3, '#b5271f']]) { const pole = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, 2.6, 5), canoeM); pole.position.set(x, 1.6, 0); const fl = new THREE.Mesh(new THREE.PlaneGeometry(.8, .55), new THREE.MeshLambertMaterial({ color: c, side: THREE.DoubleSide })); fl.position.set(x + .42, 2.5, 0); boat.add(pole, fl); } boat.position.set(-6, 0, -10.6); boat.userData.dyn = true; g.add(boat);
  const sancak = new THREE.Group(); sancak.position.set(-5.6, 0, -8.6); sancak.userData.dyn = true; { const pole = new THREE.Mesh(new THREE.CylinderGeometry(.03, .04, 3.4, 6), canoeM); pole.position.y = 1.7; const fl = new THREE.Mesh(new THREE.PlaneGeometry(1.2, .8), new THREE.MeshLambertMaterial({ map: T.greenCross(), side: THREE.DoubleSide })); fl.position.set(.65, 2.9, 0); sancak.add(pole, fl); } g.add(sancak);
  // Lukayolar ve Kastilyalılar
  const actors = [], hero = placed(actors, g), lucayan = (o) => ({ hair: '#141210', hat: 'none', ...o });
  hero({ model: 'hood', robe: '#b08858', hat: 'none', scale: .72 }, 3.4, 8.2, 3.3); hero(lucayan({ robe: '#a87a4e' }), 4.8, 7.6, 3.5); hero({ model: 'hood', robe: '#9a6f44', hat: 'none' }, -3, 7.4, 3, 'Interact'); hero(lucayan({ robe: '#b08858' }), -3.6, -5.5, .4, 'Interact'); hero(lucayan({ robe: '#8a6a44' }), 1, -6.5, -.6);
  hero({ robe: '#3e3440', cap: '#24202a', hat: 'bork' }, -4.6, -8.2, 1.2, 'Interact'); hero({ model: 'king', robe: '#3a4a2e', cap: '#8d8d92', hat: 'helm' }, -6.6, -7.6, .8, 'Idle_Sword'); hero({ robe: '#4a3a30', cap: '#8d8d92', hat: 'helm' }, -3.4, -7, .6, 'Idle_Sword');
  hero(lucayan({ robe: '#b08858' }), 0, 0, 0).patrol([[-9, 3], [2, -2], [10, 1]], 1); hero({ model: 'hood', robe: '#a07a4e', hat: 'none' }, 0, 0, 0).patrol([[9, 2], [-2, -3], [-8, 1]], .95);
  const groups = [[hero(lucayan({ robe: '#a07a4e' }), 9, -1.5, -2, 'Interact').root, hero(lucayan({ robe: '#8a6a44' }), 10.2, -.6, -2.6).root], [hero({ model: 'hood', robe: '#b08858', hat: 'none' }, -9, -1, 1.8, 'Interact').root, hero(lucayan({ robe: '#a87a4e' }), -10.2, -1.8, 1).root]];
  motes(g, 60, [-16, 16], [.4, 6], [-10, 12], '#fff4d8', .05);
  contactShadows(g, [...groups.flat().map(p => [p.position.x, 0, p.position.z, 1.1]), [-3.6, 0, -5.5, 1.1], [1, 0, -6.5, 1.1], [-4.6, 0, -8.2, 1.1], [-6.6, 0, -7.6, 1.1], [-3.4, 0, -7, 1.1], [3.4, 0, 8.2, .9], [4.8, 0, 7.6, 1.1], [-3, 0, 7.4, 1.1]]);
  bakeStatic(g);
  g.add(new THREE.HemisphereLight('#cfe3ec', '#a89770', 1.6)); const sun = sunShadow(new THREE.DirectionalLight('#fff0cc', 2.6), 40); sun.position.set(-30, 46, 24); sun.target.position.set(0, 0, 0); g.add(sun, sun.target);
  // İlk Karşılaşma: kayık yaklaşır, adalılar kıyıya iner
  const stage = new THREE.Group(); stage.visible = false; g.add(stage); const R = (a) => Math.random() * a, ww = lam({ map: T.wood(2, 1) }); stage.add(box(7, .2, 3.4, ww, 0, 3.3, 6)); for (const [x, z] of [[-3.3, 4.5], [3.3, 4.5], [-3.3, 7.5], [3.3, 7.5]]) stage.add(box(.2, 3.3, .2, ww, x, 1.65, z));
  const N = 360, mob = army(N, () => { const u = R(2) - 1, x = Math.sign(u) * Math.pow(Math.abs(u), 1.1) * 15, z = 13 - R(1) * 10; return { x, z, ax: x * .45, color: ['#c9b48a', '#a07a4e', '#b08858', '#d8c8a8'][R(4) | 0], delay: 40 + R(12), speed: 2 + R(.8), dist: z + 3.5 + R(9), back: 9999 }; }, false, CIVILIAN); stage.add(mob);
  const spect = { active: false, t: 0, sound: null, setDensity: (k) => { mob.count = Math.floor(N * k); }, raiseFlag() {} };
  spect.start = (sound) => { Object.assign(spect, { active: true, t: 0, sound, fired: false }); stage.visible = true; boat.position.set(-6, 0, -62); sancak.visible = false; mob.userData.uni.uT.value = 0; };
  spect.stop = () => { spect.active = false; stage.visible = false; boat.position.set(-6, 0, -10.6); sancak.visible = true; };
  spect.tick = (dt) => { if (!spect.active) return; spect.t += dt; const t = spect.t; mob.userData.uni.uT.value = t; boat.position.z = -62 + THREE.MathUtils.smoothstep(t, 26, 52) * 51.4; if (t > 58 && !spect.fired) { spect.fired = true; sancak.visible = true; spect.sound?.chime(); } };
  return { group: g, groups, actors, spect, floorY: 0, fog: new THREE.Fog('#bcd7dc', 80, 330), bg: '#a8cfdc',
    climax(sound) { sound.chime(); sound.thud(70, 1.2, .5); }, reset() {},
    tick(dt, t) { spect.tick(dt); runActors(actors, dt); n.offset.set(t * .012, t * .02); ships.forEach((s, i) => { s.position.y = Math.sin(t * .7 + i) * .22; s.rotation.z = Math.sin(t * .5 + i * 2) * .018; }); boat.position.y = Math.sin(t * 1.1) * .07; } };
}

export function buildDeck() {
  const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.SphereGeometry(300, 20, 12), new THREE.MeshBasicMaterial({ map: T.nightSky(), side: THREE.BackSide, fog: false })));
  const { n } = seaPlane(g, '#123346', -2.5), ship = new THREE.Group(), w = lam(T.pbr(T.wood(6, 12), 1.6)), rail = lam({ map: T.wood(2, 1) }); g.add(ship);
  ship.add(box(4.4, .2, 17, w, 0, -.1, -1), box(.18, 1, 17, rail, -2.2, .5, -1), box(.18, 1, 17, rail, 2.2, .5, -1), box(4.4, 1, .18, rail, 0, .5, 7.5), box(3, 1, .18, rail, 0, .5, -9.4), box(4.4, 2.2, 4, w, 0, 1.1, 8.8));
  for (const [z, h] of [[-3, 13], [3, 15]]) { const m = new THREE.Mesh(new THREE.CylinderGeometry(.14, .22, h, 8), rail); m.position.set(0, h / 2, z); ship.add(m); const sg = new THREE.PlaneGeometry(8, 7, 8, 3), sp = sg.attributes.position; for (let i = 0; i < sp.count; i++) sp.setZ(i, Math.cos(sp.getX(i) / 8 * 3) * .8); sg.computeVertexNormals(); const sl = new THREE.Mesh(sg, new THREE.MeshLambertMaterial({ color: '#c8bda4', side: THREE.DoubleSide })); sl.position.set(0, h * .7, z + .3); sl.rotation.y = 0; ship.add(sl); }
  for (const [x, z, s] of [[-1.4, -4.8, 1.1], [1.5, 4, 1], [1.4, -1, 1.1]]) prop(g, 'barrel', x, 0, z, s);
  const land = new THREE.Mesh(new THREE.ConeGeometry(60, 5, 12), lam({ color: '#0c1518' })); land.scale.z = .15; land.position.set(10, 0, -170); land.visible = false; land.userData.dyn = true; g.add(land);
  const lightOnShore = glow(1.8, '255,200,130'); lightOnShore.position.set(12, 2.2, -162); g.add(lightOnShore); lightOnShore.visible = false;
  const actors = [], hero = placed(actors, g); hero({ robe: '#4a3a30', hat: 'none' }, -1.2, 1.2, 2, 'Interact'); hero({ robe: '#5a4a3a', hat: 'none' }, 1, -3, 3, 'Idle_Neutral'); hero({ robe: '#3a4a2e', hat: 'none' }, -1.6, 2.4, 3.2);
  const lamp = glow(1.1, '255,190,110'); lamp.position.set(0, 2.4, 5.4); g.add(lamp);
  motes(g, 30, [-3, 3], [.5, 5], [-8, 7], '#cfe0ff', .04); bakeStatic(g);
  g.add(new THREE.HemisphereLight('#7f92be', '#141820', 1.7)); const moon = sunShadow(new THREE.DirectionalLight('#b6c6e6', 1.2), 18, 1024); moon.position.set(-14, 30, -8); g.add(moon, moon.target); const warm = new THREE.PointLight('#ffb870', 26, 16, 1.6); warm.position.set(0, 2.6, 5.4); g.add(warm);
  return { group: g, groups: [], actors, floorY: 0, fog: new THREE.Fog('#101a2c', 60, 240), bg: '#0a0f1a', bounds: { x: [-1.6, 1.6], z: [-6.5, 6] },
    climax(sound) { land.visible = true; lightOnShore.visible = true; sound.thud(64, 1.8, 1.1); sound.chime(); }, reset() { land.visible = lightOnShore.visible = false; },
    tick(dt, t) { runActors(actors, dt); n.offset.set(t * .018, t * .03); ship.rotation.x = Math.sin(t * .5) * .012; ship.rotation.z = Math.sin(t * .37) * .02; } };
}

const stubSpect = (over) => ({ active: false, t: 0, sound: null, setDensity() {}, raiseFlag() {}, start(s) { this.active = true; this.t = 0; this.sound = s; over.start?.(); }, stop() { this.active = false; over.stop?.(); }, tick(dt) { if (this.active) { this.t += dt; over.tick?.(this.t, dt, this); } } });

export function buildNotre() {
  const g = new THREE.Group(), L = 56, cz = -6, W = 18, H = 19;
  const f = new THREE.Mesh(new THREE.PlaneGeometry(W, L), new THREE.MeshPhongMaterial({ map: T.marbleFloor(W / 3, L / 3), shininess: 50, specular: '#3a3028' })); f.rotation.x = -Math.PI / 2; f.position.z = cz; g.add(f);
  const st = lam(T.pbr(T.ashlar(5, 3), 1.6)), dark = lam({ color: '#2a2622' }), drape = new THREE.MeshLambertMaterial({ map: T.gildedDrape(), side: THREE.DoubleSide }), gold = lam({ color: '#b98a35', emissive: '#2f2108' }), glass = new THREE.MeshBasicMaterial({ map: T.stainedGlass() });
  g.add(box(.5, H, L, st, -W / 2, H / 2, cz), box(.5, H, L, st, W / 2, H / 2, cz), box(W, H, .5, st, 0, H / 2, cz - L / 2), box(W, H, .5, st, 0, H / 2, cz + L / 2), box(W, .4, L, dark, 0, H, cz));
  const cols = []; for (let z = 18; z > -22; z -= 5) for (const x of [-5.4, 5.4]) cols.push([x, z]);
  for (const [x, z] of cols) { const c = new THREE.Mesh(new THREE.CylinderGeometry(.62, .72, H - 3, 12), st); c.position.set(x, (H - 3) / 2, z); g.add(c); const d = new THREE.Mesh(new THREE.PlaneGeometry(2, 10), drape); d.position.set(x - Math.sign(x) * .75, 7, z); d.rotation.y = Math.sign(x) * -Math.PI / 2; g.add(d); }
  for (let z = 18; z > -22; z -= 5) for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 8), glass); w.position.set(s * (W / 2 - .26), 10, z - 2.5); w.rotation.y = -s * Math.PI / 2; g.add(w); }
  const rose = new THREE.Mesh(new THREE.CircleGeometry(4, 20), glass); rose.position.set(0, 13, cz - L / 2 + .3); g.add(rose); const roseG = glow(11, '200,170,255'); roseG.position.copy(rose.position); roseG.material.opacity = .35; g.add(roseG);
  // Sunak, tahtlar, taç töreni
  g.add(box(14, .6, 8, lam({ color: '#6a1f1c' }), 0, .3, -16), box(5, 2, 1.4, lam({ color: '#d8ccb0' }), 0, 1.6, -19.5), box(1.4, 3, 1.2, gold, -4.8, 2.1, -15.5), box(1.4, 3, 1.2, gold, 4.8, 2.1, -15.5));
  const candles = []; for (let x = -4; x <= 4; x += 2) { const s = glow(.8, '255,200,120'); s.position.set(x, 3.3, -19.5); g.add(s); candles.push(s); }
  const actors = [], hero = placed(actors, g);
  hero({ model: 'king', robe: '#8c1f1c', hat: 'none', hair: '#3a2a1e' }, 0, -15.5, 0).root.position.y = .6; const jo = hero({ model: 'hood', robe: '#e6dcc8', hat: 'none' }, 1.4, -14.6, -.5); jo.root.position.y = .6; const pope = hero({ model: 'adv', robe: '#ece6d6', hat: 'none', hair: '#a8a29a' }, -4.8, -15.5, .6); pope.root.position.y = .6; hero({ robe: '#7a2a2a', hat: 'none' }, -2.6, -13.4, .6, 'Interact').root.position.y = .6;
  hero({ model: 'hood', robe: '#2a3a6a', hat: 'none' }, -3, 3, 1.5, 'Interact'); const gr = [[hero({ robe: '#2d3f73', cap: '#16161c', hat: 'tricorne' }, 3.2, 5, -1.4, 'Idle_Sword').root, hero({ model: 'hood', robe: '#6a4a5a', hat: 'none' }, 4.2, 5.4, -1.8).root], [hero({ robe: '#3a2e4a', hat: 'none' }, -3.4, 9, 1.4, 'Interact').root, hero({ model: 'hood', robe: '#4a3a58', hat: 'none' }, -4.2, 9.4, 1).root]];
  const seat = []; for (let z = 8; z > -11; z -= 1.3) for (let x = -4.2; x <= 4.2; x += 1.05) { if (Math.abs(x) < 1.9) continue; seat.push([x, z]); } const crowd = army(seat.length, (i) => ({ x: seat[i][0], z: seat[i][1], color: ['#2a3a6a', '#6a1f1c', '#3a2e4a', '#d8ccb0', '#2a2a30', '#5a4a30'][i % 6], delay: 0, speed: 0, dist: 0, back: 9999 }), false, CIVILIAN); g.add(crowd);
  motes(g, 70, [-7, 7], [.5, 12], [-20, 16], '#ffe2b0', .05); contactShadows(g, [[0, .61, -15.5, 1.1], [1.4, .61, -14.6, 1.1], [-4.8, .61, -15.5, 1.1]]); bakeStatic(g);
  const main = new THREE.SpotLight('#ffe0b0', 200, 40, 1.05, .6, 1.2); main.position.set(0, 16, -9); main.target.position.set(0, 0, -15); main.castShadow = true; main.shadow.mapSize.set(1024, 1024); main.shadow.bias = -.0008; g.add(main, main.target, new THREE.HemisphereLight('#cdb898', '#2a1c14', 1.3));
  const stage = new THREE.Group(); stage.visible = false; g.add(stage); stage.add(box(4, .22, 3.4, lam({ map: T.wood(2, 1) }), 0, 4.9, 2)); for (const [x, z] of [[-1.9, .5], [1.9, .5], [-1.9, 3.5], [1.9, 3.5]]) stage.add(box(.16, 4.9, .16, lam({ map: T.wood(1, 2) }), x, 2.45, z));
  const crown = glow(2.6, '255,220,130'); crown.visible = false; crown.position.set(0, 2.5, -15.5); g.add(crown);
  const spect = stubSpect({ start() { stage.visible = true; crown.visible = false; }, stop() { stage.visible = false; }, tick(t, dt, s) { crown.visible = t > 45; if (t > 75 && !s.bell) { s.bell = 1; s.sound?.applause(7); s.sound?.cannon(); } if (t > 46 && !s.c1) { s.c1 = 1; s.sound?.chime(); } } });
  return { group: g, groups: gr, actors, spect, floorY: 0, fog: new THREE.Fog('#1c1410', 30, 90), bg: '#120d0a', bounds: { x: [-1.8, 1.8], z: [-8, 13] },
    climax(sound) { crown.visible = true; sound.chime(); sound.applause(6); }, reset() { crown.visible = false; spect.bell = spect.c1 = 0; },
    tick(dt, t) { spect.tick(dt); runActors(actors, dt); candles.forEach((c, i) => c.scale.setScalar(.8 + Math.sin(t * 8 + i) * .07)); } };
}

export function buildHiroshima() {
  const g = new THREE.Group(), sky = new THREE.Mesh(new THREE.SphereGeometry(300, 20, 12), new THREE.MeshBasicMaterial({ map: T.paleSky(), side: THREE.BackSide, fog: false })), skyA = T.paleSky(), skyB = T.greySky(); g.add(sky);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(200, 130), lam(T.pbr(T.dirt(30, 20), 1.6))); fl.rotation.x = -Math.PI / 2; fl.position.z = 40; g.add(fl);
  const fl2 = new THREE.Mesh(new THREE.PlaneGeometry(200, 60), lam(T.pbr(T.dirt(30, 10), 1.6))); fl2.rotation.x = -Math.PI / 2; fl2.position.z = -62; g.add(fl2);
  const { n } = seaPlane(g, '#3a6a7a', -.3);
  // Çatılı ahşap evler yalnızca bombadan önceki sabahta durur
  const before = new THREE.Group(), after = new THREE.Group(); g.add(before, after); after.visible = false;
  const wt = lam({ map: T.wood(2, 2) }), roof = lam({ color: '#3a3c42' }), adm = [lam({ map: T.adobe(0) }), lam({ map: T.adobe(1) })];
  const house = (x, z, w, h, d, i) => { before.add(box(w, h, d, adm[i % 2], x, h / 2, z)); const c = new THREE.Mesh(new THREE.ConeGeometry(Math.hypot(w, d) * .6, 1.8, 4), roof); c.rotation.y = Math.PI / 4; c.scale.z = d / w; c.position.set(x, h + .9, z); before.add(c); };
  [[-14, -5, 7, 4, 7], [-18, 6, 8, 4.5, 8], [-30, -4, 9, 4, 8], [14, -6, 7, 4, 7], [18, 5, 8, 4.4, 8], [31, -5, 9, 4, 8], [-30, 16, 9, 4, 8], [30, 16, 9, 4, 8], [-9, 14, 7, 4, 6], [10, 14, 7, 4, 6], [-14, -44, 8, 5, 8], [-26, -44, 8, 4, 8], [-36, -44, 8, 4, 8], [36, -44, 9, 4, 8], [-4, -48, 7, 4, 6]].forEach(([x, z, w, h, d], i) => house(x, z, w, h, d, i));
  const tram = box(9, 2.8, 2.6, lam({ color: '#2f5a44' }), -2.5, 1.6, -3); before.add(tram, box(9.2, .3, 2.8, lam({ color: '#c8c0a8' }), -2.5, 3.1, -3), box(8, .9, 2.65, new THREE.MeshBasicMaterial({ color: '#c8d4d8' }), -2.5, 2.1, -3)); before.add(box(120, .06, .1, lam({ color: '#4a4640' }), 0, .05, -2), box(120, .06, .1, lam({ color: '#4a4640' }), 0, .05, -4));
  for (let x = -30; x <= 30; x += 12) before.add(box(.14, 6, .14, wt, x, 3, -6.4), box(.8, .08, .08, wt, x, 5.7, -6.4));
  // Eski Sanayi Teşvik Binası: bugün Atom Bombası Kubbesi. İlk sahnede sağlam, sonra iskelet.
  const brick = lam(T.pbr(T.ashlar(4, 2), 1.4)), bldg = new THREE.Group(); bldg.position.set(16, 0, -44); bldg.add(box(16, 8, 10, brick, 0, 4, 0), box(4, 13, 4, brick, 0, 6.5, 0)); const dome = new THREE.Mesh(new THREE.SphereGeometry(3, 16, 8, 0, 6.3, 0, 1.6), lam({ color: '#5f8a70' })); dome.position.y = 13; bldg.add(dome); before.add(bldg);
  const ruinB = new THREE.Group(); ruinB.position.copy(bldg.position); const iron = lam({ color: '#2a2622' }); ruinB.add(box(16, 5.5, 10, lam({ color: '#6a6660' }), 0, 2.75, 0), box(4, 11, 4, lam({ color: '#6a6660' }), 0, 5.5, 0)); for (let a = 0; a < 8; a++) { const r = new THREE.Mesh(new THREE.TorusGeometry(3, .05, 4, 14, 3.14), iron); r.position.y = 11; r.rotation.y = a * .79; ruinB.add(r); } after.add(ruinB);
  scatter(after, 'rock_large', Array.from({ length: 70 }, (_, i) => [-40 + (i * 37 % 80), -.05, -14 + (i * 23 % 34), .6 + (i % 3) * .4, i])); const cp = []; for (let i = 0; i < 22; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(.09, .14, 4 + i % 3, 5), lam({ color: '#171412' })); b.position.set(-38 + i * 3.7, 2.2, -8 + (i * 13 % 24)); b.rotation.z = Math.sin(i) * .28; after.add(b); }
  const bridge = lam({ color: '#6a665e' }); g.add(box(8, .7, 34, bridge, 0, .9, -24)); for (const s of [-1, 1]) for (let z = -38; z <= -10; z += 5) g.add(box(.2, .9, .2, bridge, s * 3.8, 1.5, z));
  // Sabah kalabalığı. Öğrenciler yangın yolu için yıkım yapar.
  const actors = [], hero = (o, x, z, r, a) => { const h = makeActor({ anim: a, ...o }); h.root.position.set(x, 0, z); h.root.rotation.y = r; before.add(h.root); actors.push(h); return h; };
  const groups = [[hero({ robe: '#3a3f4a', hat: 'none' }, 7.6, -1, -2, 'Interact').root, hero({ robe: '#4a4a44', hat: 'none' }, 8.8, -.6, -1.5).root], [hero({ model: 'hood', robe: '#54607a', hat: 'none' }, -6.6, -.6, 1.7, 'Interact').root, hero({ robe: '#3a3f4a', hat: 'none' }, -7.8, -1.4, 1.2).root]];
  hero({ model: 'hood', robe: '#2f3f5a', hat: 'none', scale: .86 }, 0, 0, 0).patrol([[-3, 3], [8, 2]], .9); hero({ robe: '#5a5044', hat: 'none' }, 0, 0, 0).patrol([[9, 8], [-9, 4]], 1); hero({ robe: '#d8d0c0', hat: 'none' }, -5, -4, .6, 'Interact'); hero({ model: 'hood', robe: '#d8d0c0', hat: 'none' }, 8.4, -3, -1);
  for (const [x, z] of [[-12, -10], [-9, -11], [-6, -10.4], [6, -10.6], [9, -10], [12, -11]]) hero({ model: 'adv', robe: '#6a6a60', hat: 'none', scale: .82 }, x, z, 3.1, 'Interact');
  const clock = box(.8, .8, .1, new THREE.MeshBasicMaterial({ color: '#ecdfc4' }), 0, 2.6, -8.1); before.add(clock, box(.1, 2.4, .1, wt, 0, 1.2, -8.2), box(.05, .3, .02, new THREE.MeshBasicMaterial({ color: '#111' }), 0, 2.72, -8.03));
  motes(g, 60, [-16, 16], [.4, 6], [-14, 12], '#ffffff', .05); bakeStatic(before); bakeStatic(after);
  const hemi = new THREE.HemisphereLight('#d6e2ea', '#6a6052', 1.5); g.add(hemi); const sun = sunShadow(new THREE.DirectionalLight('#fff4dc', 2.6), 54); sun.position.set(24, 44, -20); sun.target.position.set(0, 0, -10); g.add(sun, sun.target);
  // Hatırlama: nehirde fenerler. Her yıl yapılan anma töreninden esinlenir.
  const lanterns = new Float32Array(240); for (let i = 0; i < 80; i++) lanterns.set([-45 + Math.random() * 90, -.1, -22 + Math.random() * 10], i * 3); const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(lanterns, 3)); const lm = new THREE.Points(lg, new THREE.PointsMaterial({ color: '#ffc880', size: .6, map: T.soft('255,255,255'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); lm.visible = false; g.add(lm);
  const fog = new THREE.Fog('#c8d2d6', 60, 280), day = () => { before.visible = true; after.visible = false; sky.material.map = skyA; sky.material.needsUpdate = true; hemi.intensity = 1.5; sun.intensity = 2.6; lm.visible = false; fog.color.set('#c8d2d6'); fog.near = 60; fog.far = 280; }, ruin = (lamp) => { before.visible = false; after.visible = true; sky.material.map = skyB; sky.material.needsUpdate = true; hemi.intensity = lamp ? .7 : 1.05; sun.intensity = lamp ? .2 : .55; lm.visible = lamp; fog.color.set(lamp ? '#22262c' : '#7a7670'); fog.near = 24; fog.far = lamp ? 200 : 150; };
  const spect = stubSpect({ start: () => ruin(true), stop: day, tick(t) { lg.attributes.position.array.forEach((_, i, a) => { if (i % 3 === 0) a[i] += .012; }); lg.attributes.position.needsUpdate = true; } });
  return { group: g, groups, actors, spect, floorY: 0, fog, bg: '#c8d2d6', toAfter() { ruin(false); }, climax() {}, reset: day,
    tick(dt, t) { spect.tick(dt); runActors(actors, dt); n.offset.set(t * .01, t * .016); } };
}

export function buildBerlin() {
  const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.SphereGeometry(260, 20, 12), new THREE.MeshBasicMaterial({ map: T.nightSky(), side: THREE.BackSide, fog: false })));
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(160, 120), lam(T.pbr(T.cobbles(40, 30), 2.4))); fl.rotation.x = -Math.PI / 2; g.add(fl);
  const w = new THREE.MeshLambertMaterial({ map: T.grafWall() }), cz = lam({ map: T.concrete(10, 1) }), steel = lam({ color: '#4a5a4e' }); g.add(box(70, 3.6, .4, cz, -44, 1.8, -2), box(70, 3.6, .4, cz, 44, 1.8, -2), box(70, 3.6, .1, w, -44, 1.8, -2.26), box(70, 3.6, .1, w, 44, 1.8, -2.26));
  for (const s of [-1, 1]) { g.add(box(.3, .3, 28, steel, s * 9.3, 8, -12), box(.3, .3, 28, steel, s * 9.3, .6, -12)); for (let z = -24; z <= 0; z += 6) g.add(box(.2, 7.6, .2, steel, s * 9.3, 4.2, z), box(19, .2, .2, steel, 0, 8, z)); }
  const booth = lam({ map: T.concrete(2, 1) }), glass = new THREE.MeshBasicMaterial({ color: '#ffe0a8' }); g.add(box(3.4, 2.7, 2.6, booth, 4.6, 1.35, -1), box(2.4, .9, .06, glass, 4.6, 1.8, .32), box(3.8, .2, 3, lam({ color: '#2a2a2e' }), 4.6, 2.8, -1));
  g.add(box(2.6, 7, 2.6, booth, -12, 3.5, 2), box(3.2, 1.6, 3.2, lam({ color: '#6a6a66' }), -12, 7.8, 2), box(2.8, .7, .05, glass, -12, 7.9, .4));
  const bar = new THREE.Group(); bar.position.set(-3.4, .95, -3); bar.add(box(7, .14, .14, lam({ color: '#e8e0d0' }), 3.5, 0, 0)); for (let x = .5; x < 7; x += 1.4) bar.add(box(.6, .16, .16, lam({ color: '#b5271f' }), x, 0, 0)); bar.userData.dyn = true; g.add(bar, box(.3, 1.1, .3, steel, -3.4, .55, -3));
  const lamps = []; for (const [x, z] of [[-7, 3], [7, 3], [-7, -8], [7, -8]]) { g.add(box(.14, 7, .14, steel, x, 3.5, z)); const s = glow(2.2, '255,225,180'); s.position.set(x, 7, z); g.add(s); lamps.push(s); }
  const trabant = (x, z, c, r) => { const t = new THREE.Group(), m = lam({ color: c }); t.add(box(3.2, .8, 1.5, m, 0, .6, 0), box(1.8, .6, 1.3, m, -.2, 1.25, 0), box(1.8, .3, 1.32, new THREE.MeshBasicMaterial({ color: '#20242c' }), -.2, 1.25, 0)); t.position.set(x, 0, z); t.rotation.y = r; g.add(t); }; for (const [x, z, c, r] of [[-5, 7, '#b8ad96', 1.57], [-5.6, 12, '#6a7e8c', 1.57], [5.4, 9, '#a88a5a', -1.57], [6, 14, '#8a9c8a', -1.57]]) trabant(x, z, c, r);
  const house = lam({ map: T.adobe(1) }); for (const [x, z, h] of [[-22, 20, 15], [22, 20, 13], [-18, 34, 18], [18, 34, 16], [-24, -30, 18], [24, -30, 20]]) g.add(box(16, h, 12, house, x, h / 2, z));
  const actors = [], hero = placed(actors, g);
  hero({ robe: '#4a5a44', hat: 'none' }, -1.8, -.6, 3.1, 'Interact'); hero({ robe: '#4a5a44', hat: 'none' }, 2.2, -2, 3.1); hero({ robe: '#3a4a34', hat: 'none' }, 1, -3.8, 3);
  hero({ model: 'hood', robe: '#54607a', hat: 'none' }, -4, -9, 1, 'Wave'); hero({ robe: '#4a3a30', hat: 'none' }, 0, -9.6, 0, 'Wave'); hero({ model: 'hood', robe: '#6a4a3a', hat: 'none' }, 3, -8.6, -.4, 'Interact');
  const groups = [[hero({ robe: '#3a3f4a', hat: 'none' }, 5.6, 5.4, -1, 'Interact').root, hero({ model: 'hood', robe: '#6a5a4a', hat: 'none' }, 6.8, 5.8, -2).root], [hero({ model: 'hood', robe: '#54607a', hat: 'none' }, -5.6, 5, 1.2, 'Interact').root, hero({ robe: '#4a4a50', hat: 'none' }, -6.8, 4.4, 1).root]];
  const R = (a) => Math.random() * a, N = 2000, mob = army(N, () => { const u = R(2) - 1, x = Math.sign(u) * Math.pow(Math.abs(u), 1.2) * 8, z = 14 + R(1) * 20; return { x, z, ax: x * .5, color: ['#3a3f4a', '#6a5a4a', '#54607a', '#8a7a64', '#4a4a50'][R(5) | 0], delay: 46 + (z - 14) / 20 * 26, speed: 2.8 + R(.6), dist: z + 18 + R(8), back: 9999 }; }, false, CIVILIAN); g.add(mob);
  motes(g, 50, [-9, 9], [.4, 6], [-12, 12], '#e8ecff', .05); bakeStatic(g);
  g.add(new THREE.HemisphereLight('#8fa0c8', '#3a3a40', 2.2)); const flood = sunShadow(new THREE.DirectionalLight('#ffe8c8', 2.2), 34, 1536); flood.position.set(14, 30, 18); flood.target.position.set(0, 0, -4); g.add(flood, flood.target);
  const stage = new THREE.Group(); stage.visible = false; g.add(stage); stage.add(box(5, .22, 4, lam({ map: T.wood(2, 1) }), 0, 3.5, 8)); for (const [x, z] of [[-2.3, 6.2], [2.3, 6.2], [-2.3, 9.8], [2.3, 9.8]]) stage.add(box(.2, 3.5, .2, lam({ map: T.wood(1, 2) }), x, 1.75, z));
  let up = 0, go = 0; const open = (s) => { up = 1; s?.chime(); s?.applause(9); };
  const spect = stubSpect({ start() { stage.visible = true; up = 0; bar.rotation.z = 0; }, stop() { stage.visible = false; }, tick(t, dt, s) { mob.userData.uni.uT.value = t; if (t > 45 && !s.o) { s.o = 1; open(s.sound); } } }); spect.setDensity = (k) => { mob.count = Math.floor(N * k); };
  return { group: g, groups, actors, spect, floorY: 0, fog: new THREE.Fog('#101420', 40, 180), bg: '#0a0d18',
    climax(sound) { open(sound); go = 46; }, reset() { up = 0; go = 0; spect.o = 0; bar.rotation.z = 0; mob.userData.uni.uT.value = 0; },
    tick(dt, t) { spect.tick(dt); runActors(actors, dt); if (!spect.active && up) { go += dt; mob.userData.uni.uT.value = go; } if (up) bar.rotation.z = Math.min(1.45, bar.rotation.z + dt * .9); } };
}

export function buildNYC() {
  const g = new THREE.Group(), sky = new THREE.Mesh(new THREE.SphereGeometry(600, 20, 12), new THREE.MeshBasicMaterial({ map: T.islandSky(), side: THREE.BackSide, fog: false })), skyA = T.islandSky(), skyB = T.nightSky(); g.add(sky);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(120, 30), lam(T.pbr(T.concrete(20, 5), 1.2))); fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0, 11); g.add(fl);
  const { n, sea } = seaPlane(g, '#2f5a70', -1.2); sea.scale.set(2, 2, 1);
  const rail = lam({ color: '#2a2e34' }); g.add(box(120, .1, .1, rail, 0, 1.1, -3.6), box(120, .1, .1, rail, 0, .6, -3.6)); for (let x = -50; x <= 50; x += 2.5) g.add(box(.08, 1.1, .08, rail, x, .55, -3.6));
  scatter(g, 'tree_oak', [[-22, 0, 8, 2.2, 1], [-14, 0, 12, 2, 2], [15, 0, 10, 2.1, 3], [25, 0, 12, 2.3, 1]]);
  const bench = lam({ map: T.wood(2, 1) }); for (const x of [-6, 6, 18, -18]) g.add(box(2.4, .45, .5, bench, x, .35, -1.8));
  g.add(box(6, 2.6, 2.4, lam({ color: '#a82418' }), -5.2, 1.5, 4.4), box(5.8, .2, 2.2, lam({ color: '#c8c0a8' }), -5.2, 2.9, 4.4), box(3.6, .9, 1.7, lam({ color: '#e0b82a' }), 6.4, .75, 3.4), box(1.9, .55, 1.5, lam({ color: '#20242c' }), 6.4, 1.45, 3.4), box(2.4, 1.1, 1, lam({ color: '#4a5468' }), 2.4, .55, 4));
  // Ufuk çizgisi: İkiz Kuleler yalnızca sabahta görünür; yıkım gösterilmez.
  const city = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), lam({ color: '#6f7a86' }), 70), M = new THREE.Matrix4(), Q = new THREE.Quaternion(); for (let i = 0; i < 70; i++) { const h = 24 + ((i * 41) % 70), w = 9 + i % 7, x = -220 + i * 6.4; M.compose(new THREE.Vector3(x, h / 2, -330 - (i * 17 % 60)), Q, new THREE.Vector3(w, h, 10)); city.setMatrixAt(i, M); } city.userData.dyn = true; g.add(city);
  const towers = new THREE.Group(); for (const x of [-14, 12]) towers.add(box(20, 178, 20, lam({ color: '#a9b4be' }), x, 89, -345)); towers.userData.dyn = true; g.add(towers);
  const actors = [], hero = placed(actors, g); const groups = [[hero({ robe: '#3a3f4a', hat: 'none' }, 7, .6, -2, 'Interact').root, hero({ model: 'hood', robe: '#6a5a4a', hat: 'none' }, 8.2, 1, -2.2).root], [hero({ model: 'hood', robe: '#54607a', hat: 'none' }, -7, .4, 1.4, 'Interact').root, hero({ robe: '#4a4a50', hat: 'none' }, -8.2, .8, 1).root]];
  hero({ robe: '#6a5a4a', hat: 'none' }, 0, 0, 0).patrol([[-10, 6], [10, 7]], 1.1); hero({ model: 'hood', robe: '#3a3f4a', hat: 'none' }, 0, 0, 0).patrol([[12, 2], [-12, 1]], 1);
  bakeStatic(g);
  const hemi = new THREE.HemisphereLight('#d0e0ec', '#7a7a70', 1.6); g.add(hemi); const sun = sunShadow(new THREE.DirectionalLight('#fff0d0', 2.5), 44); sun.position.set(40, 44, 26); sun.target.position.set(0, 0, 4); g.add(sun, sun.target);
  const beams = [-14, 12].map(x => { const c = new THREE.Mesh(new THREE.CylinderGeometry(7, 4, 620, 12, 1, true), new THREE.MeshBasicMaterial({ color: '#8fb4ff', transparent: true, opacity: .32, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); c.position.set(x, 310, -345); c.visible = false; g.add(c); return c; });
  const cand = new Float32Array(150); for (let i = 0; i < 50; i++) cand.set([-16 + Math.random() * 32, .58, -3.3 + Math.random() * .3], i * 3); const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.BufferAttribute(cand, 3)); const cp = new THREE.Points(cg, new THREE.PointsMaterial({ color: '#ffc880', size: .22, map: T.soft('255,255,255'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); cp.visible = false; g.add(cp);
  const fog = new THREE.Fog('#bcd2e0', 140, 620), day = () => { towers.visible = true; sky.material.map = skyA; sky.material.needsUpdate = true; hemi.intensity = 1.6; sun.intensity = 2.5; beams.forEach(b => { b.visible = false; }); cp.visible = false; fog.color.set('#bcd2e0'); }, night = (lit) => { towers.visible = false; sky.material.map = skyB; sky.material.needsUpdate = true; hemi.intensity = .75; sun.intensity = .15; beams.forEach(b => { b.visible = lit; }); cp.visible = lit; fog.color.set('#0e121c'); };
  const spect = stubSpect({ start: () => night(true), stop: day });
  return { group: g, groups, actors, spect, floorY: 0, fog, bg: '#bcd2e0', toAfter() { night(true); }, climax() {}, reset: day,
    tick(dt, t) { spect.tick(dt); runActors(actors, dt); n.offset.set(t * .012, t * .02); } };
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
  // Bastille'in Düşüşü: iskele, toplar ve kaleye akan kalabalık.
  const stage = new THREE.Group(); stage.visible = false; g.add(stage); const R = (a) => Math.random() * a, woodS = lam({ map: T.wood(2, 1) });
  stage.add(box(7.5, .22, 4.2, woodS, 0, 5.9, -5)); for (const [x, z] of [[-3.6, -3], [3.6, -3], [-3.6, -7], [3.6, -7]]) stage.add(box(.2, 5.9, .2, woodS, x, 2.95, z)); stage.add(box(7.5, .1, .1, woodS, 0, 6.42, -7.05), box(.1, .1, 4.2, woodS, -3.7, 6.42, -5), box(.1, .1, 4.2, woodS, 3.7, 6.42, -5));
  const cNames = ['#3a3f4a', '#6e2a21', '#2d3f73', '#5a4a30', '#c8bda6', '#7a5a3a', '#4b5a48'], N = 2600, mob = army(N, () => { const u = R(2) - 1, x = Math.sign(u) * Math.pow(Math.abs(u), 1.3) * 14, z = 8 - R(1) * 37; return { x, z, ax: x, color: cNames[R(7) | 0], delay: 76 + (z + 29) / 37 * 15 + R(2), speed: 2.5 + R(.6), dist: z + 33.5, back: 9999 }; }, true, CIVILIAN); stage.add(mob);
  const pGuns = [-4.5, 4.5].map(x => { const c = new THREE.Group(), b = new THREE.Mesh(new THREE.CylinderGeometry(.13, .17, 2, 10), lam({ color: '#6b5230' })); b.rotation.x = Math.PI / 2; b.position.y = .7; c.add(b, box(.9, .25, 1.6, woodS, 0, .3, .3)); c.position.set(x, 0, -24); c.visible = false; stage.add(c); return c; });
  const flashes = pGuns.map(c => { const s = glow(5, '255,210,140'); s.position.set(c.position.x, 1, -26); s.visible = false; stage.add(s); return s; });
  const spect = { active: false, t: 0, next: 0, puff: 0, sound: null, setDensity: (k) => { mob.count = Math.floor(N * k); }, raiseFlag() {} };
  spect.start = (sound) => { Object.assign(spect, { active: true, t: 0, next: 33, puff: 14, sound, dropped: false }); stage.visible = true; mob.userData.uni.uT.value = 0; pGuns.forEach(c => { c.visible = false; }); };
  spect.stop = () => { spect.active = false; stage.visible = false; };
  spect.tick = (dt) => {
    if (!spect.active) return; spect.t += dt; const t = spect.t; mob.userData.uni.uT.value = t; flashes.forEach(f => { f.visible = false; });
    if (t > 31) pGuns.forEach(c => { c.visible = true; });
    if (t > spect.puff && t < 66) { spect.puff = t + 1.2 + R(1.6); smoke.burst(new THREE.Vector3(-14 + R(28), 13 + R(5), -35.2), 2, .9); spect.sound?.thud(150, .28, .3); }
    if (t > spect.next && t < 66) { spect.next = t + 6 + R(3); const f = flashes[R(2) | 0]; f.visible = true; smoke.burst(f.position, 4, 1.8); spect.sound?.cannon(); }
    if (t > 75 && !spect.dropped) { spect.dropped = true; drop = 1; cheer = 1; spect.sound?.thud(60, 1.5, 1); }
  };
  return { group: g, groups, actors, spect, floorY: 0, fog: new THREE.Fog('#aeb2ae', 34, 150), bg: '#aeb2ae',
    climax(sound) { sound.thud(70, 1.1, .9, .1); sound.thud(52, 1.6, 1.2, .9); drop = 1; cheer = 1; smoke.burst(new THREE.Vector3(0, 2, -30), 8, 1.6, .4); },
    reset() { smoke.clear(); bridge.rotation.x = -Math.PI / 2 + .12; drop = 0; cheer = 0; },
    tick(dt, t) { spect.tick(dt); runActors(actors, dt); if (drop) { bridge.rotation.x = Math.min(0, bridge.rotation.x + dt * 1.1); if (bridge.rotation.x === 0) drop = 0; }
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
  if (kind === 'lantern') { it.add(box(.16, .24, .16, new THREE.MeshBasicMaterial({ color: '#ffcf80' })), box(.2, .03, .2, lam({ color: '#2a2622' }), 0, .13, 0), box(.2, .03, .2, lam({ color: '#2a2622' }), 0, -.13, 0)); }
  if (kind === 'flag') { const p = new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, .42, 5), lam({ color: '#3a2a1a' })); p.position.y = .05; const c = new THREE.Mesh(new THREE.PlaneGeometry(.26, .17), flagMat()); c.position.set(.14, .18, 0); it.add(p, c); }
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
