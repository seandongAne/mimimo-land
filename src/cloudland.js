import * as THREE from 'three';
import { toon, rand, pick, shadowify, treeKeepOut, emojiSprite, textSprite } from './utils.js';
import { buildMimimo, animateMimimo, disposeMimimo } from './mimimo.js';
import { HOUSE_BUILDERS, VILLAGE_HOUSES } from './houses.js';
import { SHOP_BUILDINGS, makeSignpost, shopBuilding } from './town.js';
import { VENUE_BUILDINGS } from './civic.js';

const GATE = { x: 14, z: -18 };
const BOUNDS = { halfX: 58, halfZ: 44 };
const CLOUD_HOUSE_SAVE_KEY = 'mimimo.cloudhouses.v1';
const RAINBOW_BANDS = ['#ff8f8f', '#ffb46b', '#ffe066', '#8ee08e', '#7ad0ff', '#b79cff'];
const CASTLE_CLOUDS = ['#ff9ed2', '#9dddff', '#ffe98a', '#c8a2ff'];
const BUILDING_CLOUDS = ['#ffe1f2', '#dff4ff', '#fff3b5', '#eadfff'];
const CLOUD_PUFF_GEOMETRY = new THREE.SphereGeometry(1, 12, 9);
const cloudPuffMaterials = new Map();

const CLOUD_HOUSE_SPOTS = [
  { x: -47, z: -29 }, { x: -32, z: -29 },
  { x: -47, z: -14 }, { x: -32, z: -14 },
  { x: -47, z: 2 }, { x: -32, z: 2 },
  { x: -47, z: 18 }, { x: -32, z: 18 },
];
const CLOUD_SHOP_SPOTS = [
  { x: 31, z: -27 }, { x: 46, z: -27 }, { x: 32, z: -13 },
  { x: 47, z: -12 }, { x: 40, z: 2 },
];
const CLOUD_VENUE_SPOTS = [
  { x: 31, z: 18 }, { x: 47, z: 18 }, { x: 39, z: 33 },
];
const CLOUD_LOTS = [
  { x: -16, z: -5 }, { x: 0, z: -5 }, { x: 16, z: -5 },
  { x: -16, z: 13 }, { x: 0, z: 13 }, { x: 16, z: 13 },
  { x: -16, z: 31 }, { x: 0, z: 31 }, { x: 16, z: 31 },
];

const RESIDENT_CHATTER = [
  'We live up here! ☁️', 'So soft and fluffy!', 'Catch a star with me! ⭐',
  'Welcome to Cloudland! 🌈', 'The sun tells the best jokes!', 'Nap time on a cloud? 💤',
];

function puffCluster(count, spread, size, color = '#ffffff') {
  const g = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(rand(size * 0.7, size), 14, 10), toon(color));
    puff.position.set(rand(-spread, spread), rand(-size * 0.3, size * 0.3), rand(-spread, spread));
    puff.scale.y = 0.7;
    g.add(puff);
  }
  return g;
}

/** A soft cloud foundation so every familiar building belongs in the sky. */
function cloudPad(radius = 5) {
  const pad = new THREE.Group();
  const center = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.92, 0.34, 24), toon('#f8fcff'));
  center.position.y = -0.12;
  pad.add(center);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const puff = new THREE.Mesh(new THREE.SphereGeometry(rand(0.7, 1.15), 12, 9), toon('#ffffff'));
    puff.position.set(Math.cos(a) * radius * 0.9, -0.05, Math.sin(a) * radius * 0.9);
    puff.scale.y = 0.6;
    pad.add(puff);
  }
  return pad;
}

function cloudPuff(color, size = 1, stretch = [1, 0.72, 0.9]) {
  if (!cloudPuffMaterials.has(color)) cloudPuffMaterials.set(color, toon(color));
  const puff = new THREE.Mesh(CLOUD_PUFF_GEOMETRY, cloudPuffMaterials.get(color));
  puff.scale.set(size * stretch[0], size * stretch[1], size * stretch[2]);
  return puff;
}

