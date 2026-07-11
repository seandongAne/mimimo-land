import * as THREE from 'three';
import { makeWorld, WORLD_RADIUS } from './world.js';
import { makeClouds } from './clouds.js';
import { makeTrees } from './trees.js';
import { makeHouses } from './houses.js';
import { makeTown } from './town.js';
import { makeNature } from './nature.js';
import { buildMimimo, animateMimimo, disposeMimimo, SPECIES, SHAPES, COLORS, randomName } from './mimimo.js';
import { makeFriends } from './friends.js';
import { makeInterior, FURNITURE_KINDS } from './interior.js';
import { makeUnderwater } from './underwater.js';
import { makeShopInterior } from './shop.js';
import { Magic, POWERS } from './magic.js';
import { initInput, getMove } from './input.js';
import { colliders, toon } from './utils.js';

const SPAWN = new THREE.Vector3(0, 0, 6);
const PLAYER_SPEED = 5.2;
const SPIN_DURATION = 0.5;
const SAVE_KEY = 'mimimo.save.v1';
const DEFAULT_POWERS = ['blossom', 'rainbow'];

// ---------------------------------------------------------------- setup
const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById('scene'),
  antialias: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 2, 12);

const world = makeWorld(scene);
// Districts register colliders + tree keep-out zones first, so trees stay clear.
const houseDoors = makeHouses(scene);
const shopDoors = makeTown(scene);
const nature = makeNature(scene);
const updateTrees = makeTrees(scene);
const updateClouds = makeClouds(scene);
const magic = new Magic(scene);
const interior = makeInterior();
const underwater = makeUnderwater();
const shopInterior = makeShopInterior();

// ---------------------------------------------------------------- player
function normalisePowers(value) {
  const valid = Array.isArray(value)
    ? value.filter((key, index, all) => POWERS[key] && all.indexOf(key) === index)
    : [];
  return valid.length ? valid : [...DEFAULT_POWERS];
}

function loadConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (saved && SPECIES[saved.species] && COLORS.includes(saved.color) && saved.name) {
      if (!SHAPES[saved.shape]) saved.shape = 'classic';
      saved.powers = normalisePowers(saved.powers);
      return saved;
    }
  } catch {
    /* fresh start */
  }
  return {
    species: 'bunny',
    color: '#ff9ed2',
    shape: 'classic',
    name: randomName(),
    powers: [...DEFAULT_POWERS],
  };
}

const config = loadConfig();

// Stable root that moves/turns; the body inside is swapped by the creator.
const playerRoot = new THREE.Group();
playerRoot.position.copy(SPAWN);
scene.add(playerRoot);
let playerBody = buildMimimo(config);
playerRoot.add(playerBody);

const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.2, 0.28, 24), toon('#fff3e0'));
pedestal.position.set(SPAWN.x, 0.14, SPAWN.z);
pedestal.receiveShadow = true;
scene.add(pedestal);

function rebuildPlayer() {
  disposeMimimo(playerBody);
  playerBody = buildMimimo(config);
  playerRoot.add(playerBody);
  syncPedestal();
}

// ---------------------------------------------------------------- UI + creator
const creatorEl = document.getElementById('creator');
const hudEl = document.getElementById('hud');
const badgeEl = document.getElementById('badge');
const nameInput = document.getElementById('nameInput');
const hintEl = document.getElementById('hint');
const magicBtn = document.getElementById('magicBtn');
const powerTrayEl = document.getElementById('powerTray');
const timeBtn = document.getElementById('timeBtn');

let mode = 'creator';
let spinTime = SPIN_DURATION;
let magicCooldown = 0;
let desiredRotation = 0;
let currentRotation = 0;
let activePower = config.powers[0];
let lastPhaseKey = '';

function syncPedestal() {
  const active = mode === 'creator';
  playerBody.userData.anim.baseY = active ? 0.28 : 0;
  pedestal.visible = active;
}

