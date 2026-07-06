import * as THREE from 'three';
import { toon, lighten, darken, rand, pick, shadowify } from './utils.js';
import { buildMimimo, animateMimimo, disposeMimimo } from './mimimo.js';

const ROOM = { halfX: 7, backZ: -6, frontZ: 6, wallH: 6 };
const ITEM_COLORS = ['#ff9ed2', '#ffb46b', '#ffe066', '#8ee08e', '#7ad0ff', '#b79cff', '#ff8f8f', '#c8a2ff'];

const box = (w, h, d, color) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(color));
const cyl = (rt, rb, h, color) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 12), toon(color));

/* ------------------------------------------------------------ furniture */

function bed(color) {
  const g = new THREE.Group();
  const frame = box(2.4, 0.6, 3.4, darken(color, 0.2)); frame.position.y = 0.3; g.add(frame);
  const mattress = box(2.2, 0.45, 3.2, '#fffdf8'); mattress.position.y = 0.72; g.add(mattress);
  const blanket = box(2.25, 0.32, 2.0, color); blanket.position.set(0, 0.98, 0.55); g.add(blanket);
  const pillow = box(1.7, 0.32, 0.7, lighten(color, 0.4)); pillow.position.set(0, 0.98, -1.25); g.add(pillow);
  return g;
}

function chair(color) {
  const g = new THREE.Group();
  const seat = box(1.1, 0.22, 1.1, color); seat.position.y = 0.9; g.add(seat);
  const back = box(1.1, 1.1, 0.22, color); back.position.set(0, 1.4, -0.44); g.add(back);
  for (const sx of [-0.45, 0.45]) for (const sz of [-0.45, 0.45]) {
    const leg = box(0.16, 0.9, 0.16, darken(color, 0.25)); leg.position.set(sx, 0.45, sz); g.add(leg);
  }
  return g;
}

function table(color) {
  const g = new THREE.Group();
  const top = box(2.0, 0.22, 1.4, color); top.position.y = 1.2; g.add(top);
  for (const sx of [-0.8, 0.8]) for (const sz of [-0.55, 0.55]) {
    const leg = box(0.18, 1.2, 0.18, darken(color, 0.25)); leg.position.set(sx, 0.6, sz); g.add(leg);
  }
  const vase = cyl(0.16, 0.2, 0.4, '#7ad0ff'); vase.position.set(0, 1.5, 0); g.add(vase);
  const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), toon('#ff8fc7')); bloom.position.set(0, 1.8, 0); g.add(bloom);
  return g;
}

function sofa(color) {
  const g = new THREE.Group();
  const base = box(3.0, 0.7, 1.5, color); base.position.y = 0.5; g.add(base);
  const back = box(3.0, 0.95, 0.35, color); back.position.set(0, 1.1, -0.6); g.add(back);
  for (const sx of [-1.35, 1.35]) {
    const arm = box(0.4, 0.9, 1.5, lighten(color, 0.15)); arm.position.set(sx, 0.85, 0); g.add(arm);
  }
  for (const sx of [-0.7, 0.7]) {
    const cushion = box(1.2, 0.3, 1.2, lighten(color, 0.35)); cushion.position.set(sx, 0.95, 0.05); g.add(cushion);
  }
  return g;
}

function lamp(color) {
  const g = new THREE.Group();
  const base = cyl(0.35, 0.4, 0.14, darken(color, 0.3)); base.position.y = 0.07; g.add(base);
  const pole = cyl(0.06, 0.06, 2.1, '#b98a5e'); pole.position.y = 1.1; g.add(pole);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.6, 0.8, 16, 1, true), toon('#fff2b8'));
  shade.position.y = 2.2; g.add(shade);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), new THREE.MeshBasicMaterial({ color: '#fff6cf' }));
  glow.position.y = 2.0; g.add(glow);
  return g;
}

function plant() {
  const g = new THREE.Group();
  const pot = cyl(0.4, 0.32, 0.6, '#e0a56b'); pot.position.y = 0.3; g.add(pot);
  const soil = cyl(0.36, 0.36, 0.1, '#7a5a3a'); soil.position.y = 0.58; g.add(soil);
  for (const [x, y, z, r] of [[0, 1.0, 0, 0.5], [-0.3, 1.3, 0.1, 0.38], [0.3, 1.35, -0.1, 0.36], [0, 1.6, 0, 0.34]]) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), toon('#8ee08e'));
    leaf.position.set(x, y, z); g.add(leaf);
  }
  return g;
}

