import * as THREE from 'three';
import { toon, lighten, darken, pick, rand, shadowify, textSprite } from './utils.js';
import { buildMimimo, animateMimimo, disposeMimimo, randomName, SPECIES, SHAPES, COLORS } from './mimimo.js';

const ROOM = { halfX: 7, backZ: -6, frontZ: 6, wallH: 6 };
const ITEM_COLORS = ['#ff9ed2', '#ffb46b', '#ffe066', '#8ee08e', '#7ad0ff', '#b79cff', '#ff8f8f', '#c8a2ff'];
let furnitureIdCounter = 0;

function newFurnitureItemId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  furnitureIdCounter += 1;
  return 'f_' + Date.now().toString(36) + '_' + furnitureIdCounter.toString(36)
    + '_' + Math.random().toString(36).slice(2, 10);
}

const GUEST_HELLOS = ['Knock knock! 🚪', 'Hello hello!', 'Thanks for inviting me! 💖'];
const GUEST_CHATTER = [
  'I love your house! 💖', 'So cozy in here!', 'Great decorating!',
  'Can I visit again?', 'This is the best party! 🎉', '🎵 La la la~',
];
const GUEST_REACTIONS = ['Yummy! 😋', 'That looks fun!', 'Hooray! 🎉', 'Me too, me too!', 'So tasty!'];

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
  const planks = [];
  const sideWalls = [];

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
    planks.push(plank);
  }

  // back wall + side walls
  const back = new THREE.Mesh(new THREE.BoxGeometry(w, ROOM.wallH, 0.4), wallMat);
  back.position.set(0, ROOM.wallH / 2, ROOM.backZ - 1);
  scene.add(back);
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.4, ROOM.wallH, depth), toon('#ffe0c8'));
    wall.position.set(side * (ROOM.halfX + 1), ROOM.wallH / 2, (ROOM.backZ + ROOM.frontZ) / 2);
    scene.add(wall);
    sideWalls.push(wall);
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

  return { floorHit, floor, planks, back, sideWalls, trim, sky };
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

  const room = buildRoom(scene);
  const { floorHit } = room;
  const floorThemes = [
    {
      background: '#ffe8f4', floor: '#e9c79a', plank: '#dcb888',
      back: '#ffe9d6', side: '#ffe0c8', trim: '#ff9ed2', sky: '#bfeaff',
    },
    {
      background: '#e7f8ff', floor: '#cde7c1', plank: '#b9d9ae',
      back: '#e1f4dc', side: '#d2edcf', trim: '#7ad0ff', sky: '#bfeaff',
    },
    {
      background: '#eee7ff', floor: '#e6d2aa', plank: '#d8c094',
      back: '#eadfff', side: '#ded2f8', trim: '#b79cff', sky: '#ffd9ef',
    },
  ];

  function applyFloorTheme() {
    const theme = floorThemes[currentFloor - 1] || floorThemes[0];
    scene.background.set(theme.background);
    room.floor.material.color.set(theme.floor);
    for (const plank of room.planks) plank.material.color.set(theme.plank);
    room.back.material.color.set(theme.back);
    for (const wall of room.sideWalls) wall.material.color.set(theme.side);
    room.trim.material.color.set(theme.trim);
    room.sky.material.color.set(theme.sky);
  }

  let player = null;
  let houseKey = 'home';
  let floorCount = 1;
  let currentFloor = 1;
  let tool = 'bed';
  let placementRotation = 0;
  let sleeping = false;
  let furnitureSyncAdapter = null;
  const sessionItemsByLocation = new Map();
  const items = []; // { group, itemId, kind, color, x, z, ry }
  const guests = []; // invited mimimo friends wandering the room
  const raycaster = new THREE.Raycaster();
  const _dir = new THREE.Vector3();

  function setGuestBubble(guest, text) {
    if (guest.userData.bubble) {
      guest.remove(guest.userData.bubble);
      guest.userData.bubble.material.map.dispose();
      guest.userData.bubble.material.dispose();
    }
    const bubble = textSprite(text, { fontSize: 36 });
    bubble.position.y = 2.6;
    guest.add(bubble);
    guest.userData.bubble = bubble;
    guest.userData.bubbleTime = 2.6;
  }

  function clearGuests() {
    for (const guest of guests) disposeMimimo(guest);
    guests.length = 0;
  }

  /** A random friend knocks and comes in to hang out. Up to three at once. */
  function inviteGuest() {
    if (guests.length >= 3) return null;
    const name = randomName();
    const guest = buildMimimo({
      species: pick(Object.keys(SPECIES)),
      color: pick(COLORS),
      shape: pick(Object.keys(SHAPES)),
    });
    guest.position.set(-4, 0, ROOM.backZ + 1.2); // appears by the door
    scene.add(guest);
    const tag = textSprite(name);
    tag.position.y = 2.35;
    guest.add(tag);
    guest.userData.ai = { target: null, wait: 0.6, chat: rand(3, 7) };
    guests.push(guest);
    setGuestBubble(guest, pick(GUEST_HELLOS));
    return name;
  }

  /** Guests cheer when the player eats or plays with something. */
  function guestsReact() {
    for (const guest of guests) {
      setGuestBubble(guest, pick(GUEST_REACTIONS));
      if (player) {
        _dir.subVectors(player.position, guest.position);
        guest.rotation.y = Math.atan2(_dir.x, _dir.z);
      }
    }
  }

  function saveKeyFor(key, floor = currentFloor) {
    const base = 'mimimo.house.' + key;
    return floor === 1 ? base : base + '.floor' + floor;
  }

  function getFurnitureLocationId() {
    return 'house:' + houseKey + ':floor:' + currentFloor;
  }

  function normalizeFurnitureItem(raw, { generateId = false, generateColor = false } = {}) {
    if (!raw || typeof raw !== 'object' || !FURNITURE[raw.kind]) return null;

    let itemId = typeof raw.itemId === 'string' ? raw.itemId.trim() : '';
    if (!itemId && generateId) itemId = newFurnitureItemId();
    if (!itemId) return null;

    const requestedColor = typeof raw.color === 'string' ? raw.color.toLowerCase() : '';
    let color = ITEM_COLORS.includes(requestedColor) ? requestedColor : '';
    if (!color && generateColor) color = pick(ITEM_COLORS);
    if (!color) return null;

    let x = Number(raw.x);
    let z = Number(raw.z);
    let ry = Number(raw.ry);
    if (![x, z, ry].every(Number.isFinite)) return null;
    x = THREE.MathUtils.clamp(x, -ROOM.halfX + 0.6, ROOM.halfX - 0.6);
    z = THREE.MathUtils.clamp(z, ROOM.backZ + 0.6, ROOM.frontZ - 0.4);
    ry = THREE.MathUtils.euclideanModulo(ry, Math.PI * 2);

    return {
      itemId,
      kind: raw.kind,
      color,
      x: +x.toFixed(2),
      z: +z.toFixed(2),
      ry: +ry.toFixed(2),
    };
  }

  function serializeFurnitureItem(item) {
    return {
      itemId: item.itemId,
      kind: item.kind,
      color: item.color,
      x: +item.x.toFixed(2),
      z: +item.z.toFixed(2),
      ry: +item.ry.toFixed(2),
    };
  }

  function addRenderedItem(raw) {
    const item = normalizeFurnitureItem(raw);
    if (!item || items.some((existing) => existing.itemId === item.itemId)) return false;
    const def = FURNITURE[item.kind];
    const group = def.build(item.color);
    group.position.set(item.x, 0, item.z);
    group.rotation.y = item.ry;
    shadowify(group);
    scene.add(group);
    items.push({ group, ...item });
    return true;
  }

  function removeRenderedItem(itemId) {
    const index = items.findIndex((item) => item.itemId === itemId);
    if (index < 0) return false;
    const [item] = items.splice(index, 1);
    disposeMimimo(item.group);
    return true;
  }

  function persist() {
    if (furnitureSyncAdapter) return;
    const data = items.map(serializeFurnitureItem);
    try { localStorage.setItem(saveKeyFor(houseKey), JSON.stringify(data)); } catch { /* ignore */ }
  }

  function clearItems() {
    for (const it of items) disposeMimimo(it.group); // disposes geometry + removes
    items.length = 0;
  }

  function loadItems() {
    clearItems();

    if (furnitureSyncAdapter) {
      const sharedItems = sessionItemsByLocation.get(getFurnitureLocationId()) || [];
      for (const item of sharedItems) addRenderedItem(item);
      return;
    }

    let storedItems = [];
    try {
      const parsed = JSON.parse(localStorage.getItem(saveKeyFor(houseKey)));
      if (Array.isArray(parsed)) storedItems = parsed;
    } catch { /* use an empty room */ }

    const seenIds = new Set();
    for (const storedItem of storedItems) {
      let item = normalizeFurnitureItem(storedItem, { generateId: true, generateColor: true });
      if (!item) continue;
      if (seenIds.has(item.itemId)) item = { ...item, itemId: newFurnitureItemId() };
      seenIds.add(item.itemId);
      addRenderedItem(item);
    }

    const migratedItems = items.map(serializeFurnitureItem);
    if (JSON.stringify(storedItems) !== JSON.stringify(migratedItems)) persist();
  }

  function sendFurnitureRequest(method, payload) {
    const handler = furnitureSyncAdapter?.[method];
    if (typeof handler !== 'function') return false;
    try {
      return handler.call(furnitureSyncAdapter, payload) !== false;
    } catch (error) {
      console.warn('Unable to send multiplayer furniture request.', error);
      return false;
    }
  }

  /**
   * Enable/reset session-owned furniture with request callbacks. Passing null
   * leaves multiplayer mode and immediately restores the untouched local save.
   */
  function setFurnitureSyncAdapter(adapter = null) {
    const nextAdapter = adapter && typeof adapter === 'object' ? adapter : null;
    furnitureSyncAdapter = nextAdapter;
    sessionItemsByLocation.clear();
    loadItems();
    return Boolean(furnitureSyncAdapter);
  }

  function loadFurnitureSnapshot(locationId, snapshot) {
    if (!furnitureSyncAdapter || typeof locationId !== 'string' || !Array.isArray(snapshot)) return false;
    const normalized = [];
    const seenIds = new Set();
    for (const raw of snapshot) {
      const item = normalizeFurnitureItem(raw);
      if (!item || seenIds.has(item.itemId)) continue;
      seenIds.add(item.itemId);
      normalized.push(item);
    }
    sessionItemsByLocation.set(locationId, normalized);
    if (locationId === getFurnitureLocationId()) loadItems();
    return true;
  }

  function applyFurnitureAdded(locationId, rawItem) {
    if (!furnitureSyncAdapter || typeof locationId !== 'string') return false;
    const item = normalizeFurnitureItem(rawItem);
    if (!item) return false;
    const snapshot = sessionItemsByLocation.get(locationId) || [];
    if (snapshot.some((existing) => existing.itemId === item.itemId)) return false;
    snapshot.push(item);
    sessionItemsByLocation.set(locationId, snapshot);
    if (locationId === getFurnitureLocationId()) addRenderedItem(item);
    return true;
  }

  function applyFurnitureRemoved(locationId, itemId) {
    if (!furnitureSyncAdapter || typeof locationId !== 'string' || typeof itemId !== 'string') return false;
    const snapshot = sessionItemsByLocation.get(locationId) || [];
    const nextSnapshot = snapshot.filter((item) => item.itemId !== itemId);
    sessionItemsByLocation.set(locationId, nextSnapshot);
    const removedFromSnapshot = nextSnapshot.length !== snapshot.length;
    const removedFromScene = locationId === getFurnitureLocationId() && removeRenderedItem(itemId);
    return removedFromSnapshot || removedFromScene;
  }

  function applyFurnitureCleared(locationId) {
    if (!furnitureSyncAdapter || typeof locationId !== 'string') return false;
    sessionItemsByLocation.set(locationId, []);
    if (locationId === getFurnitureLocationId()) clearItems();
    return true;
  }

  function getFurnitureSnapshot() {
    return items.map(serializeFurnitureItem);
  }

  function resetPlayerForFloor() {
    if (!player) return;
    player.position.set(2, 0, 3);
    player.rotation.set(0, Math.PI, 0);
  }

  function setFloor(nextFloor) {
    const target = THREE.MathUtils.clamp(Math.round(Number(nextFloor) || 1), 1, floorCount);
    if (target === currentFloor) return currentFloor;
    currentFloor = target;
    sleeping = false;
    clearGuests();
    loadItems();
    resetPlayerForFloor();
    applyFloorTheme();
    return currentFloor;
  }

  function getFloorInfo() {
    return { current: currentFloor, count: floorCount };
  }
  function enter(config, key, { floors = 1 } = {}) {
    houseKey = key || 'home';
    floorCount = THREE.MathUtils.clamp(Math.round(Number(floors) || 1), 1, 3);
    currentFloor = 1;
    if (player) disposeMimimo(player);
    player = buildMimimo(config);
    resetPlayerForFloor();
    sleeping = false;
    scene.add(player);
    clearGuests();
    loadItems();
    applyFloorTheme();
  }

  function setTool(kind) { if (FURNITURE[kind]) tool = kind; }
  function getTool() { return tool; }

  function rotatePlacement() {
    placementRotation = (placementRotation + Math.PI / 4) % (Math.PI * 2);
    return Math.round(THREE.MathUtils.radToDeg(placementRotation));
  }

  function getPlacementRotation() {
    return Math.round(THREE.MathUtils.radToDeg(placementRotation));
  }

  function undo() {
    const item = items[items.length - 1];
    if (!item) return false;

    if (furnitureSyncAdapter) {
      return sendFurnitureRequest('requestRemove', {
        locationId: getFurnitureLocationId(),
        itemId: item.itemId,
      });
    }

    removeRenderedItem(item.itemId);
    persist();
    return true;
  }

  function clearAll() {
    if (furnitureSyncAdapter) {
      return sendFurnitureRequest('requestClear', { locationId: getFurnitureLocationId() });
    }
    clearItems();
    persist();
    return true;
  }

  /** Tap on the floor (ndc in [-1,1]) to drop the current furniture. */
  function tapPlace(ndc, camera) {
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObject(floorHit);
    if (!hit.length) return false;
    const { x, z } = hit[0].point;
    const item = normalizeFurnitureItem({
      itemId: newFurnitureItemId(),
      kind: tool,
      color: pick(ITEM_COLORS),
      x,
      z,
      ry: placementRotation,
    });
    if (!item) return false;

    if (furnitureSyncAdapter) {
      return sendFurnitureRequest('requestAdd', {
        locationId: getFurnitureLocationId(),
        item: serializeFurnitureItem(item),
      });
    }

    const added = addRenderedItem(item);
    if (added) persist();
    return added;
  }

  function getSleepStatus() {
    const beds = items.filter((it) => it.kind === 'bed');
    const nearestBed = player
      ? beds.find((it) => Math.hypot(player.position.x - it.x, player.position.z - it.z) < 2.7)
      : null;
    return { hasBed: beds.length > 0, nearBed: Boolean(nearestBed), bed: nearestBed };
  }

  function startSleep() {
    const { bed } = getSleepStatus();
    if (!player || !bed) return false;
    sleeping = true;
    player.position.set(bed.x, 0.95, bed.z);
    player.rotation.set(0, bed.ry, -Math.PI / 2);
    return true;
  }

  function wake() {
    if (!player) return;
    sleeping = false;
    player.rotation.z = 0;
    player.position.y = 0;
  }

  const PLAYER_SPEED = 4.2;
  let heading = Math.PI;

  function update(dt, t, move, facingHeading = null) {
    if (!player || sleeping) return;
    const moving = Math.hypot(move.x, move.z) > 0.05;
    if (moving) {
      player.position.x += move.x * PLAYER_SPEED * dt;
      player.position.z += move.z * PLAYER_SPEED * dt;
      player.position.x = Math.max(-ROOM.halfX + 0.4, Math.min(ROOM.halfX - 0.4, player.position.x));
      player.position.z = Math.max(ROOM.backZ + 0.6, Math.min(ROOM.frontZ - 0.4, player.position.z));
      heading = Math.atan2(move.x, move.z);
    }
    if (Number.isFinite(facingHeading)) heading = facingHeading;
    let d = heading - player.rotation.y;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    player.rotation.y += d * Math.min(1, dt * 10);
    animateMimimo(player, t, dt, moving);

    // gently bob any balloons
    for (const it of items) {
      if (it.kind === 'balloon') it.group.position.y = Math.sin(t * 1.5 + it.x) * 0.15;
    }

    // invited friends wander around and chat
    for (const guest of guests) {
      const ai = guest.userData.ai;
      let guestMoving = false;
      if (ai.wait > 0) {
        ai.wait -= dt;
      } else if (!ai.target) {
        ai.target = new THREE.Vector3(
          rand(-ROOM.halfX + 1, ROOM.halfX - 1),
          0,
          rand(ROOM.backZ + 1.4, ROOM.frontZ - 0.8)
        );
      } else {
        _dir.subVectors(ai.target, guest.position);
        _dir.y = 0;
        if (_dir.length() < 0.3) {
          ai.target = null;
          ai.wait = rand(1.5, 4);
        } else {
          _dir.normalize();
          guest.position.addScaledVector(_dir, dt * 1.6);
          const target = Math.atan2(_dir.x, _dir.z);
          let dr = target - guest.rotation.y;
          while (dr > Math.PI) dr -= Math.PI * 2;
          while (dr < -Math.PI) dr += Math.PI * 2;
          guest.rotation.y += dr * Math.min(1, dt * 6);
          guestMoving = true;
        }
      }
      ai.chat -= dt;
      if (ai.chat <= 0) {
        ai.chat = rand(6, 12);
        if (guest.userData.bubbleTime <= 0) setGuestBubble(guest, pick(GUEST_CHATTER));
      }
      if (guest.userData.bubbleTime > 0) {
        guest.userData.bubbleTime -= dt;
        if (guest.userData.bubbleTime <= 0 && guest.userData.bubble) {
          guest.remove(guest.userData.bubble);
          guest.userData.bubble.material.map.dispose();
          guest.userData.bubble.material.dispose();
          guest.userData.bubble = null;
        }
      }
      animateMimimo(guest, t + guest.id, dt, guestMoving);
    }
  }

  function getPlayerPos() { return player ? player.position : new THREE.Vector3(); }

  return {
    scene,
    enter,
    update,
    tapPlace,
    setTool,
    getTool,
    undo,
    clearAll,
    setFurnitureSyncAdapter,
    isFurnitureSyncActive: () => Boolean(furnitureSyncAdapter),
    getFurnitureLocationId,
    getFurnitureSnapshot,
    loadFurnitureSnapshot,
    applyFurnitureAdded,
    applyFurnitureRemoved,
    applyFurnitureCleared,
    rotatePlacement,
    getPlacementRotation,
    setFloor,
    getFloorInfo,
    getSleepStatus,
    startSleep,
    wake,
    getPlayerPos,
    inviteGuest,
    guestsReact,
    getGuestCount: () => guests.length,
  };
}