function addPuff(shell, position, size, color, stretch) {
  const puff = cloudPuff(color, size, stretch);
  puff.position.set(position[0], position[1], position[2]);
  shell.add(puff);
  return puff;
}

/**
 * Turn an animal-shaped land house into a cloud house. The fluffy shell stays
 * away from the face and door, so the animal and its entrance are still clear.
 */
function cloudifyAnimalHouse(house, index, doorZ, customAccent = null) {
  const accent = customAccent || BUILDING_CLOUDS[index % BUILDING_CLOUDS.length];
  const palette = ['#ffffff', accent, '#edf9ff', '#fff9d9'];
  const body = house.children.find((child) => child.isMesh);
  if (body) body.material = toon(accent);

  const shell = new THREE.Group();
  shell.userData.cloudExterior = true;

  // Fluffy lower walls, with a clear gap around the front door.
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    const x = Math.sin(angle) * 3.25;
    const z = Math.cos(angle) * 3.0;
    if (z > 2.15 && Math.abs(x) < 1.55) continue;
    addPuff(shell, [x, 1.05 + (i % 2) * 0.42, z], 0.92 + (i % 3) * 0.12, palette[i % palette.length]);
  }

  // Cloudy shoulders and roof. The middle of the face remains uncovered.
  for (let i = 0; i < 14; i++) {
    const angle = (i / 14) * Math.PI * 2;
    const x = Math.sin(angle) * 3.1;
    const z = Math.cos(angle) * 2.75;
    if (z > 1.65 && Math.abs(x) < 2.15) continue;
    addPuff(shell, [x, 3.9 + (i % 2) * 0.35, z], 0.82 + (i % 3) * 0.13, palette[(i + 1) % palette.length]);
  }
  for (let i = 0; i < 9; i++) {
    const angle = (i / 9) * Math.PI * 2;
    addPuff(
      shell,
      [Math.sin(angle) * 2.15, 6.45 + (i % 2) * 0.42, Math.cos(angle) * 1.8],
      0.82 + (i % 3) * 0.12,
      palette[(i + 2) % palette.length]
    );
  }

  // A puffy arch makes the real door look like it was carved from a cloud.
  const arch = [
    [-1.15, 0.8], [1.15, 0.8], [-1.2, 1.75], [1.2, 1.75],
    [-0.72, 2.55], [0, 2.8], [0.72, 2.55],
  ];
  arch.forEach(([x, y], puffIndex) => {
    addPuff(shell, [x, y, doorZ + 0.22], 0.58, palette[puffIndex % palette.length], [1, 0.82, 0.62]);
  });

  house.add(shell);
  return house;
}

/** Make rectangular shop and venue walls and roofs from banks of clouds. */
function cloudifyBuilding(building, spec, index) {
  const { w = 6.4, h = 4.2, d = 5 } = spec;
  const accent = BUILDING_CLOUDS[index % BUILDING_CLOUDS.length];
  const roofAccent = BUILDING_CLOUDS[(index + 1) % BUILDING_CLOUDS.length];
  const palette = ['#ffffff', accent, '#e8f8ff', roofAccent];
  const solidMeshes = building.children.filter((child) => child.isMesh);
  if (solidMeshes[0]) solidMeshes[0].material = toon(accent);
  if (solidMeshes[1]) solidMeshes[1].material = toon(roofAccent);

  const shell = new THREE.Group();
  shell.userData.cloudExterior = true;
  const halfW = w / 2;
  const halfD = d / 2;
  const wallRows = Math.max(2, Math.ceil(h / 2));

  // Puffy side walls and back wall turn the box into a cloud bank.
  for (let row = 0; row < wallRows; row++) {
    const y = 0.95 + row * ((h - 1.1) / Math.max(1, wallRows - 1));
    for (let step = 0; step < 4; step++) {
      const z = -halfD + (step / 3) * d;
      for (const side of [-1, 1]) {
        const colorIndex = row * 3 + step + (side > 0 ? 1 : 0);
        addPuff(shell, [side * (halfW + 0.05), y, z], 0.82, palette[colorIndex % palette.length]);
      }
    }
    for (let step = 0; step < 5; step++) {
      const x = -halfW + (step / 4) * w;
      addPuff(shell, [x, y, -halfD - 0.04], 0.84, palette[(row + step + 1) % palette.length]);
    }
  }

  // Cloud corners and a fluffy roofline, without covering the rooftop sign.
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    addPuff(
      shell,
      [Math.cos(angle) * halfW * 0.95, h + 0.58 + (i % 2) * 0.34, Math.sin(angle) * halfD * 0.95],
      0.9 + (i % 3) * 0.12,
      palette[(i + 2) % palette.length]
    );
  }

  // The front stays usable: puffs make an arch around, not across, the door.
  const frontZ = halfD + 0.25;
  const arch = [
    [-1.35, 0.75], [1.35, 0.75], [-1.38, 1.65], [1.38, 1.65],
    [-0.85, 2.45], [0, 2.7], [0.85, 2.45],
  ];
  arch.forEach(([x, y], puffIndex) => {
    addPuff(shell, [x, y, frontZ], 0.62, palette[puffIndex % palette.length], [1, 0.82, 0.62]);
  });

  building.add(shell);
  return building;
}

