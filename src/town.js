import * as THREE from 'three';
import { toon, darken, lighten, shadowify, colliders, treeKeepOut, emojiSprite, textSprite } from './utils.js';

const INK = '#4a3b5c';

/** A little glowing shop window with white frame + cross bars. */
function windowPane(w = 1.1, h = 1.1) {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, h + 0.2, 0.1), toon('#fffdf8'));
  g.add(frame);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.14), toon('#bfeaff'));
  glass.position.z = 0.04;
  g.add(glass);
  const barV = new THREE.Mesh(new THREE.BoxGeometry(0.09, h, 0.18), toon('#fffdf8'));
  barV.position.z = 0.06;
  g.add(barV);
  const barH = new THREE.Mesh(new THREE.BoxGeometry(w, 0.09, 0.18), toon('#fffdf8'));
  barH.position.z = 0.06;
  g.add(barH);
  return g;
}

/** Striped candy awning that overhangs the shopfront. */
function awning(width, accent) {
  const g = new THREE.Group();
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(width, 0.24, 1.2), toon(accent));
  canopy.rotation.x = -0.45;
  g.add(canopy);
  // scalloped edge
  const scallops = Math.round(width / 0.6);
  for (let i = 0; i < scallops; i++) {
    const bump = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 12, 8),
      toon(i % 2 ? '#fffdf8' : accent)
    );
    bump.position.set(-width / 2 + 0.3 + i * (width / scallops), -0.42, 0.52);
    bump.scale.set(1, 0.7, 0.7);
    g.add(bump);
  }
  return g;
}

/**
 * A candy-styled shop: coloured box, pyramid roof, door, windows,
 * striped awning, and a big rooftop emoji sign with a name pill.
 */
function shopBuilding({ color, roof, accent, emoji, label, w = 6.4, h = 4.2, d = 5 }) {
  const g = new THREE.Group();

  const base = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(color));
  base.position.y = h / 2;
  g.add(base);

  const roofMesh = new THREE.Mesh(new THREE.ConeGeometry(w * 0.86, h * 0.7, 4), toon(roof));
  roofMesh.position.y = h + h * 0.33;
  roofMesh.rotation.y = Math.PI / 4;
  g.add(roofMesh);

  // door
  const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.2, 0.24), toon(darken(color, 0.4)));
  doorMesh.position.set(0, 1.1, d / 2 + 0.06);
  g.add(doorMesh);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), toon('#ffe066'));
  knob.position.set(0.45, 1.1, d / 2 + 0.2);
  g.add(knob);

  // windows either side of the door
  for (const side of [-1, 1]) {
    const win = windowPane();
    win.position.set(side * (w * 0.28), h * 0.58, d / 2 + 0.06);
    g.add(win);
  }

  // awning over the door
  const aw = awning(w * 0.9, accent);
  aw.position.set(0, h * 0.5, d / 2 + 0.55);
  g.add(aw);

  // rooftop sign
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.1, 8), toon(INK));
  post.position.set(0, h + h * 0.33 + 0.9, 0);
  g.add(post);
  const sign = emojiSprite(emoji, 2.4);
  sign.position.set(0, h + h * 0.33 + 2.1, 0);
  g.add(sign);

  const tag = textSprite(label);
  tag.position.set(0, h + 0.55, d / 2 + 0.2);
  g.add(tag);

  return g;
}

// Emoji-topped market stalls to fill the plaza.
function stall(emoji, color) {
  const g = new THREE.Group();
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.6, 8), toon('#b98a5e'));
    leg.position.set(side * 1.1, 0.8, 0);
    g.add(leg);
  }
  const counter = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.3, 1.4), toon('#e9d3b0'));
  counter.position.y = 1.5;
  g.add(counter);
  // striped roof
  for (let i = 0; i < 5; i++) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.14, 1.7), toon(i % 2 ? '#fffdf8' : color));
    stripe.position.set(-1.12 + i * 0.56, 2.5, 0);
    stripe.rotation.x = 0;
    g.add(stripe);
  }
  const roofTilt = new THREE.Group();
  const sign = emojiSprite(emoji, 1.3);
  sign.position.set(0, 3.1, 0);
  g.add(sign);
  return g;
}