const speciesRow = document.getElementById('speciesRow');
for (const [key, spec] of Object.entries(SPECIES)) {
  const chip = document.createElement('button');
  chip.className = 'chip squishy';
  chip.textContent = `${spec.emoji} ${spec.label}`;
  chip.dataset.key = key;
  chip.addEventListener('click', () => {
    config.species = key;
    rebuildPlayer();
    refreshSelection();
  });
  speciesRow.appendChild(chip);
}

const shapeRow = document.getElementById('shapeRow');
for (const [key, spec] of Object.entries(SHAPES)) {
  const chip = document.createElement('button');
  chip.className = 'chip squishy';
  chip.textContent = `${spec.emoji} ${spec.label}`;
  chip.dataset.shape = key;
  chip.addEventListener('click', () => {
    config.shape = key;
    rebuildPlayer();
    refreshSelection();
  });
  shapeRow.appendChild(chip);
}

const colorRow = document.getElementById('colorRow');
for (const color of COLORS) {
  const swatch = document.createElement('button');
  swatch.className = 'swatch squishy';
  swatch.style.background = color;
  swatch.dataset.color = color;
  swatch.setAttribute('aria-label', `color ${color}`);
  swatch.addEventListener('click', () => {
    config.color = color;
    rebuildPlayer();
    refreshSelection();
  });
  colorRow.appendChild(swatch);
}

const powerChoiceRow = document.getElementById('powerChoiceRow');
for (const [key, power] of Object.entries(POWERS)) {
  const chip = document.createElement('button');
  chip.className = 'chip squishy';
  chip.textContent = `${power.emoji} ${power.shortLabel}`;
  chip.dataset.power = key;
  chip.addEventListener('click', () => {
    if (config.powers.includes(key)) {
      if (config.powers.length === 1) return;
      config.powers = config.powers.filter((chosen) => chosen !== key);
    } else {
      config.powers.push(key);
    }
    if (!config.powers.includes(activePower)) activePower = config.powers[0];
    refreshSelection();
  });
  powerChoiceRow.appendChild(chip);
}

function refreshSelection() {
  for (const chip of speciesRow.children) chip.classList.toggle('selected', chip.dataset.key === config.species);
  for (const chip of shapeRow.children) chip.classList.toggle('selected', chip.dataset.shape === config.shape);
  for (const swatch of colorRow.children) swatch.classList.toggle('selected', swatch.dataset.color === config.color);
  for (const chip of powerChoiceRow.children) chip.classList.toggle('selected', config.powers.includes(chip.dataset.power));
}

function updatePowerSelection() {
  for (const button of powerTrayEl.children) {
    button.classList.toggle('selected', button.dataset.power === activePower);
  }
  const power = POWERS[activePower] || POWERS.blossom;
  magicBtn.textContent = power.emoji;
  magicBtn.title = `${power.label} (SPACE)`;
}

function selectPower(powerOrIndex) {
  const key = typeof powerOrIndex === 'number' ? config.powers[powerOrIndex] : powerOrIndex;
  if (!key || !config.powers.includes(key)) return;
  activePower = key;
  updatePowerSelection();
}

function refreshPowerTray() {
  powerTrayEl.replaceChildren();
  if (!config.powers.includes(activePower)) activePower = config.powers[0];
  config.powers.forEach((key, index) => {
    const power = POWERS[key];
    const button = document.createElement('button');
    button.className = 'power-slot squishy';
    button.dataset.power = key;
    button.textContent = power.emoji;
    button.title = `${index + 1}: select ${power.label}`;
    button.addEventListener('click', () => selectPower(key));
    powerTrayEl.appendChild(button);
  });
  updatePowerSelection();
}

nameInput.value = config.name;
document.getElementById('diceBtn').addEventListener('click', () => { nameInput.value = randomName(); });