function cloudLotProps(spec) {
  const g = cloudPad(5.2);
  for (const [x, z] of [[-3.2, -3.2], [3.2, -3.2], [-3.2, 3.2], [3.2, 3.2]]) {
    const flag = emojiSprite('☁️', 0.9);
    flag.position.set(x, 1.2, z);
    g.add(flag);
  }
  const tools = emojiSprite('🏗️', 1.6);
  tools.position.y = 2.0;
  g.add(tools);
  const tag = textSprite('Build a cloud home!', { fontSize: 38 });
  tag.position.y = 3.5;
  g.add(tag);
  g.position.set(spec.x, 0, spec.z);
  shadowify(g);
  return g;
}

function makeCloudCastle() {
  const castle = new THREE.Group();
  const foundation = puffCluster(18, 5.2, 2.2);
  foundation.position.y = 0.35;
  castle.add(foundation);

  const towerPositions = [[-4.3, 0], [-1.45, -1.25], [1.45, -1.25], [4.3, 0]];
  towerPositions.forEach(([x, z], index) => {
    const tower = new THREE.Group();
    const color = CASTLE_CLOUDS[index];
    for (let level = 0; level < 3; level++) {
      const layer = puffCluster(6, 0.9 - level * 0.12, 1.35 - level * 0.08, color);
      layer.position.y = 1.4 + level * 1.45;
      tower.add(layer);
    }
    const crown = emojiSprite(index % 2 ? '⭐' : '👑', 1.25);
    crown.position.y = 6.3;
    tower.add(crown);
    tower.position.set(x, 0, z);
    castle.add(tower);
  });

  const keep = puffCluster(16, 3.0, 1.75, '#fffdf8');
  keep.position.y = 2.0;
  castle.add(keep);
  CASTLE_CLOUDS.forEach((color, index) => {
    const crest = new THREE.Mesh(new THREE.SphereGeometry(0.95, 14, 10), toon(color));
    crest.position.set(-2.25 + index * 1.5, 5.4 + (index % 2) * 0.35, 0.65);
    crest.scale.y = 0.72;
    castle.add(crest);
  });

  const door = new THREE.Mesh(new THREE.CapsuleGeometry(1.1, 1.9, 8, 16), toon('#8a69cf'));
  door.scale.z = 0.35;
  door.position.set(0, 1.55, 4.8);
  castle.add(door);
  for (const side of [-1, 1]) {
    const star = emojiSprite('✨', 0.8);
    star.position.set(side * 1.7, 2.7, 5.15);
    castle.add(star);
  }
  const title = textSprite('Rainbow Cloud Castle', { fontSize: 42 });
  title.position.set(0, 7.5, 0);
  castle.add(title);
  shadowify(castle);
  return castle;
}

