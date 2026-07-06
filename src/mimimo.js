import * as THREE from 'three';
import { toon, lighten, shadowify, pick } from './utils.js';

const INK = '#3a2b4a';

export const SPECIES = {
  bunny: { label: 'Bunny', emoji: '🐰' },
  kitty: { label: 'Kitty', emoji: '🐱' },
  dragon: { label: 'Dragon', emoji: '🐲' },
  ducky: { label: 'Ducky', emoji: '🐥' },
  blob: { label: 'Blob', emoji: '🫧' },
};

export const COLORS = [
  '#ff9ed2', '#ffb46b', '#ffe066', '#8ee08e',
  '#7ad0ff', '#b79cff', '#ff8f8f', '#fdf3e7',
];

const FIRST = ['Mi', 'Mo', 'Lu', 'Pip', 'Bo', 'Ki', 'Su', 'Nia', 'Ta', 'Zu', 'Fli'];
const SECOND = ['mi', 'mo', 'pi', 'lu', 'bee', 'na', 'po', 'ri', 'chi', 'ku', 'ta'];

export function randomName() {
  let name = pick(FIRST) + pick(SECOND);
  if (Math.random() < 0.35) name += pick(SECOND);
  return name;
}

/** Register a part that wiggles in the idle/run animation. */
function wiggler(anim, obj, { axis = 'z', amp = 0.08, speed = 3 } = {}) {
  anim.wigglers.push({ obj, axis, base: obj.rotation[axis], amp, speed, phase: Math.random() * Math.PI * 2 });
}

function addFace(group, bodyMat) {
  // eyes
  for (const side of [-1, 1]) {
    const white = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), toon('#ffffff'));
    white.position.set(side * 0.22, 1.35, 0.52);
    group.add(white);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 8), toon(INK));
    pupil.position.set(side * 0.22, 1.35, 0.61);
    group.add(pupil);
    const glint = new THREE.Mesh(
      new THREE.SphereGeometry(0.024, 6, 5),
      new THREE.MeshBasicMaterial({ color: '#ffffff' })
    );
    glint.position.set(side * 0.22 + 0.03, 1.38, 0.66);
    group.add(glint);
  }

  // cheeks
  for (const side of [-1, 1]) {
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), toon('#ff9fbf'));
    cheek.position.set(side * 0.4, 1.16, 0.45);
    cheek.scale.set(1, 0.7, 0.5);
    group.add(cheek);
  }

  // smile
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.022, 8, 16, Math.PI), toon(INK));
  smile.position.set(0, 1.13, 0.58);
  smile.rotation.z = Math.PI;
  smile.rotation.x = -0.25;
  group.add(smile);
}

function addBunnyParts(group, bodyMat, anim) {
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.21, 1.7, -0.04);
    pivot.rotation.z = side * -0.14;
    const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.5, 6, 10), bodyMat);
    ear.position.y = 0.36;
    pivot.add(ear);
    const inner = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.3, 4, 8), toon('#ff9fce'));
    inner.position.set(0, 0.36, 0.08);
    pivot.add(inner);
    group.add(pivot);
    wiggler(anim, pivot, { amp: 0.1, speed: 2.6 });
  }
  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), toon('#ffffff'));
  tail.position.set(0, 0.5, -0.52);
  group.add(tail);
}

function addKittyParts(group, bodyMat, color, anim) {
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.3, 1.68, 0);
    pivot.rotation.z = side * -0.28;
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.34, 4), bodyMat);
    ear.position.y = 0.14;
    ear.rotation.y = Math.PI / 4;
    pivot.add(ear);
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.2, 4), toon('#ff9fce'));
    inner.position.set(0, 0.12, 0.05);
    inner.rotation.y = Math.PI / 4;
    pivot.add(inner);
    group.add(pivot);
    wiggler(anim, pivot, { amp: 0.08, speed: 3.2 });
  }
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 0.45, -0.45);
  const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.44, 6, 10), bodyMat);
  tail.position.set(0, 0.22, -0.12);
  tail.rotation.x = 0.55;
  tailPivot.add(tail);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), toon(lighten(color, 0.4)));
  tip.position.set(0, 0.45, -0.26);
  tailPivot.add(tip);
  group.add(tailPivot);
  wiggler(anim, tailPivot, { axis: 'z', amp: 0.28, speed: 4 });
}