document.getElementById('startBtn').addEventListener('click', () => {
  config.name = nameInput.value.trim() || randomName();
  config.powers = normalisePowers(config.powers);
  nameInput.value = config.name;
  localStorage.setItem(SAVE_KEY, JSON.stringify(config));

  mode = 'play';
  syncPedestal();
  friends.showPet();
  creatorEl.classList.add('hidden');
  hudEl.classList.remove('hidden');
  badgeEl.textContent = `${SPECIES[config.species].emoji} ${config.name}`;
  refreshPowerTray();
  castMagic();
});

document.getElementById('newBtn').addEventListener('click', () => {
  mode = 'creator';
  playerRoot.position.copy(SPAWN);
  playerRoot.rotation.y = 0;
  desiredRotation = 0;
  currentRotation = 0;
  syncPedestal();
  friends.hidePet();
  hudEl.classList.add('hidden');
  creatorEl.classList.remove('hidden');
});

const isTouch = window.matchMedia('(pointer: coarse)').matches;
hintEl.textContent = isTouch
  ? 'Drag the wheel · choose a power · tap it to cast'
  : 'WASD / arrows · E interacts · 1–4 choose power · SPACE casts';

function refreshTimeButton() {
  const phase = world.getPhase();
  if (phase.key !== lastPhaseKey) {
    lastPhaseKey = phase.key;
    timeBtn.textContent = phase.label;
  }
}
timeBtn.addEventListener('click', () => {
  world.skipToNextPhase();
  lastPhaseKey = '';
  refreshTimeButton();
});

refreshSelection();
refreshPowerTray();
refreshTimeButton();
syncPedestal();

// ---------------------------------------------------------------- magic + friends
function castMagic() {
  if (mode !== 'play' || magicCooldown > 0) return;
  magicCooldown = 0.35;
  spinTime = 0;
  magic.cast(playerRoot.position, activePower);
}

const friends = makeFriends(scene, playerRoot);

function sayHi() {
  if (mode === 'play') friends.greet();
}

// ---------------------------------------------------------------- houses + decorating
const enterPromptEl = document.getElementById('enterPrompt');
const buildBarEl = document.getElementById('buildBar');
const toolRow = document.getElementById('toolRow');
const rotateBtn = document.getElementById('rotateBtn');
const sleepBtn = document.getElementById('sleepBtn');

let nearbyInteraction = null;
let enteredDoor = null;
let enteredShop = null;

for (const { key, emoji } of FURNITURE_KINDS) {
  const button = document.createElement('button');
  button.className = 'tool squishy';
  button.textContent = emoji;
  button.dataset.tool = key;
  button.addEventListener('click', () => {
    interior.setTool(key);
    refreshTools();
  });
  toolRow.appendChild(button);
}

function refreshTools() {
  for (const button of toolRow.children) {
    button.classList.toggle('selected', button.dataset.tool === interior.getTool());
  }
  rotateBtn.textContent = `↻ ${interior.getPlacementRotation()}°`;
}

function updateSleepButton() {
  const status = interior.getSleepStatus();
  sleepBtn.disabled = !status.nearBed;
  sleepBtn.textContent = status.nearBed
    ? '😴 Sleep'
    : status.hasBed
      ? '🚶 Walk to bed'
      : '🛏️ Place a bed';
}

function rotateFurniture() {
  if (mode !== 'interior') return;
  rotateBtn.textContent = `↻ ${interior.rotatePlacement()}°`;
}

rotateBtn.addEventListener('click', rotateFurniture);
document.getElementById('undoBtn').addEventListener('click', () => { interior.undo(); updateSleepButton(); });
document.getElementById('clearBtn').addEventListener('click', () => { interior.clearAll(); updateSleepButton(); });
document.getElementById('exitBtn').addEventListener('click', exitHouse);

function enterHouse(door) {
  enteredDoor = door;
  interior.enter(config, door.key);
  mode = 'interior';
  nearbyInteraction = null;
  enterPromptEl.classList.add('hidden');
  buildBarEl.classList.remove('hidden');
  document.body.classList.add('building');
  badgeEl.textContent = `🏠 ${config.name}'s ${door.key} house`;
  refreshTools();
  updateSleepButton();
}

