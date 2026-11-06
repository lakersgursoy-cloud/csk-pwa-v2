import * as THREE from 'three';
import * as T from './textures.js';
import { Panel } from './ui.js';

const lam = (o) => new THREE.MeshLambertMaterial(o);
export const box = (w, h, d, m, x = 0, y = 0, z = 0) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); return b; };
const hitbox = (r, x, y, z) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); m.position.set(x, y, z); return m; };
export const glow = (size, color) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.soft(color), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); s.scale.setScalar(size); return s; };

const figureGeo = {
  body: new THREE.CylinderGeometry(.17, .3, 1.25, 8), head: new THREE.SphereGeometry(.115, 10, 8),
  arm: new THREE.CylinderGeometry(.05, .045, .62, 6), cap: new THREE.CylinderGeometry(.1, .135, .24, 8),
  turban: new THREE.SphereGeometry(.16, 10, 6), helm: new THREE.SphereGeometry(.13, 10, 6, 0, 6.3, 0, 1.7),
};
export function figure({ robe = '#7b2e22', cap = '#d8ccb2', hat = 'bork', skin = '#b98a66', stone = false } = {}) {
  const f = new THREE.Group(), R = lam({ color: robe }), S = lam({ color: skin }), C = lam({ color: cap });
  const body = new THREE.Mesh(figureGeo.body, R); body.position.y = .72; f.add(body);
  const head = new THREE.Group(); head.position.y = 1.5; f.add(head); f.userData.head = head;
  head.add(new THREE.Mesh(figureGeo.head, S));
  const h = new THREE.Mesh(hat === 'turban' ? figureGeo.turban : hat === 'helm' ? figureGeo.helm : figureGeo.cap, C);
  h.position.y = hat === 'bork' ? .15 : .05; if (hat === 'turban') h.scale.y = .72; head.add(h);
  for (const s of [-1, 1]) { const a = new THREE.Mesh(figureGeo.arm, R); a.position.set(s * .24, 1.05, .03); a.rotation.z = s * .14; f.add(a); }
  if (stone) f.traverse(o => { if (o.isMesh) o.material = lam({ color: '#c8c2b5' }); });
  f.userData.phase = Math.random() * 7; return f;
}

export function buildMuseum() {
  const g = new THREE.Group(), L = 26, W = 13, H = 8, cz = -1;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, L), lam({ map: T.marbleFloor(W / 2, L / 2) })); floor.rotation.x = -Math.PI / 2; floor.position.z = cz; g.add(floor);
  const wall = lam({ map: T.plaster(4, 2) }), dark = lam({ color: '#1b1411' }), stone = lam({ color: '#b8ae9c' }), gold = lam({ color: '#a97f2e', emissive: '#2f2108' });
  for (const s of [-1, 1]) { const m = box(.3, H, L, wall, s * (W / 2 + .15), H / 2, cz); g.add(m); }
  g.add(box(W, H, .3, wall, 0, H / 2, cz - L / 2 - .15), box(W, H, .3, wall, 0, H / 2, cz + L / 2 + .15), box(W, .3, L, dark, 0, H + .15, cz));
  const colG = new THREE.CylinderGeometry(.3, .36, H - .9, 14), cols = new THREE.InstancedMesh(colG, stone, 12), M = new THREE.Matrix4();
  for (let i = 0; i < 12; i++) { M.setPosition((i % 2 ? 1 : -1) * 5.2, (H - .9) / 2 + .45, 10 - (i >> 1) * 4.4); cols.setMatrixAt(i, M); }
  g.add(cols);
  for (const s of [-1, 1]) { g.add(box(.6, H * .06, L, gold, s * (W / 2 - .2), H - .22, cz)); }
  // Yan duvar tabloları
  const frames = [['#3b4a58', '#d0a45e'], ['#57302a', '#c9b48a'], ['#27332c', '#b58a4a'], ['#4a3b52', '#d2b070']];
  frames.forEach(([a, b], i) => {
    const c = document.createElement('canvas'); c.width = 128; c.height = 96; const x = c.getContext('2d'), gr = x.createLinearGradient(0, 0, 0, 96);
    gr.addColorStop(0, a); gr.addColorStop(1, b); x.fillStyle = gr; x.fillRect(0, 0, 128, 96); x.fillStyle = '#1b1411';
    for (let k = 0; k < 16; k++) x.fillRect(k * 8 + (i * 13) % 7, 64 + (k * 37 % 22), 4, 14);
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
    const s = i % 2 ? 1 : -1, z = 8 - (i >> 1) * 9, p = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.95), new THREE.MeshBasicMaterial({ map: tx }));
    p.position.set(s * (W / 2 - .03), 3, z); p.rotation.y = -s * Math.PI / 2; g.add(box(.06, 2.2, 2.85, gold, s * (W / 2 - .01), 3, z), p);
  });
  // Konuşan heykel
  const statue = figure({ stone: true, hat: 'turban' }); statue.scale.setScalar(1.25); statue.position.set(-3, .7, 0.5); statue.rotation.y = Math.PI / 2 - .1; g.add(statue, box(1.3, .7, 1.3, stone, -3, .35, .5));
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
  const door1453 = mkDoor(-3, '1453', 'İstanbul', T.drawIstanbul, '255,180,100'), door1789 = mkDoor(3, '1789', 'Paris · sonraki sürüm', T.drawParis, '150,180,220');
  // Koleksiyon kaidesi
  const pedestal = new THREE.Group(); pedestal.position.set(3, 0, 1); pedestal.add(box(.9, 1.05, .9, stone, 0, .525, 0));
  const map = new THREE.Mesh(new THREE.PlaneGeometry(.8, .6), new THREE.MeshBasicMaterial({ map: T.drawMap() })); map.position.set(0, 1.08, 0); map.rotation.x = -1.1; map.visible = false; pedestal.add(map);
  const pedHit = hitbox(.75, 0, 1.1, 0); pedestal.add(pedHit); const pedGlow = glow(1.5, '255,210,130'); pedGlow.position.y = 1.2; pedGlow.visible = false; pedestal.add(pedGlow); g.add(pedestal);
  // Konfor levhası
  const comfort = new Panel(1.3, .46, { size: 50 }); comfort.position.set(W / 2 - .05, 1.45, 8.6); comfort.rotation.y = -Math.PI / 2; g.add(comfort);
  const lights = [[0, 6, 8, 34], [0, 6, -7, 42]].map(([x, y, z, i]) => { const l = new THREE.PointLight('#ffcf9a', i, 26, 1.6); l.position.set(x, y, z); return l; }); g.add(...lights);
  g.add(new THREE.HemisphereLight('#d6c4a8', '#2a1c14', 1.1));
  return { group: g, bounds: { x: [-6, 6], z: [-12.5, 11] }, floor, statue, door1453, door1789, map, pedHit, pedGlow, comfort, fog: new THREE.Fog('#17100c', 16, 44), bg: '#120d0a' };
}