function addDragonParts(group, bodyMat, color, anim) {
  for (const side of [-1, 1]) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 8), toon('#fff3e0'));
    horn.position.set(side * 0.2, 1.88, -0.05);
    horn.rotation.z = side * -0.3;
    group.add(horn);
  }
  // stubby wings
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.5, 0.78, -0.28);
    pivot.rotation.z = side * 0.7;
    const wing = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), toon(lighten(color, 0.35)));
    wing.position.set(side * 0.12, 0.14, -0.05);
    wing.scale.set(0.18, 0.62, 1);
    pivot.add(wing);
    group.add(pivot);
    wiggler(anim, pivot, { amp: 0.3, speed: 8 });
  }
  // back spikes
  const spikeMat = toon(lighten(color, 0.35));
  const spikeSpots = [
    [0, 1.85, -0.28, -0.5],
    [0, 1.0, -0.5, -0.9],
    [0, 0.65, -0.55, -1.3],
  ];
  for (const [x, y, z, rx] of spikeSpots) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.2, 6), spikeMat);
    spike.position.set(x, y, z);
    spike.rotation.x = rx;
    group.add(spike);
  }
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.55, 8), bodyMat);
  tail.position.set(0, 0.42, -0.62);
  tail.rotation.x = 2.1;
  group.add(tail);
}

function addDuckyParts(group, bodyMat, color, anim) {
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.28, 10), toon('#ffab4a'));
  beak.position.set(0, 1.18, 0.68);
  beak.rotation.x = Math.PI / 2;
  beak.scale.y = 0.9;
  beak.scale.z = 0.55;
  group.add(beak);

  const curl = new THREE.Group();
  curl.position.set(0, 1.82, 0);
  const feather = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.2, 4, 8), toon(lighten(color, 0.4)));
  feather.position.y = 0.12;
  feather.rotation.z = 0.5;
  curl.add(feather);
  group.add(curl);
  wiggler(anim, curl, { amp: 0.2, speed: 3 });

  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), toon(lighten(color, 0.4)));
  tail.position.set(0, 0.55, -0.5);
  tail.scale.set(1, 0.8, 0.6);
  group.add(tail);
}

function addBlobParts(group, color, anim) {
  const antenna = new THREE.Group();
  antenna.position.set(0, 1.82, 0);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.3, 6), toon(lighten(color, 0.3)));
  stem.position.y = 0.15;
  antenna.add(stem);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), toon('#ffe066'));
  ball.position.y = 0.33;
  antenna.add(ball);
  group.add(antenna);
  wiggler(anim, antenna, { amp: 0.25, speed: 2.4 });

  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), toon(lighten(color, 0.3)));
  tail.position.set(0, 0.45, -0.5);
  group.add(tail);
}

/**
 * Build a mimimo. Front of the character faces +z.
 * Animation state lives in group.userData.anim; drive it with animateMimimo().
 */
export function buildMimimo({ species = 'bunny', color = '#ff9ed2' } = {}) {
  const group = new THREE.Group();
  const anim = { wigglers: [], baseY: 0 };
  group.userData.anim = anim;
  group.userData.config = { species, color };

  const bodyMat = toon(color);

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 18, 14), bodyMat);
  body.position.y = 0.52;
  body.scale.set(1, 0.82, 0.92);
  group.add(body);

  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.4, 14, 12), toon(lighten(color, 0.55)));
  belly.position.set(0, 0.46, 0.18);
  belly.scale.set(0.95, 0.8, 0.7);
  group.add(belly);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.62, 20, 16), bodyMat);
  head.position.y = 1.25;
  group.add(head);

  addFace(group, bodyMat);

  // arms
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.26, 6, 10), bodyMat);
    arm.position.set(side * 0.55, 0.64, 0.1);
    arm.rotation.z = side * 0.65;
    group.add(arm);
  }

  // feet
  for (const side of [-1, 1]) {
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10), bodyMat);
    foot.position.set(side * 0.24, 0.11, 0.08);
    foot.scale.set(1, 0.55, 1.35);
    group.add(foot);
  }

  switch (species) {
    case 'bunny': addBunnyParts(group, bodyMat, anim); break;
    case 'kitty': addKittyParts(group, bodyMat, color, anim); break;
    case 'dragon': addDragonParts(group, bodyMat, color, anim); break;
    case 'ducky': addDuckyParts(group, bodyMat, color, anim); break;
    case 'blob': addBlobParts(group, color, anim); break;
  }

  shadowify(group);
  return group;
}

/** Hop-and-wiggle animation shared by the player, pets, and friends. */
export function animateMimimo(group, t, dt, moving) {
  const anim = group.userData.anim;
  if (!anim) return;

  const bob = moving
    ? Math.abs(Math.sin(t * 9)) * 0.22
    : Math.sin(t * 2.2) * 0.03 + 0.03;
  group.position.y = anim.baseY + bob;

  const squash = moving ? 1 : 1 + Math.sin(t * 2.2) * 0.02;
  group.scale.y = squash;

  const energy = moving ? 1.8 : 1;
  for (const w of anim.wigglers) {
    w.obj.rotation[w.axis] = w.base + Math.sin(t * w.speed * energy + w.phase) * w.amp;
  }
}

export function disposeMimimo(group) {
  group.traverse((o) => {
    if (o.isMesh) o.geometry.dispose();
  });
  group.removeFromParent();
}