function exitHouse() {
  if (mode !== 'interior') return;
  mode = 'play';
  buildBarEl.classList.add('hidden');
  document.body.classList.remove('building');
  badgeEl.textContent = `${SPECIES[config.species].emoji} ${config.name}`;
  if (enteredDoor) {
    playerRoot.position.set(enteredDoor.x, 0, enteredDoor.z);
    currentRotation = desiredRotation = 0;
  }
}

// Tap the floor to drop furniture while building.
const ndc = new THREE.Vector2();
renderer.domElement.addEventListener('pointerdown', (event) => {
  if (mode !== 'interior') return;
  ndc.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
  if (interior.tapPlace(ndc, camera)) updateSleepButton();
});

// ---------------------------------------------------------------- sleep + wake
const sleepOverlayEl = document.getElementById('sleepOverlay');

function goToSleep() {
  if (mode !== 'interior' || !interior.startSleep()) return;
  mode = 'sleeping';
  buildBarEl.classList.add('hidden');
  sleepOverlayEl.classList.remove('hidden');
}

function wakeUp() {
  if (mode !== 'sleeping') return;
  interior.wake();
  world.setPhase('dawn');
  lastPhaseKey = '';
  refreshTimeButton();
  mode = 'interior';
  sleepOverlayEl.classList.add('hidden');
  buildBarEl.classList.remove('hidden');
  updateSleepButton();
}

sleepBtn.addEventListener('click', goToSleep);
document.getElementById('wakeBtn').addEventListener('click', wakeUp);

// ---------------------------------------------------------------- shops
const shopBarEl = document.getElementById('shopBar');
const productRowEl = document.getElementById('productRow');
const cartCountEl = document.getElementById('cartCount');
const shopFeedbackEl = document.getElementById('shopFeedback');

function refreshCartCount() {
  cartCountEl.textContent = `🛒 Cart: ${shopInterior.getCartCount()}`;
}

function renderShopProducts() {
  productRowEl.replaceChildren();
  for (const product of shopInterior.getProducts()) {
    const button = document.createElement('button');
    button.className = 'product-button squishy';
    button.innerHTML = `<span class="product-emoji">${product.emoji}</span> Add ${product.name}`;
    button.addEventListener('click', () => {
      shopInterior.addToCart(product.key);
      refreshCartCount();
      shopFeedbackEl.textContent = `${product.emoji} ${product.name} added to your cart`;
    });
    productRowEl.appendChild(button);
  }
}

function enterShop(shopDoor) {
  enteredShop = shopDoor;
  shopInterior.enter(config, shopDoor);
  mode = 'shop';
  nearbyInteraction = null;
  enterPromptEl.classList.add('hidden');
  shopBarEl.classList.remove('hidden');
  document.body.classList.add('shopping');
  friends.hidePet();
  badgeEl.textContent = `${shopDoor.emoji} ${shopDoor.label}`;
  document.getElementById('shopTitle').textContent = `${shopDoor.emoji} Pick things to buy at ${shopDoor.label}`;
  shopFeedbackEl.textContent = 'The cashier is ready when you are!';
  renderShopProducts();
  refreshCartCount();
}

function exitShop() {
  if (mode !== 'shop') return;
  shopInterior.exit();
  mode = 'play';
  shopBarEl.classList.add('hidden');
  document.body.classList.remove('shopping');
  badgeEl.textContent = `${SPECIES[config.species].emoji} ${config.name}`;
  if (enteredShop) playerRoot.position.set(enteredShop.x, 0, enteredShop.z);
  friends.showPet();
}

document.getElementById('checkoutBtn').addEventListener('click', () => {
  const bought = shopInterior.checkout();
  refreshCartCount();
  shopFeedbackEl.textContent = bought.count
    ? `🎉 Bought ${bought.items.map((item) => item.emoji).join(' ')} — saved in your bag!`
    : 'Add something to your cart first.';
});
document.getElementById('shopExitBtn').addEventListener('click', exitShop);

// ---------------------------------------------------------------- underwater pool
const underwaterBarEl = document.getElementById('underwaterBar');

