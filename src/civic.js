import * as THREE from 'three';
import { toon, darken, shadowify, colliders, treeKeepOut, emojiSprite, textSprite, rand } from './utils.js';
import { windowPane, awning, makeSignpost } from './town.js';
import { makeFlower } from './world.js';

const INK = '#4a3b5c';

const box = (w, h, d, color) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(color));

/** Floating rooftop emoji + a name pill over the door, like the town shops. */
function addSigns(g, { emoji, label, signY, h, d }) {
  const sign = emojiSprite(emoji, 2.5);
  sign.position.set(0, signY, 0);
  g.add(sign);
  const tag = textSprite(label);
  tag.position.set(0, h + 0.55, d / 2 + 0.2);
  g.add(tag);
}

/** Sunny schoolhouse: bell cupola, clock over the double door, flag pole. */
function schoolBuilding() {
  const g = new THREE.Group();
  const color = '#ffe0a1';
  const roofColor = '#ff8f8f';
  const w = 10, h = 4.8, d = 6.5;

  const base = box(w, h, d, color);
  base.position.y = h / 2;
  g.add(base);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.78, h * 0.62, 4), toon(roofColor));
  roof.position.y = h + h * 0.31;
  roof.rotation.y = Math.PI / 4;
  g.add(roof);

  // bell cupola on the roof peak
  const platform = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.72, 0.3, 10), toon('#fffdf8'));
  platform.position.y = 7.85;
  g.add(platform);
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), toon('#ffd54f'));
  bell.position.y = 8.3;
  bell.scale.set(1, 1.15, 1);
  g.add(bell);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.78, 0.7, 10), toon(roofColor));
  cap.position.y = 8.95;
  g.add(cap);

  // clock above the door
  const clockFace = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.16, 20), toon('#ffffff'));
  clockFace.rotation.x = Math.PI / 2;
  clockFace.position.set(0, 3.7, d / 2 + 0.08);
  g.add(clockFace);
  const clockRim = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.08, 8, 24), toon(INK));
  clockRim.position.set(0, 3.7, d / 2 + 0.16);
  g.add(clockRim);
  const handUp = box(0.08, 0.55, 0.05, INK);
  handUp.position.set(0, 3.92, d / 2 + 0.18);
  g.add(handUp);
  const handSide = box(0.42, 0.08, 0.05, INK);
  handSide.position.set(0.2, 3.7, d / 2 + 0.18);
  g.add(handSide);

  // double door with a white frame
  const frame = box(2.3, 2.6, 0.12, '#fffdf8');
  frame.position.set(0, 1.3, d / 2 + 0.03);
  g.add(frame);
  for (const side of [-1, 1]) {
    const slab = box(1.0, 2.4, 0.14, darken(color, 0.4));
    slab.position.set(side * 0.55, 1.2, d / 2 + 0.08);
    g.add(slab);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), toon('#ffe066'));
    knob.position.set(side * 0.2, 1.25, d / 2 + 0.2);
    g.add(knob);
  }

  for (const side of [-1, 1]) {
    const win = windowPane();
    win.position.set(side * 2.9, 2.7, d / 2 + 0.06);
    g.add(win);
  }

  // flag pole by the entrance
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 5.6, 8), toon('#fffdf8'));
  pole.position.set(4.2, 2.8, d / 2 + 1.1);
  g.add(pole);
  const flag = box(1.15, 0.7, 0.06, '#7ad0ff');
  flag.position.set(4.85, 5.15, d / 2 + 1.1);
  g.add(flag);

  addSigns(g, { emoji: '🏫', label: 'School', signY: 10.1, h, d });
  return g;
}

/** Friendly white hospital: flat blue roof, big soft-pink crosses. */
function hospitalBuilding() {
  const g = new THREE.Group();
  const color = '#fdfbff';
  const cross = '#ff6f91';
  const w = 10, h = 5.4, d = 6.5;

  const base = box(w, h, d, color);
  base.position.y = h / 2;
  g.add(base);

  const roof = box(w + 0.7, 0.55, d + 0.7, '#7ad0ff');
  roof.position.y = h + 0.27;
  g.add(roof);

  // rooftop cross
  const crossV = box(0.75, 2.5, 0.75, cross);
  crossV.position.y = h + 1.8;
  g.add(crossV);
  const crossH = box(2.5, 0.75, 0.75, cross);
  crossH.position.y = h + 2.1;
  g.add(crossH);

  // small cross above the door
  const frontV = box(0.5, 1.5, 0.12, cross);
  frontV.position.set(0, 4.3, d / 2 + 0.06);
  g.add(frontV);
  const frontH = box(1.5, 0.5, 0.12, cross);
  frontH.position.set(0, 4.3, d / 2 + 0.06);
  g.add(frontH);

  // wide glass sliding door
  const frame = box(2.6, 2.7, 0.1, '#fffdf8');
  frame.position.set(0, 1.35, d / 2 + 0.03);
  g.add(frame);
  const glass = box(2.2, 2.4, 0.14, '#bfeaff');
  glass.position.set(0, 1.2, d / 2 + 0.07);
  g.add(glass);
  const divider = box(0.1, 2.4, 0.18, '#fffdf8');
  divider.position.set(0, 1.2, d / 2 + 0.09);
  g.add(divider);

  const aw = awning(4.2, '#ff8fc7');
  aw.position.set(0, 3.15, d / 2 + 0.55);
  g.add(aw);

  for (const side of [-1, 1]) {
    const win = windowPane();
    win.position.set(side * 3.1, 2.9, d / 2 + 0.06);
    g.add(win);
  }

  addSigns(g, { emoji: '🏥', label: 'Hospital', signY: 9.5, h, d });
  return g;
}