function readSavedCloudHouses() {
  try {
    const saved = JSON.parse(localStorage.getItem(CLOUD_HOUSE_SAVE_KEY));
    return saved && typeof saved === 'object' ? saved : {};
  } catch {
    return {};
  }
}

function writeSavedCloudHouses(saved) {
  try { localStorage.setItem(CLOUD_HOUSE_SAVE_KEY, JSON.stringify(saved)); } catch { /* play without saving */ }
}

/**
 * The sparkly cloud platform down in the meadow that mythical mimimos
 * (fairies, unicorns, dragons, phoenixes) use to fly up to Cloudland.
 */
export function makeCloudGate(scene) {
  treeKeepOut.push({ x: GATE.x, z: GATE.z, r: 6 });
  const g = new THREE.Group();

  const platform = puffCluster(6, 1.6, 1.0);
  platform.position.y = 0.5;
  g.add(platform);

  RAINBOW_BANDS.forEach((color, i) => {
    const arc = new THREE.Mesh(
      new THREE.TorusGeometry(3.1 - i * 0.22, 0.12, 8, 32, Math.PI),
      new THREE.MeshBasicMaterial({ color })
    );
    arc.position.y = 0.7;
    g.add(arc);
  });

  const sparkle = emojiSprite('✨', 1.1);
  sparkle.position.y = 3.4;
  g.add(sparkle);
  const tag = textSprite('☁️ Cloudland — flying friends only!', { fontSize: 34 });
  tag.position.y = 4.4;
  g.add(tag);

  g.position.set(GATE.x, 0, GATE.z);
  shadowify(g);
  scene.add(g);
  return GATE;
}

/**
 * A giant sky town with every familiar land building, a rainbow cloud castle,
 * friendly residents, and empty cloud lots where players build their own homes.
 */