function enterUnderwater() {
  underwater.enter(config);
  mode = 'underwater';
  nearbyInteraction = null;
  enterPromptEl.classList.add('hidden');
  underwaterBarEl.classList.remove('hidden');
  document.body.classList.add('underwater');
  friends.hidePet();
  badgeEl.textContent = '🤿 Underwater pool reef';
}

function exitUnderwater() {
  if (mode !== 'underwater') return;
  underwater.exit();
  mode = 'play';
  underwaterBarEl.classList.add('hidden');
  document.body.classList.remove('underwater');
  badgeEl.textContent = `${SPECIES[config.species].emoji} ${config.name}`;
  playerRoot.position.set(nature.pool.center.x + nature.pool.halfX + 1.2, 0, nature.pool.center.z);
  friends.showPet();
}
document.getElementById('diveExitBtn').addEventListener('click', exitUnderwater);

// ---------------------------------------------------------------- nearby interactions
function updateInteractionPrompt() {
  let best = null;
  let bestSq = Infinity;

  if (nature.pool.contains(playerRoot.position)) {
    best = { type: 'dive', label: '🤿 Dive under the pool' };
    bestSq = 0;
  }

  for (const door of houseDoors) {
    const distanceSq = (playerRoot.position.x - door.x) ** 2 + (playerRoot.position.z - door.z) ** 2;
    if (distanceSq < 3.2 ** 2 && distanceSq < bestSq) {
      best = { type: 'house', door, label: `🚪 Go inside the ${door.key} house` };
      bestSq = distanceSq;
    }
  }

  for (const door of shopDoors) {
    const distanceSq = (playerRoot.position.x - door.x) ** 2 + (playerRoot.position.z - door.z) ** 2;
    if (distanceSq < 3.2 ** 2 && distanceSq < bestSq) {
      best = { type: 'shop', door, label: `${door.emoji} Enter ${door.label}` };
      bestSq = distanceSq;
    }
  }

  nearbyInteraction = best;
  enterPromptEl.classList.toggle('hidden', !best);
  if (best) enterPromptEl.textContent = best.label;
}

function activateInteraction() {
  if (mode === 'interior') return exitHouse();
  if (mode === 'shop') return exitShop();
  if (mode === 'underwater') return exitUnderwater();
  if (mode !== 'play' || !nearbyInteraction) return;
  if (nearbyInteraction.type === 'house') enterHouse(nearbyInteraction.door);
  else if (nearbyInteraction.type === 'shop') enterShop(nearbyInteraction.door);
  else if (nearbyInteraction.type === 'dive') enterUnderwater();
}

enterPromptEl.addEventListener('click', activateInteraction);

initInput({
  onMagic: castMagic,
  onGreet: sayHi,
  onEnter: activateInteraction,
  onPower: selectPower,
  onRotate: rotateFurniture,
});
magicBtn.addEventListener('click', castMagic);
document.getElementById('greetBtn').addEventListener('click', sayHi);

// ---------------------------------------------------------------- loop
const clock = new THREE.Clock();
const lookTarget = new THREE.Vector3(SPAWN.x, 1.3, SPAWN.z);
const camGoal = new THREE.Vector3();
const lookGoal = new THREE.Vector3();