/** Cozy restaurant: warm peach walls, smoky chimney, menu easel. */
function restaurantBuilding() {
  const g = new THREE.Group();
  const color = '#ffac8e';
  const roofColor = '#e2694f';
  const w = 8, h = 4.2, d = 5.5;

  const base = box(w, h, d, color);
  base.position.y = h / 2;
  g.add(base);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.86, h * 0.7, 4), toon(roofColor));
  roof.position.y = h + h * 0.33;
  roof.rotation.y = Math.PI / 4;
  g.add(roof);

  // chimney with puffs of soup steam
  const chimney = box(0.9, 1.7, 0.9, darken(roofColor, 0.2));
  chimney.position.set(2.1, h + 1.0, -0.6);
  g.add(chimney);
  [0.28, 0.38, 0.48].forEach((size, i) => {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(size, 12, 10), toon('#fffdf8'));
    puff.position.set(2.1 + i * 0.22, h + 2.1 + i * 0.6, -0.6);
    g.add(puff);
  });

  const doorMesh = box(1.4, 2.2, 0.24, darken(color, 0.4));
  doorMesh.position.set(0, 1.1, d / 2 + 0.06);
  g.add(doorMesh);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), toon('#ffe066'));
  knob.position.set(0.45, 1.1, d / 2 + 0.2);
  g.add(knob);

  const showcase = windowPane(1.6, 1.2);
  showcase.position.set(-2.2, 2.4, d / 2 + 0.06);
  g.add(showcase);
  const porthole = windowPane(1.0, 1.0);
  porthole.position.set(2.3, 2.5, d / 2 + 0.06);
  g.add(porthole);

  const aw = awning(w * 0.95, '#ffe066');
  aw.position.set(0, h * 0.5, d / 2 + 0.55);
  g.add(aw);

  // little menu easel out front
  const easel = new THREE.Group();
  const boardMesh = box(1.1, 1.3, 0.08, '#fffdf8');
  boardMesh.position.y = 1.0;
  boardMesh.rotation.x = -0.12;
  easel.add(boardMesh);
  const menuIcon = emojiSprite('🍕', 0.7);
  menuIcon.position.set(0, 1.05, 0.2);
  easel.add(menuIcon);
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.1, 6), toon('#b98a5e'));
    leg.position.set(side * 0.4, 0.55, -0.08);
    leg.rotation.x = 0.18;
    easel.add(leg);
  }
  easel.position.set(2.7, 0, d / 2 + 1.7);
  easel.rotation.y = -0.4;
  g.add(easel);

  addSigns(g, { emoji: '🍜', label: 'Restaurant', signY: 8.6, h, d });
  return g;
}

export const VENUE_BUILDINGS = [
  { key: 'school', build: schoolBuilding, x: -43, z: 27, w: 10, d: 6.5, emoji: '🏫', label: 'School' },
  { key: 'hospital', build: hospitalBuilding, x: -30, z: 21, w: 10, d: 6.5, emoji: '🏥', label: 'Hospital' },
  { key: 'restaurant', build: restaurantBuilding, x: -22, z: 37, w: 8, d: 5.5, emoji: '🍜', label: 'Restaurant' },
];

/**
 * Helper Square, the south-west civic district: school, hospital and
 * restaurant around a lavender plaza. Returns their doors for main.js.
 */
export function makeCivic(scene) {
  const center = { x: -33, z: 33 };
  const doors = [];
  treeKeepOut.push({ x: center.x, z: center.z, r: 21 });

  const plaza = new THREE.Mesh(new THREE.CircleGeometry(10, 40), toon('#f3e9ff'));
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(center.x, 0.02, center.z);
  plaza.receiveShadow = true;
  scene.add(plaza);
  const inner = new THREE.Mesh(new THREE.CircleGeometry(4, 32), toon('#e7d9ff'));
  inner.rotation.x = -Math.PI / 2;
  inner.position.set(center.x, 0.03, center.z);
  scene.add(inner);

  // flower ring around the plaza edge
  for (let i = 0; i < 7; i++) {
    const flower = makeFlower();
    const a = (i / 7) * Math.PI * 2 + 0.35;
    flower.position.set(center.x + Math.cos(a) * 8.4, 0, center.z + Math.sin(a) * 8.4);
    flower.scale.setScalar(rand(0.9, 1.35));
    scene.add(flower);
  }

  for (const spec of VENUE_BUILDINGS) {
    const building = spec.build();
    building.position.set(spec.x, 0, spec.z);
    // face the plaza centre
    building.rotation.y = Math.atan2(center.x - spec.x, center.z - spec.z);
    shadowify(building);
    scene.add(building);
    const halfW = spec.w / 2;
    const halfD = spec.d / 2;
    colliders.push({ x: spec.x, z: spec.z, r: Math.max(halfW, halfD) + 0.6 });

    const doorDistance = halfD + 1.25;
    doors.push({
      key: spec.key,
      label: spec.label,
      emoji: spec.emoji,
      x: spec.x + Math.sin(building.rotation.y) * doorDistance,
      z: spec.z + Math.cos(building.rotation.y) * doorDistance,
    });
  }

  scene.add(makeSignpost('💖 Helper Square', center.x + 8, center.z - 9));
  return doors;
}
