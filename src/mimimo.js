import * as THREE from 'three';
import { toon, lighten, darken, shadowify, pick } from './utils.js';

const INK = '#3a2b4a';

/**
 * Ten species. `mythical: true` marks the sparkly make-believe ones.
 * Front of every mimimo faces +z.
 */
export const SPECIES = {
  bunny: { label: 'Bunny', emoji: '🐰' },
  kitty: { label: 'Kitty', emoji: '🐱' },
  puppy: { label: 'Puppy', emoji: '🐶' },
  bear: { label: 'Bear', emoji: '🐻' },
  foxy: { label: 'Foxy', emoji: '🦊' },
  ducky: { label: 'Ducky', emoji: '🐥', flies: true },
  blob: { label: 'Blob', emoji: '🫧' },
  squid: { label: 'Squid', emoji: '🦑' },
  fairy: { label: 'Fairy', emoji: '🧚', mythical: true, flies: true },
  dragon: { label: 'Dragon', emoji: '🐲', mythical: true, flies: true },
  unicorn: { label: 'Unicorn', emoji: '🦄', mythical: true },
  phoenix: { label: 'Phoenix', emoji: '🔥', mythical: true, flies: true },
};

/** Two body shapes offered in the creator. */
export const SHAPES = {
  classic: { label: 'Classic', emoji: '🧸' },
  circle: { label: 'Round', emoji: '⚪' },
};

/** 20 candy colors (a couple of warm browns help the bears & puppies read). */
export const COLORS = [
  '#ff9ed2', '#ff6fae', '#ffc2e2', '#ff8f8f',
  '#ff7043', '#ffb46b', '#ffd54f', '#ffe066',
  '#eaf06b', '#a8e85c', '#8ee08e', '#5fd6b0',
  '#7ad0ff', '#5fb0ff', '#8aa8ff', '#b79cff',
  '#c98cff', '#e79cff', '#c9a27a', '#fdf3e7',
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

/**
 * Eyes, cheeks and (optionally) a smile. Everything is added to `face`,
 * a group that gets pushed forward for the rounder body so the features
 * still sit on the surface instead of sinking in.
 */
function addFace(face, { smile = true, mouthDepth = 0.61 } = {}) {
  // eyes
  for (const side of [-1, 1]) {
    const white = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), toon('#ffffff'));
    white.position.set(side * 0.22, 1.35, 0.52);
    face.add(white);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 8), toon(INK));
    pupil.position.set(side * 0.22, 1.35, 0.61);
    face.add(pupil);
    const glint = new THREE.Mesh(
      new THREE.SphereGeometry(0.024, 6, 5),
      new THREE.MeshBasicMaterial({ color: '#ffffff' })
    );
    glint.position.set(side * 0.22 + 0.03, 1.38, 0.66);
    face.add(glint);
  }

  // cheeks
  for (const side of [-1, 1]) {
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), toon('#ff9fbf'));
    cheek.position.set(side * 0.4, 1.16, 0.45);
    cheek.scale.set(1, 0.7, 0.5);
    face.add(cheek);
  }

  if (smile) {
    // A soft, curved "w" gives every mimimo the same kawaii expression.
    const mouthCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.16, 0.04, 0),
      new THREE.Vector3(-0.08, -0.045, 0),
      new THREE.Vector3(0, 0.035, 0),
      new THREE.Vector3(0.08, -0.045, 0),
      new THREE.Vector3(0.16, 0.04, 0),
    ]);
    const mouth = new THREE.Mesh(new THREE.TubeGeometry(mouthCurve, 24, 0.018, 7, false), toon(INK));
    mouth.position.set(0, 1.13, mouthDepth);
    face.add(mouth);
  }
}

/* ------------------------------------------------------------ species parts */

function addBunnyParts(group, face, bodyMat, color, anim) {
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

function addKittyParts(group, face, bodyMat, color, anim) {
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

function addPuppyParts(group, face, bodyMat, color, anim) {
  // floppy ears that hang beside the head
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.5, 1.6, -0.02);
    pivot.rotation.z = side * 0.22;
    const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.44, 6, 10), toon(darken(color, 0.18)));
    ear.position.y = -0.3;
    ear.scale.set(0.85, 1, 0.5);
    pivot.add(ear);
    group.add(pivot);
    wiggler(anim, pivot, { amp: 0.14, speed: 3 });
  }
  // snout + nose
  const snout = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), toon(lighten(color, 0.4)));
  snout.position.set(0, 1.13, 0.56);
  snout.scale.set(1, 0.82, 0.9);
  face.add(snout);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), toon(INK));
  nose.position.set(0, 1.2, 0.75);
  face.add(nose);
  // waggy tail
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 0.56, -0.5);
  const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.3, 6, 10), bodyMat);
  tail.position.set(0, 0.16, -0.05);
  tail.rotation.x = -0.6;
  tailPivot.add(tail);
  group.add(tailPivot);
  wiggler(anim, tailPivot, { axis: 'z', amp: 0.45, speed: 9 });
}