function tv() {
  const g = new THREE.Group();
  const stand = box(2.2, 0.6, 0.6, '#b98a5e'); stand.position.y = 0.3; g.add(stand);
  const screen = box(2.6, 1.6, 0.24, '#3a2b4a'); screen.position.y = 1.6; g.add(screen);
  const glass = box(2.3, 1.3, 0.1, '#7ad0ff'); glass.position.set(0, 1.6, 0.14); g.add(glass);
  const heart = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), toon('#ff8fc7')); heart.position.set(0, 1.6, 0.22); g.add(heart);
  return g;
}

function rug(color) {
  const g = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 0.06, 28), toon(color));
  disc.position.y = 0.03; g.add(disc);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.12, 8, 28), toon(lighten(color, 0.4)));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06; g.add(ring);
  return g;
}

function toy(color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.45, 14, 12), toon(color)); body.position.y = 0.45; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 14, 12), toon(color)); head.position.y = 1.0; g.add(head);
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), toon(color)); ear.position.set(side * 0.26, 1.28, 0); g.add(ear);
  }
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), toon('#3a2b4a')); eye.position.set(side * 0.13, 1.02, 0.32); g.add(eye);
  }
  return g;
}

function balloon(color) {
  const g = new THREE.Group();
  const string = cyl(0.02, 0.02, 2.2, '#8a6b4a'); string.position.y = 1.1; g.add(string);
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 12), toon(color)); b.position.y = 2.5; b.scale.y = 1.2; g.add(b);
  const knot = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.16, 8), toon(color)); knot.position.y = 2.0; knot.rotation.x = Math.PI; g.add(knot);
  return g;
}

/** kind -> builder. `flat` items (rugs) sit under things and don't collide. */
const FURNITURE = {
  bed: { emoji: '🛏️', build: bed },
  sofa: { emoji: '🛋️', build: sofa },
  chair: { emoji: '🪑', build: chair },
  table: { emoji: '🍽️', build: table },
  lamp: { emoji: '💡', build: lamp },
  plant: { emoji: '🪴', build: plant },
  tv: { emoji: '📺', build: tv },
  rug: { emoji: '🟣', build: rug, flat: true },
  toy: { emoji: '🧸', build: toy },
  balloon: { emoji: '🎈', build: balloon },
};

export const FURNITURE_KINDS = Object.entries(FURNITURE).map(([key, v]) => ({ key, emoji: v.emoji }));

/* ------------------------------------------------------------ the room */

function buildRoom(scene) {
  const wallMat = toon('#ffe9d6');
  const w = ROOM.halfX * 2 + 2;
  const depth = ROOM.frontZ - ROOM.backZ + 2;

  // wood floor
  const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.4, depth), toon('#e9c79a'));
  floor.position.set(0, -0.2, (ROOM.backZ + ROOM.frontZ) / 2);
  floor.receiveShadow = true;
  scene.add(floor);
  // checker planks
  for (let i = 0; i < 6; i++) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(w, 0.42, 1.0), toon('#dcb888'));
    plank.position.set(0, -0.19, ROOM.backZ + 1 + i * 2);
    scene.add(plank);
  }

  // back wall + side walls
  const back = new THREE.Mesh(new THREE.BoxGeometry(w, ROOM.wallH, 0.4), wallMat);
  back.position.set(0, ROOM.wallH / 2, ROOM.backZ - 1);
  scene.add(back);
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.4, ROOM.wallH, depth), toon('#ffe0c8'));
    wall.position.set(side * (ROOM.halfX + 1), ROOM.wallH / 2, (ROOM.backZ + ROOM.frontZ) / 2);
    scene.add(wall);
  }

  // striped wallpaper trim
  const trim = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, 0.42), toon('#ff9ed2'));
  trim.position.set(0, 1.4, ROOM.backZ - 0.98);
  scene.add(trim);

  // door on the back wall
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(2.0, 3.2, 0.3), toon('#c98a5c'));
  doorFrame.position.set(-4, 1.6, ROOM.backZ - 0.85);
  scene.add(doorFrame);
  const doorSlab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.8, 0.2), toon('#e0a56b'));
  doorSlab.position.set(-4, 1.4, ROOM.backZ - 0.78);
  scene.add(doorSlab);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), toon('#ffe066'));
  knob.position.set(-3.4, 1.4, ROOM.backZ - 0.66);
  scene.add(knob);

  // sunny window
  const winFrame = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.2, 0.3), toon('#fffdf8'));
  winFrame.position.set(3.2, 3.2, ROOM.backZ - 0.9);
  scene.add(winFrame);
  const sky = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.8, 0.14), toon('#bfeaff'));
  sky.position.set(3.2, 3.2, ROOM.backZ - 0.78);
  scene.add(sky);
  const cloud = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 10), toon('#ffffff'));
  cloud.position.set(3.6, 3.4, ROOM.backZ - 0.7); cloud.scale.set(1.4, 0.8, 0.4);
  scene.add(cloud);

  // invisible plane used for placing furniture by tapping
  const floorHit = new THREE.Mesh(
    new THREE.PlaneGeometry(w, depth),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  floorHit.rotation.x = -Math.PI / 2;
  floorHit.position.set(0, 0, (ROOM.backZ + ROOM.frontZ) / 2);
  scene.add(floorHit);

  return floorHit;
}