export function makeCloudland() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#9fd4ff');
  scene.fog = new THREE.Fog('#b8e2ff', 70, 155);
  scene.add(new THREE.HemisphereLight('#fffbe8', '#9fc4ff', 1.3));
  const light = new THREE.DirectionalLight('#fff6d8', 1.5);
  light.position.set(8, 22, 10);
  light.castShadow = true;
  scene.add(light);

  // The old tiny island was radius 14. This one is over four times wider.
  const island = new THREE.Mesh(new THREE.CylinderGeometry(62, 57, 1.4, 64), toon('#ffffff'));
  island.scale.z = 0.78;
  island.position.y = -0.7;
  island.receiveShadow = true;
  scene.add(island);
  for (let i = 0; i < 42; i++) {
    const a = (i / 42) * Math.PI * 2;
    const rim = new THREE.Mesh(new THREE.SphereGeometry(rand(1.5, 2.8), 14, 10), toon('#ffffff'));
    rim.position.set(Math.cos(a) * 60, rand(-0.5, 0.1), Math.sin(a) * 46);
    rim.scale.y = 0.62;
    scene.add(rim);
  }

  // Soft pastel cloud paths connect the castle and three busy districts.
  const pathMaterial = toon('#eef8ff');
  for (let z = -23; z <= 34; z += 5.2) {
    const path = new THREE.Mesh(new THREE.CircleGeometry(2.2, 18), pathMaterial);
    path.rotation.x = -Math.PI / 2;
    path.position.set(0, 0.025, z);
    scene.add(path);
  }
  scene.add(makeSignpost('🏠 Cloud Village', -24, -38));
  scene.add(makeSignpost('🛍️ Cloud Town', 24, -38));
  scene.add(makeSignpost('🏗️ Dream Cloud Lots', -6, 40));

  const localColliders = [];
  const houseDoors = [];
  const shopDoors = [];
  const venueDoors = [];

  // The four-colour castle is a real building: its front door opens too.
  const castle = makeCloudCastle();
  castle.position.set(0, 0, -33);
  scene.add(castle);
  localColliders.push({ x: 0, z: -33, r: 8.3 });
  houseDoors.push({
    key: 'cloud-castle', label: 'Rainbow Cloud Castle', custom: true, castle: true, cloud: true,
    x: 0, z: -23.7,
  });

  VILLAGE_HOUSES.forEach((spec, index) => {
    const spot = CLOUD_HOUSE_SPOTS[index];
    const pad = cloudPad(spec.r + 0.4);
    pad.position.set(spot.x, 0, spot.z);
    scene.add(pad);
    const house = cloudifyAnimalHouse(spec.build(), index, spec.door);
    house.position.set(spot.x, 0, spot.z);
    const angle = Math.atan2(-spot.x, 4 - spot.z);
    house.rotation.y = angle;
    shadowify(house);
    scene.add(house);
    localColliders.push({ x: spot.x, z: spot.z, r: spec.r });
    const reach = spec.door + 1.4;
    houseDoors.push({
      key: `cloud-${spec.key}`,
      label: `${spec.key} cloud house`,
      cloud: true,
      x: spot.x + Math.sin(angle) * reach,
      z: spot.z + Math.cos(angle) * reach,
    });
  });

  SHOP_BUILDINGS.forEach((spec, index) => {
    const spot = CLOUD_SHOP_SPOTS[index];
    const halfW = (spec.w || 6.4) / 2;
    const halfD = (spec.d || 5) / 2;
    const radius = Math.max(halfW, halfD) + 0.6;
    const pad = cloudPad(radius + 0.5);
    pad.position.set(spot.x, 0, spot.z);
    scene.add(pad);
    const shop = cloudifyBuilding(shopBuilding(spec), spec, index);
    shop.position.set(spot.x, 0, spot.z);
    const angle = Math.atan2(22 - spot.x, 3 - spot.z);
    shop.rotation.y = angle;
    shadowify(shop);
    scene.add(shop);
    localColliders.push({ x: spot.x, z: spot.z, r: radius });
    const reach = halfD + 1.25;
    shopDoors.push({
      key: spec.key, label: spec.label, emoji: spec.emoji, cloud: true,
      x: spot.x + Math.sin(angle) * reach,
      z: spot.z + Math.cos(angle) * reach,
    });
  });

  VENUE_BUILDINGS.forEach((spec, index) => {
    const spot = CLOUD_VENUE_SPOTS[index];
    const radius = Math.max(spec.w / 2, spec.d / 2) + 0.6;
    const pad = cloudPad(radius + 0.5);
    pad.position.set(spot.x, 0, spot.z);
    scene.add(pad);
    const venue = cloudifyBuilding(spec.build(), spec, index + SHOP_BUILDINGS.length);
    venue.position.set(spot.x, 0, spot.z);
    const angle = Math.atan2(23 - spot.x, 24 - spot.z);
    venue.rotation.y = angle;
    shadowify(venue);
    scene.add(venue);
    localColliders.push({ x: spot.x, z: spot.z, r: radius });
    const reach = spec.d / 2 + 1.25;
    venueDoors.push({
      key: spec.key, label: spec.label, emoji: spec.emoji, cloud: true,
      x: spot.x + Math.sin(angle) * reach,
      z: spot.z + Math.cos(angle) * reach,
    });
  });

  // Empty lots are saved separately from ground-land dream houses.
  const savedHouses = readSavedCloudHouses();
  const lotProps = new Map();
  const dreamDoors = [];

  function raiseCloudHouse(index, home) {
    const spot = CLOUD_LOTS[index];
    const builder = HOUSE_BUILDERS[home.species] || HOUSE_BUILDERS.bunny;
    const pad = cloudPad(5.5);
    pad.position.set(spot.x, 0, spot.z);
    scene.add(pad);
    const house = cloudifyAnimalHouse(builder(home.color, home.floors), index, 3.05, home.color);
    house.position.set(spot.x, 0, spot.z);
    const angle = Math.atan2(-spot.x, 2 - spot.z);
    house.rotation.y = angle;
    shadowify(house);
    scene.add(house);
    localColliders.push({ x: spot.x, z: spot.z, r: 5.4 });
    const nameTag = textSprite(`${home.name || 'A mimimo'}'s cloud home`, { fontSize: 34 });
    nameTag.position.set(0, 9.2, 0);
    house.add(nameTag);
    if (lotProps.has(index)) {
      lotProps.get(index).removeFromParent();
      lotProps.delete(index);
    }
    const reach = 4.5;
    const door = {
      key: `cloud-dream-${index}`, label: `${home.name || 'your'}'s cloud home`,
      custom: true, cloud: true,
      floors: THREE.MathUtils.clamp(Math.round(Number(home.floors) || 1), 1, 3),
      x: spot.x + Math.sin(angle) * reach,
      z: spot.z + Math.cos(angle) * reach,
    };
    dreamDoors.push(door);
    return door;
  }

  CLOUD_LOTS.forEach((spot, index) => {
    if (savedHouses[index]) {
      raiseCloudHouse(index, savedHouses[index]);
    } else {
      const props = cloudLotProps(spot);
      lotProps.set(index, props);
      scene.add(props);
    }
  });

  // A big rainbow on the horizon and drifting background clouds.
  const horizon = new THREE.Group();
  RAINBOW_BANDS.forEach((color, i) => {
    const arc = new THREE.Mesh(
      new THREE.TorusGeometry(31 - i * 1.25, 0.65, 8, 56, Math.PI),
      new THREE.MeshBasicMaterial({ color, fog: false })
    );
    horizon.add(arc);
  });
  horizon.position.set(24, -5, -92);
  scene.add(horizon);

  const drifters = [];
  for (let i = 0; i < 14; i++) {
    const cloud = puffCluster(4, 1.8, 1.1, pick(['#ffffff', '#ffe9f6', '#e8f6ff']));
    cloud.position.set(rand(-80, 80), rand(5, 18), rand(-82, -48));
    cloud.userData.speed = rand(0.3, 0.9);
    scene.add(cloud);
    drifters.push(cloud);
  }

  const stars = [];
  for (let i = 0; i < 24; i++) {
    const star = emojiSprite(pick(['⭐', '🌟', '✨']), rand(0.5, 0.9));
    star.position.set(rand(-54, 54), rand(2.5, 8.5), rand(-39, 39));
    star.userData.phase = rand(0, Math.PI * 2);
    star.userData.baseY = star.position.y;
    scene.add(star);
    stars.push(star);
  }

  // Twinkle and Starmane have their own names, replies, hearts, and homes.
  const residents = [];
  const residentSpecs = [
    {
      species: 'fairy', color: '#c9a2ff', name: 'Twinkle', home: { x: -6, z: 4 },
      replies: ['Hi! Let\'s make a sparkle cloud! ✨', 'Want to flutter to the castle? 🧚', 'You found me! 💜'],
    },
    {
      species: 'unicorn', color: '#fdf3e7', name: 'Starmane', home: { x: 6, z: 4 },
      replies: ['Hello! Want to race a rainbow? 🌈', 'Your cloud home will be amazing! ⭐', 'I love talking with you! 💖'],
    },
  ];
  for (const spec of residentSpecs) {
    const resident = buildMimimo({ species: spec.species, color: spec.color, shape: 'classic' });
    resident.position.set(spec.home.x, 0, spec.home.z);
    scene.add(resident);
    const tag = textSprite(spec.name);
    tag.position.y = 2.5;
    resident.add(tag);
    const heart = emojiSprite('💗', 0.8);
    heart.position.y = 3.2;
    heart.visible = false;
    resident.add(heart);
    resident.userData.name = spec.name;
    resident.userData.replies = spec.replies;
    resident.userData.bubbleTime = 0;
    resident.userData.ai = {
      home: spec.home, target: null, wait: rand(0, 2), chat: rand(2, 6),
      greetCooldown: 0, heart,
    };
    residents.push(resident);
  }
  const direction = new THREE.Vector3();

  function setBubble(host, message, y = 3.2) {
    if (host.userData.bubble) {
      host.remove(host.userData.bubble);
      host.userData.bubble.material.map.dispose();
      host.userData.bubble.material.dispose();
    }
    const bubble = textSprite(message, { fontSize: 36 });
    bubble.position.y = y;
    host.add(bubble);
    host.userData.bubble = bubble;
    host.userData.bubbleTime = 2.8;
  }

  function updateBubble(host, dt) {
    if (!(host.userData.bubbleTime > 0)) return;
    host.userData.bubbleTime -= dt;
    if (host.userData.bubbleTime <= 0 && host.userData.bubble) {
      host.remove(host.userData.bubble);
      host.userData.bubble.material.map.dispose();
      host.userData.bubble.material.dispose();
      host.userData.bubble = null;
    }
  }

  let player = null;
  let heading = Math.PI;

  function clampToIsland(position) {
    const distance = Math.hypot(position.x / BOUNDS.halfX, position.z / BOUNDS.halfZ);
    if (distance > 1) {
      position.x /= distance;
      position.z /= distance;
    }
  }

  function resolveLocalCollisions() {
    if (!player) return;
    for (const collider of localColliders) {
      const dx = player.position.x - collider.x;
      const dz = player.position.z - collider.z;
      const distanceSq = dx * dx + dz * dz;
      if (distanceSq < collider.r * collider.r) {
        const distance = Math.sqrt(distanceSq);
        if (distance > 0.001) {
          player.position.x = collider.x + (dx / distance) * collider.r;
          player.position.z = collider.z + (dz / distance) * collider.r;
        } else {
          player.position.z = collider.z + collider.r;
        }
      }
    }
    clampToIsland(player.position);
  }

  function enter(config) {
    if (player) disposeMimimo(player);
    player = buildMimimo(config);
    player.userData.bubbleTime = 0;
    player.position.set(0, 0, 4);
    player.rotation.y = Math.PI;
    scene.add(player);
    for (const resident of residents) setBubble(resident, `Welcome! I'm ${resident.userData.name}! 🌈`);
  }

  function greet() {
    if (!player) return [];
    setBubble(player, 'Hi Twinkle and Starmane! 👋', 2.8);
    const replies = [];
    for (const resident of residents) {
      if (resident.position.distanceTo(player.position) > 9) continue;
      const ai = resident.userData.ai;
      const reply = pick(resident.userData.replies);
      setBubble(resident, reply);
      ai.greetCooldown = 2.8;
      ai.heart.visible = true;
      direction.subVectors(player.position, resident.position);
      resident.rotation.y = Math.atan2(direction.x, direction.z);
      replies.push({ name: resident.userData.name, message: reply });
    }
    if (!replies.length) setBubble(player, 'I will find Twinkle or Starmane to chat! ⭐', 2.8);
    return replies;
  }

  function announce(message) {
    if (player) setBubble(player, message, 2.8);
  }

  function nearestInteraction() {
    if (!player) return null;
    let best = null;
    let bestSq = Infinity;
    const considerDoor = (type, door, label) => {
      const distanceSq = (player.position.x - door.x) ** 2 + (player.position.z - door.z) ** 2;
      if (distanceSq < 3.4 ** 2 && distanceSq < bestSq) {
        best = { type, door, label };
        bestSq = distanceSq;
      }
    };
    for (const door of [...houseDoors, ...dreamDoors]) {
      considerDoor('house', door, door.castle ? '👑 Enter the Rainbow Cloud Castle' : `🚪 Enter ${door.label}`);
    }
    for (const door of shopDoors) considerDoor('shop', door, `${door.emoji} Enter Cloud ${door.label}`);
    for (const door of venueDoors) considerDoor('venue', door, `${door.emoji} Visit the Cloud ${door.label}`);
    CLOUD_LOTS.forEach((spot, index) => {
      if (savedHouses[index]) return;
      const distanceSq = (player.position.x - spot.x) ** 2 + (player.position.z - spot.z) ** 2;
      if (distanceSq < 5.4 ** 2 && distanceSq < bestSq) {
        best = { type: 'cloud-lot', lot: { index, ...spot }, label: '🔨 Build your own cloud house!' };
        bestSq = distanceSq;
      }
    });
    return best;
  }

  function buildAt(index, config) {
    if (!CLOUD_LOTS[index] || savedHouses[index]) return null;
    savedHouses[index] = { species: config.species, color: config.color, floors: config.floors || 1, name: config.name };
    writeSavedCloudHouses(savedHouses);
    const door = raiseCloudHouse(index, savedHouses[index]);
    resolveLocalCollisions();
    announce('My very own cloud house! 🏠☁️💖');
    return door;
  }

  function setPlayerPos(x, z) {
    if (!player) return;
    player.position.set(x, 0, z);
    resolveLocalCollisions();
  }

  function update(dt, t, move, facingHeading = null) {
    if (player) {
      const moving = Math.hypot(move.x, move.z) > 0.05;
      if (moving) {
        player.position.x += move.x * 5.2 * dt;
        player.position.z += move.z * 5.2 * dt;
        resolveLocalCollisions();
        heading = Math.atan2(move.x, move.z);
      }
      if (Number.isFinite(facingHeading)) heading = facingHeading;
      let delta = heading - player.rotation.y;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      player.rotation.y += delta * Math.min(1, dt * 8);
      animateMimimo(player, t, dt, moving);
      updateBubble(player, dt);
    }

    for (const resident of residents) {
      const ai = resident.userData.ai;
      let moving = false;
      ai.greetCooldown = Math.max(0, ai.greetCooldown - dt);
      if (ai.wait > 0) {
        ai.wait -= dt;
      } else if (!ai.target) {
        const angle = rand(0, Math.PI * 2);
        const distance = rand(2, 8);
        ai.target = new THREE.Vector3(
          ai.home.x + Math.cos(angle) * distance,
          0,
          ai.home.z + Math.sin(angle) * distance
        );
      } else {
        direction.subVectors(ai.target, resident.position);
        direction.y = 0;
        if (direction.length() < 0.3) {
          ai.target = null;
          ai.wait = rand(1.5, 4);
        } else {
          direction.normalize();
          resident.position.addScaledVector(direction, dt * 1.4);
          const target = Math.atan2(direction.x, direction.z);
          let rotation = target - resident.rotation.y;
          while (rotation > Math.PI) rotation -= Math.PI * 2;
          while (rotation < -Math.PI) rotation += Math.PI * 2;
          resident.rotation.y += rotation * Math.min(1, dt * 5);
          moving = true;
        }
      }
      const nearPlayer = player && resident.position.distanceTo(player.position) < 4.2;
      ai.heart.visible = nearPlayer || ai.greetCooldown > 0;
      if (nearPlayer && ai.greetCooldown <= 0 && resident.userData.bubbleTime <= 0) {
        setBubble(resident, pick(resident.userData.replies));
        ai.greetCooldown = 4;
      }
      ai.chat -= dt;
      if (ai.chat <= 0) {
        ai.chat = rand(6, 12);
        if (!nearPlayer && resident.userData.bubbleTime <= 0) setBubble(resident, pick(RESIDENT_CHATTER));
      }
      updateBubble(resident, dt);
      animateMimimo(resident, t + resident.id, dt, moving);
    }

    for (const cloud of drifters) {
      cloud.position.x += cloud.userData.speed * dt;
      if (cloud.position.x > 82) cloud.position.x = -82;
    }
    for (const star of stars) {
      star.position.y = star.userData.baseY + Math.sin(t * 1.4 + star.userData.phase) * 0.3;
      star.material.opacity = 0.7 + Math.sin(t * 2.2 + star.userData.phase) * 0.3;
    }
  }

  return {
    scene,
    gate: GATE,
    bounds: BOUNDS,
    enter,
    update,
    greet,
    announce,
    nearestInteraction,
    buildAt,
    setPlayerPos,
    getPlayerPos: () => (player ? player.position : new THREE.Vector3()),
    houseDoors,
    shopDoors,
    venueDoors,
    dreamDoors,
    lots: CLOUD_LOTS,
    residents,
  };
}