function addBearParts(group, face, bodyMat, color, anim) {
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), bodyMat);
    ear.position.set(side * 0.42, 1.78, 0);
    group.add(ear);
    const inner = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), toon(lighten(color, 0.4)));
    inner.position.set(side * 0.42, 1.8, 0.14);
    group.add(inner);
  }
  const snout = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), toon(lighten(color, 0.45)));
  snout.position.set(0, 1.14, 0.54);
  snout.scale.set(1, 0.85, 0.85);
  face.add(snout);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), toon(INK));
  nose.position.set(0, 1.22, 0.74);
  face.add(nose);
  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), bodyMat);
  tail.position.set(0, 0.5, -0.52);
  group.add(tail);
}

function addFoxyParts(group, face, bodyMat, color, anim) {
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.32, 1.7, 0);
    pivot.rotation.z = side * -0.2;
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 10), bodyMat);
    ear.position.y = 0.2;
    pivot.add(ear);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 8), toon(INK));
    tip.position.set(0, 0.4, 0.02);
    pivot.add(tip);
    group.add(pivot);
    wiggler(anim, pivot, { amp: 0.08, speed: 3 });
  }
  // pointy snout
  const snout = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.42, 12), toon(lighten(color, 0.3)));
  snout.position.set(0, 1.1, 0.58);
  snout.rotation.x = Math.PI / 2;
  snout.scale.set(1, 1, 0.7);
  face.add(snout);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), toon(INK));
  nose.position.set(0, 1.1, 0.82);
  face.add(nose);
  // big bushy white-tipped tail
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 0.5, -0.5);
  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10), bodyMat);
  tail.position.set(0, 0.08, -0.34);
  tail.scale.set(0.7, 0.7, 1.3);
  tailPivot.add(tail);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), toon('#fff4ea'));
  tip.position.set(0, 0.16, -0.72);
  tip.scale.set(0.7, 0.7, 0.9);
  tailPivot.add(tip);
  group.add(tailPivot);
  wiggler(anim, tailPivot, { axis: 'z', amp: 0.22, speed: 3.5 });
}

function addDuckyParts(group, face, bodyMat, color, anim) {
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.28, 10), toon('#ffab4a'));
  beak.position.set(0, 1.18, 0.68);
  beak.rotation.x = Math.PI / 2;
  beak.scale.y = 0.9;
  beak.scale.z = 0.55;
  face.add(beak);

  for (const side of [-1, 1]) {
    const wingPivot = new THREE.Group();
    wingPivot.position.set(side * 0.5, 0.78, -0.08);
    wingPivot.rotation.z = side * 0.45;
    const wing = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), toon(lighten(color, 0.25)));
    wing.scale.set(0.25, 0.9, 0.65);
    wingPivot.add(wing);
    group.add(wingPivot);
    wiggler(anim, wingPivot, { amp: 0.38, speed: 8.5 });
  }

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

function addBlobParts(group, face, bodyMat, color, anim) {
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

function addSquidParts(group, face, bodyMat, color, anim) {
  const mantle = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.78, 16), bodyMat);
  mantle.position.set(0, 1.86, -0.03);
  group.add(mantle);

  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const pivot = new THREE.Group();
    pivot.position.set(Math.cos(a) * 0.32, 0.28, Math.sin(a) * 0.25);
    pivot.rotation.z = Math.cos(a) * 0.28;
    pivot.rotation.x = Math.sin(a) * 0.28;
    const tentacle = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.34, 5, 9), toon(lighten(color, i % 2 ? 0.08 : 0.2)));
    tentacle.position.y = -0.2;
    pivot.add(tentacle);
    group.add(pivot);
    wiggler(anim, pivot, { amp: 0.22, speed: 4 + i * 0.18 });
  }

  for (const side of [-1, 1]) {
    const fin = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), toon(lighten(color, 0.3)));
    fin.position.set(side * 0.52, 1.62, -0.08);
    fin.scale.set(0.55, 1, 0.35);
    group.add(fin);
  }
}