export function build1453() {
  const g = new THREE.Group();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(220, 24, 16), new THREE.MeshBasicMaterial({ map: T.duskSky(), side: THREE.BackSide, fog: false })); g.add(sky);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(240, 160), lam({ map: T.dirt(38, 26) })); floor.rotation.x = -Math.PI / 2; floor.position.z = -10; g.add(floor);
  // Hendek, dış sur, iç sur
  const wa = lam({ map: T.theodosianWall(44, 2.5) }), ta = lam({ map: T.theodosianWall(2.5, 5) }), wb = lam({ map: T.theodosianWall(44, 3.8) }), dark = lam({ color: '#40362b' });
  g.add(box(240, .2, 15, lam({ color: '#2d2720' }), 0, .02, -33), box(240, 2.2, .8, dark, 0, 1.1, -26.5));
  g.add(box(240, 8.5, 2.4, wa, 0, 4.25, -41), box(240, 13, 4.8, wb, 0, 6.5, -52));
  const towers = [], merlons = new THREE.InstancedMesh(new THREE.BoxGeometry(.9, 1.1, .7), lam({ color: '#6f6658' }), 180), M = new THREE.Matrix4(); let mi = 0;
  for (let x = -96; x <= 96; x += 24) { towers.push(box(8, 8.5 + 3, 6, ta, x + 12, 5.75, -41), box(10, 21, 10, ta, x, 10.5, -52)); }
  g.add(...towers);
  for (let x = -108; x <= 108 && mi < 180; x += 2.4) { M.setPosition(x, 9, -40.2); merlons.setMatrixAt(mi++, M); M.setPosition(x, 13.5, -49.8); merlons.setMatrixAt(mi++, M); }
  merlons.count = mi; g.add(merlons);
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
  // Sandık ve tapa
  g.add(box(1.1, .7, .7, woodM, -5.2, .35, -4.2));
  const wad = new THREE.Mesh(new THREE.CylinderGeometry(.13, .13, .16, 12), lam({ map: T.wood(1, 1) })); wad.position.set(-5.2, .84, -4.2);
  const wadHit = hitbox(.45, -5.2, .9, -4.2), wadGlow = glow(.7, '255,210,120'); wadGlow.position.set(-5.2, .95, -4.2); g.add(wad, wadHit, wadGlow);
  // Tapa bırakma noktası, fitil, harita
  const gunHit = hitbox(1, 2.5, 1.2, -9.5), gunGlow = glow(1.5, '255,200,110'); gunGlow.position.set(2.8, 1.5, -9.2); gunGlow.visible = false; g.add(gunHit, gunGlow);
  const linstock = new THREE.Group(); linstock.position.set(5.2, 0, -7.6); linstock.add(new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 1.7, 6), woodM)); linstock.children[0].position.y = .85;
  const matchGlow = glow(.5, '255,110,40'); matchGlow.position.y = 1.72; linstock.add(matchGlow); const linHit = hitbox(.6, 5.2, 1.1, -7.6); linstock.visible = false; g.add(linstock, linHit);
  const mapItem = new THREE.Mesh(new THREE.PlaneGeometry(.7, .52), new THREE.MeshBasicMaterial({ map: T.drawMap() })); mapItem.position.set(-5.2, .76, -4.2); mapItem.rotation.x = -Math.PI / 2; mapItem.visible = false; const mapHit = hitbox(.6, -5.2, .9, -4.2); g.add(mapItem, mapHit);
  const mapGlow = glow(1.1, '255,220,150'); mapGlow.position.set(-5.2, 1, -4.2); mapGlow.visible = false; g.add(mapGlow);
  // Ateşler
  const fires = [[-9, 0], [11, 2], [-1, 7]].map(([x, z]) => { const s = glow(2.4, '255,130,50'); s.position.set(x, .8, z); g.add(s, box(.9, .2, .9, lam({ color: '#1e1610' }), x, .1, z)); return s; });
  const fireLight = new THREE.PointLight('#ff8a3c', 45, 24, 1.8); fireLight.position.set(-1, 2.6, 1); g.add(fireLight);
  // İnsanlar
  const people = [];
  const add = (o, x, z, ry) => { const f = figure(o); f.position.set(x, 0, z); f.rotation.y = ry; g.add(f); people.push(f); return f; };
  const helper = add({ robe: '#6c5236', cap: '#c9bb9e' }, -2, -21, 2.4), helperGlow = glow(2.6, '180,215,255'); helperGlow.position.set(-2, 1.1, -21); g.add(helperGlow);
  const helperHit = hitbox(.9, -2, 1, -21); g.add(helperHit);
  const usta = add({ robe: '#3d3a4a', cap: '#e4dcc8', hat: 'turban' }, 2.4, -6.8, -1.1);
  const yusuf = add({ robe: '#7a3a25', cap: '#a89a7e' }, -1.2, -7, .8);
  const groups = [[add({ robe: '#27415a', cap: '#e8e0ce', hat: 'turban' }, 9, -21, -1.4), add({ robe: '#6e2a21', cap: '#e8e0ce' }, 10.4, -20.6, -2.2)], [add({ robe: '#4a4f34', cap: '#cfc3a6' }, -11, -19.5, 1.2), add({ robe: '#3f2d24', cap: '#cfc3a6' }, -12.2, -20.4, .3)]];
  for (const [x, z, r] of [[-6, 0, .4], [7, 4, 2.5], [-13, 3, 1], [12, -3, 3.5], [0, 3, 1.5], [-15, -8, 2], [15, -12, 4]]) add({ robe: ['#6e2a21', '#27415a', '#5a4a30'][Math.abs(x) % 3], hat: x % 2 ? 'bork' : 'turban' }, x, z, r);
  // Sur üzerindeki savunmacılar
  for (let x = -30; x <= 30; x += 10) { const f = figure({ robe: '#4e4b53', cap: '#8d8d92', hat: 'helm' }); f.position.set(x + 1.5, 13, -50.9); g.add(f); }
  // Duman ve toz
  const smoke = Array.from({ length: 10 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.soft('190,180,165'), transparent: true, opacity: 0, depthWrite: false })); s.scale.setScalar(2); g.add(s); return s; });
  const flash = glow(11, '255,210,140'); flash.position.copy(muzzle); flash.visible = false; g.add(flash);
  g.add(new THREE.HemisphereLight('#c8a68a', '#32281e', 1.45)); const sun = new THREE.DirectionalLight('#ffb878', 1.6); sun.position.set(-40, 16, 60); g.add(sun);
  return { group: g, bounds: { x: [-23, 23], z: [-24.5, 12] }, floor, helper, helperHit, helperGlow, usta, yusuf, groups, people, fires, fireLight, wad, wadHit, wadGlow, gunHit, gunGlow, linstock, linHit, matchGlow, mapItem, mapHit, mapGlow, smoke, flash, muzzle, fog: new THREE.Fog('#7c5a48', 30, 150), bg: '#3a2c2c' };
}

// Dönem kollu el. Zaman yolcusuyken saydam, hafıza geçişinde gerçek kıyafetli görünür.
export function makeHand() {
  const skin = lam({ color: '#b98a66', transparent: true }), sleeve = lam({ color: '#6c5236', transparent: true }), h = new THREE.Group();
  h.add(box(.075, .028, .09, skin, 0, 0, -.015));
  for (let i = 0; i < 4; i++) h.add(box(.015, .017, .07, skin, -.027 + i * .018, 0, -.09));
  const th = box(.02, .019, .055, skin, .05, 0, -.03); th.rotation.y = -.6; h.add(th);
  const s = new THREE.Mesh(new THREE.CylinderGeometry(.042, .062, .3, 10), sleeve); s.rotation.x = Math.PI / 2; s.position.z = .19; h.add(s);
  const cuff = new THREE.Mesh(new THREE.TorusGeometry(.046, .009, 6, 12), lam({ color: '#c9b48a', transparent: true })); cuff.position.z = .05; h.add(cuff);
  h.userData.setPersona = (on) => { for (const m of [skin, sleeve, cuff.material]) { m.opacity = on ? 1 : .22; m.emissive?.set(on ? '#000' : '#264a66'); } };
  h.userData.setPersona(false); return h;
}