function resolveCollisions() {
  for (const collider of colliders) {
    const dx = playerRoot.position.x - collider.x;
    const dz = playerRoot.position.z - collider.z;
    const distanceSq = dx * dx + dz * dz;
    if (distanceSq < collider.r * collider.r && distanceSq > 0.0001) {
      const distance = Math.sqrt(distanceSq);
      playerRoot.position.x = collider.x + (dx / distance) * collider.r;
      playerRoot.position.z = collider.z + (dz / distance) * collider.r;
    }
  }
  const fromCenter = Math.hypot(playerRoot.position.x, playerRoot.position.z);
  if (fromCenter > WORLD_RADIUS) {
    playerRoot.position.x *= WORLD_RADIUS / fromCenter;
    playerRoot.position.z *= WORLD_RADIUS / fromCenter;
  }
}

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  world.update(dt);
  refreshTimeButton();
  magicCooldown = Math.max(0, magicCooldown - dt);
  spinTime = Math.min(SPIN_DURATION, spinTime + dt);

  let moving = false;
  if (mode === 'play') {
    const move = getMove();
    moving = Math.hypot(move.x, move.z) > 0.05;
    if (moving) {
      playerRoot.position.x += move.x * PLAYER_SPEED * dt;
      playerRoot.position.z += move.z * PLAYER_SPEED * dt;
      resolveCollisions();
      desiredRotation = Math.atan2(move.x, move.z);
    }

    let delta = desiredRotation - currentRotation;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    currentRotation += delta * Math.min(1, dt * 10);
    const spin = spinTime < SPIN_DURATION ? (spinTime / SPIN_DURATION) * Math.PI * 2 : 0;
    playerRoot.rotation.y = currentRotation + spin;

    camGoal.set(playerRoot.position.x, playerRoot.position.y + 4.8, playerRoot.position.z + 8.5);
    lookGoal.set(playerRoot.position.x, playerRoot.position.y + 1.45, playerRoot.position.z);
    updateInteractionPrompt();
  } else if (mode === 'interior' || mode === 'sleeping') {
    const position = interior.getPlayerPos();
    camGoal.set(position.x * 0.25, 9.5, 15.5);
    lookGoal.set(position.x * 0.25, 1.5, -0.5);
    if (mode === 'interior') updateSleepButton();
  } else if (mode === 'shop') {
    const position = shopInterior.getPlayerPos();
    camGoal.set(position.x * 0.22, 9.6, 15.8);
    lookGoal.set(position.x * 0.22, 1.6, -0.7);
  } else if (mode === 'underwater') {
    const position = underwater.getPlayerPos();
    camGoal.set(position.x, position.y + 4.2, position.z + 8.2);
    lookGoal.set(position.x, position.y + 0.7, position.z - 0.8);
  } else {
    const swayAngle = Math.sin(t * 0.3) * 0.35;
    camGoal.set(
      SPAWN.x + Math.sin(swayAngle) * 4.6,
      2.0,
      SPAWN.z + Math.cos(swayAngle) * 4.6
    );
    lookGoal.set(SPAWN.x, 1.15, SPAWN.z);
  }

  const smoothing = 1 - Math.exp(-dt * 4);
  camera.position.lerp(camGoal, smoothing);
  lookTarget.lerp(lookGoal, smoothing);
  camera.lookAt(lookTarget);

  if (mode === 'interior') {
    interior.update(dt, t, getMove());
  } else if (mode === 'shop') {
    shopInterior.update(dt, t, getMove());
  } else if (mode === 'underwater') {
    underwater.update(dt, t, getMove());
  } else if (mode !== 'sleeping') {
    animateMimimo(playerBody, t, dt, moving);
    updateClouds(dt, t);
    updateTrees(dt, t);
    friends.update(dt, t);
    magic.update(dt);
  }

  let activeScene = scene;
  if (mode === 'interior' || mode === 'sleeping') activeScene = interior.scene;
  else if (mode === 'shop') activeScene = shopInterior.scene;
  else if (mode === 'underwater') activeScene = underwater.scene;
  renderer.render(activeScene, camera);
  requestAnimationFrame(tick);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

tick();

window.__debug = {
  scene,
  camera,
  playerRoot,
  pedestal,
  world,
  interior,
  underwater,
  shopInterior,
  houseDoors,
  shopDoors,
  nature,
  getMode: () => mode,
  enterHouse: (key = houseDoors[0]?.key) => {
    const door = houseDoors.find((item) => item.key === key);
    if (door) enterHouse(door);
  },
  enterShop: (key = 'market') => {
    const door = shopDoors.find((item) => item.key === key);
    if (door) enterShop(door);
  },
  enterUnderwater,
  goToSleep,
  wakeUp,
};