function addFairyParts(group, face, bodyMat, color, anim) {
  const wingMat = new THREE.MeshBasicMaterial({
    color: '#dff8ff',
    transparent: true,
    opacity: 0.72,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.42, 1.0, -0.42);
    pivot.rotation.z = side * 0.45;

    const upper = new THREE.Mesh(new THREE.SphereGeometry(0.45, 14, 10), wingMat);
    upper.position.set(side * 0.18, 0.3, 0);
    upper.scale.set(0.35, 1.05, 0.08);
    pivot.add(upper);

    const lower = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 9), wingMat);
    lower.position.set(side * 0.13, -0.25, 0);
    lower.scale.set(0.32, 0.9, 0.08);
    pivot.add(lower);

    group.add(pivot);
    wiggler(anim, pivot, { amp: 0.5, speed: 10 });
  }

  const crown = new THREE.Group();
  crown.position.set(0, 1.9, 0);
  for (let i = -1; i <= 1; i++) {
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), toon(['#ff8fc7', '#ffe066', '#7ad0ff'][i + 1]));
    star.position.set(i * 0.2, Math.abs(i) ? 0 : 0.12, 0.02);
    crown.add(star);
  }
  group.add(crown);
  wiggler(anim, crown, { amp: 0.12, speed: 3.5 });
}

function addDragonParts(group, face, bodyMat, color, anim) {
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

function addUnicornParts(group, face, bodyMat, color, anim) {
  // sparkly horn
  const horn = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.62, 8), toon('#ffe38a'));
  horn.position.set(0, 1.98, 0.14);
  horn.rotation.x = 0.16;
  group.add(horn);
  // little ears
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.28, 8), bodyMat);
    ear.position.set(side * 0.32, 1.74, -0.02);
    ear.rotation.z = side * -0.22;
    group.add(ear);
  }
  // rainbow mane down the back of the head
  const maneColors = ['#ff8f8f', '#ffb46b', '#ffe066', '#8ee08e', '#7ad0ff', '#b79cff'];
  const manePivot = new THREE.Group();
  manePivot.position.set(0, 1.85, -0.2);
  maneColors.forEach((c, i) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), toon(c));
    m.position.set(0, -i * 0.22, -i * 0.05);
    m.scale.set(0.72, 1, 0.72);
    manePivot.add(m);
  });
  group.add(manePivot);
  wiggler(anim, manePivot, { amp: 0.08, speed: 2.2 });
  // rainbow tail
  const tailColors = ['#ff8f8f', '#ffe066', '#7ad0ff', '#b79cff'];
  tailColors.forEach((c, i) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), toon(c));
    m.position.set((i - 1.5) * 0.06, 0.52 - i * 0.13, -0.55);
    group.add(m);
  });
}

function addPhoenixParts(group, face, bodyMat, color, anim) {
  // flame crest
  const crestColors = ['#ff5252', '#ff8f43', '#ffd54f'];
  const crest = new THREE.Group();
  crest.position.set(0, 1.78, -0.02);
  crestColors.forEach((c, i) => {
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.14 - i * 0.02, 0.42 + i * 0.12, 8), toon(c));
    flame.position.set((i - 1) * 0.17, 0.12 + (1 - Math.abs(i - 1)) * 0.14, 0);
    flame.rotation.z = (i - 1) * 0.28;
    crest.add(flame);
  });
  group.add(crest);
  wiggler(anim, crest, { amp: 0.12, speed: 5 });
  // little beak
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.26, 8), toon('#ffab4a'));
  beak.position.set(0, 1.2, 0.6);
  beak.rotation.x = Math.PI / 2;
  beak.scale.set(1, 1, 0.6);
  face.add(beak);
  // fiery wings
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.5, 0.82, -0.2);
    pivot.rotation.z = side * 0.6;
    const wing = new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 8), toon('#ff8f43'));
    wing.position.set(side * 0.14, 0.12, -0.05);
    wing.scale.set(0.2, 0.72, 1);
    pivot.add(wing);
    const wtip = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), toon('#ffd54f'));
    wtip.position.set(side * 0.22, 0.42, -0.05);
    wtip.scale.set(0.2, 0.5, 0.8);
    pivot.add(wtip);
    group.add(pivot);
    wiggler(anim, pivot, { amp: 0.4, speed: 9 });
  }
  // tail feathers
  const tailColors = ['#ff5252', '#ff8f43', '#ffd54f'];
  tailColors.forEach((c, i) => {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.6, 8), toon(c));
    f.position.set((i - 1) * 0.18, 0.5, -0.55);
    f.rotation.x = 2.4;
    f.rotation.z = (i - 1) * 0.2;
    group.add(f);
  });
}