/**
 * A cozy house interior you can walk around and decorate. Everything the
 * player places is saved per-house in localStorage, so it's there next time.
 */
export function makeInterior() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#ffe8f4');

  scene.add(new THREE.HemisphereLight('#fff2f8', '#d8b8ff', 1.1));
  const lamp = new THREE.DirectionalLight('#fff2d8', 1.6);
  lamp.position.set(6, 12, 8);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(1024, 1024);
  scene.add(lamp);

  const floorHit = buildRoom(scene);

  let player = null;
  let houseKey = 'home';
  let tool = 'bed';
  const items = []; // { group, kind, x, z, ry }
  const raycaster = new THREE.Raycaster();

  function saveKeyFor(key) { return `mimimo.house.${key}`; }

  function addItem(kind, x, z, ry, save = true) {
    const def = FURNITURE[kind];
    if (!def) return;
    const group = def.build(pick(ITEM_COLORS));
    group.position.set(x, 0, z);
    group.rotation.y = ry;
    shadowify(group);
    scene.add(group);
    items.push({ group, kind, x, z, ry });
    if (save) persist();
  }

  function persist() {
    const data = items.map((it) => ({ kind: it.kind, x: +it.x.toFixed(2), z: +it.z.toFixed(2), ry: +it.ry.toFixed(2) }));
    try { localStorage.setItem(saveKeyFor(houseKey), JSON.stringify(data)); } catch { /* ignore */ }
  }

  function clearItems() {
    for (const it of items) disposeMimimo(it.group); // disposes geometry + removes
    items.length = 0;
  }

  function loadItems() {
    clearItems();
    let data = [];
    try { data = JSON.parse(localStorage.getItem(saveKeyFor(houseKey))) || []; } catch { data = []; }
    for (const d of data) addItem(d.kind, d.x, d.z, d.ry, false);
  }

  function enter(config, key) {
    houseKey = key || 'home';
    if (player) disposeMimimo(player);
    player = buildMimimo(config);
    player.position.set(2, 0, 3);
    player.rotation.y = Math.PI;
    scene.add(player);
    loadItems();
  }

  function setTool(kind) { if (FURNITURE[kind]) tool = kind; }
  function getTool() { return tool; }

  function undo() {
    const it = items.pop();
    if (it) { disposeMimimo(it.group); persist(); }
  }

  function clearAll() { clearItems(); persist(); }

  /** Tap on the floor (ndc in [-1,1]) to drop the current furniture. */
  function tapPlace(ndc, camera) {
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObject(floorHit);
    if (!hit.length) return false;
    let { x, z } = hit[0].point;
    x = Math.max(-ROOM.halfX + 0.6, Math.min(ROOM.halfX - 0.6, x));
    z = Math.max(ROOM.backZ + 0.6, Math.min(ROOM.frontZ - 0.4, z));
    addItem(tool, x, z, rand(0, Math.PI * 2));
    return true;
  }

  const PLAYER_SPEED = 4.2;
  let heading = Math.PI;

  function update(dt, t, move) {
    if (!player) return;
    const moving = Math.hypot(move.x, move.z) > 0.05;
    if (moving) {
      player.position.x += move.x * PLAYER_SPEED * dt;
      player.position.z += move.z * PLAYER_SPEED * dt;
      player.position.x = Math.max(-ROOM.halfX + 0.4, Math.min(ROOM.halfX - 0.4, player.position.x));
      player.position.z = Math.max(ROOM.backZ + 0.6, Math.min(ROOM.frontZ - 0.4, player.position.z));
      heading = Math.atan2(move.x, move.z);
    }
    let d = heading - player.rotation.y;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    player.rotation.y += d * Math.min(1, dt * 10);
    animateMimimo(player, t, dt, moving);

    // gently bob any balloons
    for (const it of items) {
      if (it.kind === 'balloon') it.group.position.y = Math.sin(t * 1.5 + it.x) * 0.15;
    }
  }

  function getPlayerPos() { return player ? player.position : new THREE.Vector3(); }

  return { scene, enter, update, tapPlace, setTool, getTool, undo, clearAll, getPlayerPos };
}