const SHOPS = [
  { key: 'toys', x: 33, z: -13, color: '#8fd0ff', roof: '#ff8f8f', accent: '#ff8fc7', emoji: '🧸', label: 'Toy Shop' },
  { key: 'bakery', x: 41, z: -4, color: '#ffdca6', roof: '#c98a5c', accent: '#ff9a6b', emoji: '🥐', label: 'Bakery' },
  { key: 'market', x: 47, z: 5, color: '#8ee0a8', roof: '#4fb07a', accent: '#ffd54f', emoji: '🛒', label: 'Supermarket', w: 7.6, h: 4.6, d: 6 },
  { key: 'icecream', x: 40, z: 14, color: '#ffc2e2', roof: '#ff8fc7', accent: '#7ad0ff', emoji: '🍦', label: 'Ice Cream' },
  { key: 'candy', x: 31, z: 21, color: '#c8a2ff', roof: '#9b6ff0', accent: '#ffe066', emoji: '🍬', label: 'Candy Shop' },
];

/**
 * The east-side town square: five candy shops facing a plaza,
 * a couple of market stalls, and a signpost. Keeps trees away.
 */
export function makeTown(scene) {
  const center = { x: 39, z: 4 };
  treeKeepOut.push({ x: center.x, z: center.z, r: 22 });

  // plaza floor (warm cobble circle)
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(14, 40), toon('#ffe9c9'));
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(center.x, 0.02, center.z);
  plaza.receiveShadow = true;
  scene.add(plaza);
  const inner = new THREE.Mesh(new THREE.CircleGeometry(5, 32), toon('#ffdca6'));
  inner.rotation.x = -Math.PI / 2;
  inner.position.set(center.x, 0.03, center.z);
  scene.add(inner);

  for (const spec of SHOPS) {
    const shop = shopBuilding(spec);
    shop.position.set(spec.x, 0, spec.z);
    // face the plaza centre
    shop.rotation.y = Math.atan2(center.x - spec.x, center.z - spec.z);
    shadowify(shop);
    scene.add(shop);
    const halfW = (spec.w || 6.4) / 2;
    const halfD = (spec.d || 5) / 2;
    colliders.push({ x: spec.x, z: spec.z, r: Math.max(halfW, halfD) + 0.6 });
  }

  // market stalls in the plaza
  const stallA = stall('🍎', '#ff8f8f');
  stallA.position.set(center.x - 3, 0, center.z - 1);
  stallA.rotation.y = 0.5;
  shadowify(stallA);
  scene.add(stallA);
  colliders.push({ x: center.x - 3, z: center.z - 1, r: 1.8 });

  const stallB = stall('🎈', '#7ad0ff');
  stallB.position.set(center.x + 3, 0, center.z + 2);
  stallB.rotation.y = -0.6;
  shadowify(stallB);
  scene.add(stallB);
  colliders.push({ x: center.x + 3, z: center.z + 2, r: 1.8 });

  // signpost welcoming you to town
  scene.add(makeSignpost('🛍️ Town', center.x - 12, center.z - 10));
}

/** A wooden post with a floating label — used to mark districts. */
export function makeSignpost(label, x, z) {
  const g = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 3, 8), toon('#b98a5e'));
  post.position.y = 1.5;
  g.add(post);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), toon('#ff8f8f'));
  cap.position.y = 3.1;
  g.add(cap);
  const tag = textSprite(label, { fontSize: 40 });
  tag.position.y = 3.9;
  g.add(tag);
  g.position.set(x, 0, z);
  shadowify(g);
  return g;
}