const SPECIES_PARTS = {
  bunny: addBunnyParts,
  kitty: addKittyParts,
  puppy: addPuppyParts,
  bear: addBearParts,
  foxy: addFoxyParts,
  ducky: addDuckyParts,
  blob: addBlobParts,
  squid: addSquidParts,
  fairy: addFairyParts,
  dragon: addDragonParts,
  unicorn: addUnicornParts,
  phoenix: addPhoenixParts,
};

/* ------------------------------------------------------------ body */

/**
 * Build the torso/head. Two shapes:
 *  - classic: the original snowman-ish body + separate head
 *  - circle:  one big round ball body (face sits right on it)
 * Returns metrics the rest of the builder uses to place face, arms, feet.
 */
function addBody(group, color, shape) {
  const bodyMat = toon(color);

  if (shape === 'circle') {
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.85, 20, 16), bodyMat);
    ball.position.y = 1.0;
    ball.scale.set(1.05, 1.0, 1.0);
    group.add(ball);

    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 12), toon(lighten(color, 0.55)));
    belly.position.set(0, 0.82, 0.44);
    belly.scale.set(0.92, 0.9, 0.55);
    group.add(belly);

    return { bodyMat, faceDy: -0.02, facePush: 0.2, armX: 0.72, armY: 0.7, footX: 0.28 };
  }

  // classic
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

  return { bodyMat, faceDy: 0, facePush: 0, armX: 0.55, armY: 0.64, footX: 0.24 };
}

/**
 * Build a mimimo. Front of the character faces +z.
 * Animation state lives in group.userData.anim; drive it with animateMimimo().
 */
export function buildMimimo({ species = 'bunny', color = '#ff9ed2', shape = 'classic' } = {}) {
  if (!SPECIES[species]) species = 'bunny';
  if (!SHAPES[shape]) shape = 'classic';

  const group = new THREE.Group();
  const anim = { wigglers: [], baseY: 0 };
  group.userData.anim = anim;
  group.userData.config = { species, color, shape };

  const { bodyMat, faceDy, facePush, armX, armY, footX } = addBody(group, color, shape);

  // face features live on a group that's nudged forward for the round body
  const face = new THREE.Group();
  face.position.set(0, faceDy, facePush);
  group.add(face);
  addFace(face, {
    // Beaked species provide their own mouth shape in their species parts.
    smile: species !== 'ducky' && species !== 'phoenix',
    // The round body curves farther forward than the classic head. Keep the
    // tube fully above that surface so the middle of the "w" cannot clip out.
    mouthDepth: shape === 'circle' ? 0.69 : 0.61,
  });

  if (species !== 'squid') {
    // arms
    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.26, 6, 10), bodyMat);
      arm.position.set(side * armX, armY, 0.1);
      arm.rotation.z = side * 0.65;
      group.add(arm);
    }

    // feet
    for (const side of [-1, 1]) {
      const foot = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10), bodyMat);
      foot.position.set(side * footX, 0.11, 0.08);
      foot.scale.set(1, 0.55, 1.35);
      group.add(foot);
    }
  }

  (SPECIES_PARTS[species] || SPECIES_PARTS.bunny)(group, face, bodyMat, color, anim);

  shadowify(group);
  return group;
}

/** Hop-and-wiggle animation shared by the player, pets, and friends. */
export function animateMimimo(group, t, dt, moving) {
  const anim = group.userData.anim;
  if (!anim) return;

  const flies = Boolean(SPECIES[group.userData.config?.species]?.flies);
  const bob = flies
    ? Math.sin(t * (moving ? 5 : 2.8)) * (moving ? 0.18 : 0.11)
    : moving
      ? Math.abs(Math.sin(t * 9)) * 0.22
      : Math.sin(t * 2.2) * 0.03 + 0.03;
  group.position.y = anim.baseY + (flies ? 0.85 : 0) + bob;

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
