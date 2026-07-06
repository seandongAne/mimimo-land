import * as THREE from 'three';
import { makeWorld, WORLD_RADIUS } from './world.js';
import { makeClouds } from './clouds.js';
import { makeTrees } from './trees.js';
import { makeHouses } from './houses.js';
import { buildMimimo, animateMimimo, disposeMimimo, SPECIES, COLORS, randomName } from './mimimo.js';
import { makeFriends } from './friends.js';
import { Magic } from './magic.js';
import { initInput, getMove } from './input.js';
import { colliders, toon } from './utils.js';

const SPAWN = new THREE.Vector3(0, 0, 6);
const PLAYER_SPEED = 5.2;
const SPIN_DURATION = 0.5;
const SAVE_KEY = 'mimimo.save.v1';

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

makeWorld(scene);
makeHouses(scene); // registers colliders first so trees keep clear
const updateTrees = makeTrees(scene);
const updateClouds = makeClouds(scene);
const magic = new Magic(scene);

// ---------------------------------------------------------------- player
function loadConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (saved && SPECIES[saved.species] && COLORS.includes(saved.color) && saved.name) {
      return saved;
    }
  } catch {
    /* fresh start */
  }
  return { species: 'bunny', color: '#ff9ed2', name: randomName() };
}

const config = loadConfig();

// stable root that moves/turns; the body inside is swapped by the creator
const playerRoot = new THREE.Group();
playerRoot.position.copy(SPAWN);
scene.add(playerRoot);
let playerBody = buildMimimo(config);
playerRoot.add(playerBody);

// pedestal the mimimo stands on while being created
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

// ---------------------------------------------------------------- UI
const creatorEl = document.getElementById('creator');
const hudEl = document.getElementById('hud');
const badgeEl = document.getElementById('badge');
const nameInput = document.getElementById('nameInput');
const hintEl = document.getElementById('hint');

let mode = 'creator';
let spinTime = SPIN_DURATION;
let magicCooldown = 0;
let desiredRotation = 0;
let currentRotation = 0; // heading without the magic twirl mixed in

function syncPedestal() {
  const active = mode === 'creator';
  playerBody.userData.anim.baseY = active ? 0.28 : 0;
  pedestal.visible = active;
}

// species chips
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

// color swatches
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

function refreshSelection() {
  for (const chip of speciesRow.children) {
    chip.classList.toggle('selected', chip.dataset.key === config.species);
  }
  for (const swatch of colorRow.children) {
    swatch.classList.toggle('selected', swatch.dataset.color === config.color);
  }
}

nameInput.value = config.name;
document.getElementById('diceBtn').addEventListener('click', () => {
  nameInput.value = randomName();
});

document.getElementById('startBtn').addEventListener('click', () => {
  config.name = nameInput.value.trim() || randomName();
  nameInput.value = config.name;
  localStorage.setItem(SAVE_KEY, JSON.stringify(config));

  mode = 'play';
  syncPedestal();
  friends.showPet();
  creatorEl.classList.add('hidden');
  hudEl.classList.remove('hidden');
  badgeEl.textContent = `${SPECIES[config.species].emoji} ${config.name}`;
  castMagic(); // celebration burst!
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
  ? 'Drag the wheel to explore · tap ✨ for magic'
  : 'WASD / arrows to explore · SPACE for magic ✨';

refreshSelection();
syncPedestal();

// ---------------------------------------------------------------- magic
function castMagic() {
  if (mode !== 'play' || magicCooldown > 0) return;
  magicCooldown = 0.35;
  spinTime = 0; // happy twirl
  magic.cast(playerRoot.position);
}

initInput({ onMagic: castMagic });
document.getElementById('magicBtn').addEventListener('click', castMagic);

const friends = makeFriends(scene, playerRoot);

// ---------------------------------------------------------------- loop
const clock = new THREE.Clock();
const lookTarget = new THREE.Vector3(SPAWN.x, 1.3, SPAWN.z);
const camGoal = new THREE.Vector3();
const lookGoal = new THREE.Vector3();

function resolveCollisions() {
  for (const c of colliders) {
    const dx = playerRoot.position.x - c.x;
    const dz = playerRoot.position.z - c.z;
    const distSq = dx * dx + dz * dz;
    if (distSq < c.r * c.r && distSq > 0.0001) {
      const dist = Math.sqrt(distSq);
      playerRoot.position.x = c.x + (dx / dist) * c.r;
      playerRoot.position.z = c.z + (dz / dist) * c.r;
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

    // shortest-path turn toward travel direction, plus a magic twirl
    let delta = desiredRotation - currentRotation;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    currentRotation += delta * Math.min(1, dt * 10);
    const spin = spinTime < SPIN_DURATION ? (spinTime / SPIN_DURATION) * Math.PI * 2 : 0;
    playerRoot.rotation.y = currentRotation + spin;

    camGoal.set(playerRoot.position.x, playerRoot.position.y + 4.6, playerRoot.position.z + 8.4);
    lookGoal.set(playerRoot.position.x, playerRoot.position.y + 1.3, playerRoot.position.z);
  } else {
    // creator: sway gently side to side across the mimimo's face
    const swayAngle = Math.sin(t * 0.3) * 0.35;
    camGoal.set(
      SPAWN.x + Math.sin(swayAngle) * 4.6,
      2.0,
      SPAWN.z + Math.cos(swayAngle) * 4.6
    );
    lookGoal.set(SPAWN.x, 1.15, SPAWN.z);
  }

  const k = 1 - Math.exp(-dt * 4);
  camera.position.lerp(camGoal, k);
  lookTarget.lerp(lookGoal, k);
  camera.lookAt(lookTarget);

  animateMimimo(playerBody, t, dt, moving);
  updateClouds(dt, t);
  updateTrees(dt, t);
  friends.update(dt, t);
  magic.update(dt);

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

tick();

// handy while developing: inspect scene state from the console
window.__debug = { scene, camera, playerRoot, pedestal };
