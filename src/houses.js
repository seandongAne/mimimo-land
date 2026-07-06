import * as THREE from 'three';
import { toon, lighten, darken, shadowify, colliders } from './utils.js';

const INK = '#4a3b5c';

/** Round eye-window: white pane, pupil, ink frame ring. */
function eyeWindow(radius = 0.55) {
  const eye = new THREE.Group();

  const pane = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.12, 20), toon('#ffffff'));
  pane.rotation.x = Math.PI / 2;
  eye.add(pane);

  const pupil = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.45, radius * 0.45, 0.14, 16),
    toon(INK)
  );
  pupil.rotation.x = Math.PI / 2;
  pupil.position.z = 0.02;
  eye.add(pupil);

  const frame = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.09, 8, 24), toon(INK));
  frame.position.z = 0.06;
  eye.add(frame);

  return eye;
}

function door(color, width = 0.75) {
  const group = new THREE.Group();
  const slab = new THREE.Mesh(new THREE.CapsuleGeometry(width, 0.9, 6, 12), toon(color));
  slab.scale.z = 0.3;
  group.add(slab);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), toon('#ffe066'));
  knob.position.set(width * 0.55, 0, width * 0.28);
  group.add(knob);
  return group;
}

function bunnyHouse(color = '#ffc9e3') {
  const house = new THREE.Group();
  const bodyMat = toon(color);

  const body = new THREE.Mesh(new THREE.SphereGeometry(3.6, 24, 18), bodyMat);
  body.position.y = 3.4;
  body.scale.set(1, 1.05, 0.95);
  house.add(body);

  // long ear towers
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.85, 2.6, 6, 12), bodyMat);
    ear.position.set(side * 1.55, 7.7, 0);
    ear.rotation.z = side * -0.12;
    house.add(ear);
    const inner = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.6, 6, 10), toon('#ff9fce'));
    inner.position.set(side * 1.62, 7.75, 0.5);
    inner.rotation.z = side * -0.12;
    inner.scale.z = 0.45;
    house.add(inner);
  }

  for (const side of [-1, 1]) {
    const eye = eyeWindow(0.55);
    eye.position.set(side * 1.35, 4.5, 3.1);
    eye.rotation.x = -0.12;
    house.add(eye);
  }

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.35, 3), toon('#ff7fb5'));
  nose.position.set(0, 3.9, 3.42);
  nose.rotation.x = Math.PI / 2;
  house.add(nose);

  for (const side of [-1, 1]) {
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.5, 0.14), toon('#ffffff'));
    tooth.position.set(side * 0.2, 3.35, 3.35);
    house.add(tooth);
  }

  const frontDoor = door(darken(color, 0.35), 0.75);
  frontDoor.position.set(0, 1.15, 2.75);
  house.add(frontDoor);

  return house;
}

function kittyHouse(color = '#ffd9a1') {
  const house = new THREE.Group();
  const bodyMat = toon(color);

  const body = new THREE.Mesh(new THREE.SphereGeometry(3.8, 24, 18), bodyMat);
  body.position.y = 3.1;
  body.scale.set(1, 0.95, 1);
  house.add(body);

  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(1.25, 2.1, 4), bodyMat);
    ear.position.set(side * 2.0, 7.0, 0);
    ear.rotation.y = Math.PI / 4;
    ear.rotation.z = side * -0.18;
    house.add(ear);
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.2, 4), toon('#ff9fce'));
    inner.position.set(side * 2.0, 6.75, 0.45);
    inner.rotation.y = Math.PI / 4;
    inner.rotation.z = side * -0.18;
    house.add(inner);
  }

  for (const side of [-1, 1]) {
    const eye = eyeWindow(0.6);
    eye.position.set(side * 1.45, 4.3, 3.3);
    eye.rotation.x = -0.1;
    house.add(eye);
  }

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.32, 3), toon('#ff7fb5'));
  nose.position.set(0, 3.7, 3.72);
  nose.rotation.x = Math.PI / 2;
  nose.rotation.z = Math.PI;
  house.add(nose);

  const whiskerMat = toon(INK);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const whisker = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.07, 0.07), whiskerMat);
      whisker.position.set(side * 2.4, 3.6 + i * 0.35, 2.75);
      whisker.rotation.z = side * (i - 1) * 0.18;
      whisker.rotation.y = side * -0.5;
      house.add(whisker);
    }
  }

  const tail = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.42, 10, 24, Math.PI * 0.85), toon(lighten(color, 0.2)));
  tail.position.set(3.7, 1.6, -0.6);
  tail.rotation.y = Math.PI / 2;
  tail.rotation.z = 0.3;
  house.add(tail);

  const frontDoor = door(darken(color, 0.35), 0.75);
  frontDoor.position.set(0, 1.15, 3.15);
  house.add(frontDoor);

  return house;
}

function froggyHouse(color = '#8ee08e') {
  const house = new THREE.Group();
  const bodyMat = toon(color);

  const body = new THREE.Mesh(new THREE.SphereGeometry(3.7, 24, 18), bodyMat);
  body.position.y = 2.9;
  body.scale.set(1.05, 0.85, 1);
  house.add(body);

  for (const side of [-1, 1]) {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1.15, 16, 12), bodyMat);
    dome.position.set(side * 1.75, 5.9, 0.5);
    house.add(dome);
    const eye = eyeWindow(0.5);
    eye.position.set(side * 1.75, 5.95, 1.5);
    eye.rotation.x = -0.15;
    house.add(eye);
  }

  for (const side of [-1, 1]) {
    const blush = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), toon('#ffa8c5'));
    blush.position.set(side * 2.7, 3.1, 2.4);
    blush.scale.set(1, 0.7, 0.5);
    house.add(blush);
  }

  const mouth = new THREE.Mesh(new THREE.CapsuleGeometry(0.85, 1.7, 6, 12), toon(darken(color, 0.45)));
  mouth.rotation.z = Math.PI / 2;
  mouth.scale.set(0.8, 1, 0.3);
  mouth.position.set(0, 1.15, 3.3);
  house.add(mouth);

  const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.1, 20), toon('#5fcf9a'));
  pad.position.set(0, 0.05, 5.2);
  pad.receiveShadow = true;
  house.add(pad);

  return house;
}

function puppyHouse(color = '#e8c9a0') {
  const house = new THREE.Group();
  const bodyMat = toon(color);

  const body = new THREE.Mesh(new THREE.SphereGeometry(3.7, 24, 18), bodyMat);
  body.position.y = 3.2;
  body.scale.set(1, 0.98, 1);
  house.add(body);

  // big floppy ears drooping down the sides
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.CapsuleGeometry(1.05, 2.4, 6, 12), toon(darken(color, 0.22)));
    ear.position.set(side * 3.1, 3.7, 0);
    ear.rotation.z = side * 0.5;
    ear.scale.set(0.8, 1, 0.6);
    house.add(ear);
  }

  for (const side of [-1, 1]) {
    const eye = eyeWindow(0.55);
    eye.position.set(side * 1.35, 4.4, 3.2);
    eye.rotation.x = -0.12;
    house.add(eye);
  }

  const snout = new THREE.Mesh(new THREE.SphereGeometry(1.15, 16, 12), toon(lighten(color, 0.35)));
  snout.position.set(0, 3.1, 3.4);
  snout.scale.set(1.1, 0.9, 0.9);
  house.add(snout);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 10), toon(INK));
  nose.position.set(0, 3.55, 4.45);
  house.add(nose);

  const frontDoor = door(darken(color, 0.32), 0.78);
  frontDoor.position.set(0, 1.15, 2.9);
  house.add(frontDoor);

  const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 1.4, 6, 10), bodyMat);
  tail.position.set(0, 3.6, -3.3);
  tail.rotation.x = -0.9;
  house.add(tail);

  return house;
}

function bearHouse(color = '#c9a27a') {
  const house = new THREE.Group();
  const bodyMat = toon(color);

  const body = new THREE.Mesh(new THREE.SphereGeometry(3.9, 24, 18), bodyMat);
  body.position.y = 3.2;
  house.add(body);

  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(1.15, 16, 12), bodyMat);
    ear.position.set(side * 2.5, 6.4, 0);
    house.add(ear);
    const inner = new THREE.Mesh(new THREE.SphereGeometry(0.62, 12, 10), toon(lighten(color, 0.4)));
    inner.position.set(side * 2.5, 6.5, 0.7);
    house.add(inner);
  }

  for (const side of [-1, 1]) {
    const eye = eyeWindow(0.55);
    eye.position.set(side * 1.4, 4.4, 3.4);
    eye.rotation.x = -0.1;
    house.add(eye);
  }

  const snout = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 12), toon(lighten(color, 0.45)));
  snout.position.set(0, 3.2, 3.5);
  snout.scale.set(1, 0.85, 0.85);
  house.add(snout);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), toon(INK));
  nose.position.set(0, 3.7, 4.5);
  house.add(nose);

  const frontDoor = door(darken(color, 0.3), 0.8);
  frontDoor.position.set(0, 1.15, 3.0);
  house.add(frontDoor);

  return house;
}

function duckyHouse(color = '#ffe27a') {
  const house = new THREE.Group();
  const bodyMat = toon(color);

  const body = new THREE.Mesh(new THREE.SphereGeometry(3.7, 24, 18), bodyMat);
  body.position.y = 3.1;
  house.add(body);

  // head-tuft feathers
  for (let i = -1; i <= 1; i++) {
    const feather = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 1.0, 6, 10), bodyMat);
    feather.position.set(i * 0.5, 7.0, 0);
    feather.rotation.z = i * 0.4;
    house.add(feather);
  }

  for (const side of [-1, 1]) {
    const eye = eyeWindow(0.5);
    eye.position.set(side * 1.2, 4.7, 3.35);
    eye.rotation.x = -0.1;
    house.add(eye);
  }

  // big beak awning above the door
  const beak = new THREE.Mesh(new THREE.ConeGeometry(1.4, 1.9, 12), toon('#ffab4a'));
  beak.position.set(0, 3.2, 3.9);
  beak.rotation.x = Math.PI / 2;
  beak.scale.set(1, 1, 0.5);
  house.add(beak);

  // little wing bumps
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.SphereGeometry(1.1, 14, 10), bodyMat);
    wing.position.set(side * 3.4, 2.7, 0);
    wing.scale.set(0.35, 1, 0.8);
    house.add(wing);
  }

  const frontDoor = door(darken(color, 0.3), 0.78);
  frontDoor.position.set(0, 1.15, 3.0);
  house.add(frontDoor);

  return house;
}

function foxyHouse(color = '#ff9a56') {
  const house = new THREE.Group();
  const bodyMat = toon(color);

  const body = new THREE.Mesh(new THREE.SphereGeometry(3.6, 24, 18), bodyMat);
  body.position.y = 3.1;
  house.add(body);

  // big pointy ears with dark tips
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2.6, 10), bodyMat);
    ear.position.set(side * 1.9, 6.7, 0);
    ear.rotation.z = side * -0.16;
    house.add(ear);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.0, 8), toon(INK));
    tip.position.set(side * 2.05, 7.5, 0.02);
    tip.rotation.z = side * -0.16;
    house.add(tip);
  }

  for (const side of [-1, 1]) {
    const eye = eyeWindow(0.5);
    eye.position.set(side * 1.3, 4.3, 3.3);
    eye.rotation.x = -0.1;
    house.add(eye);
  }

  // white pointy snout
  const snout = new THREE.Mesh(new THREE.ConeGeometry(1.05, 2.3, 12), toon('#fff4ea'));
  snout.position.set(0, 3.0, 4.0);
  snout.rotation.x = Math.PI / 2;
  snout.scale.set(1, 1, 0.7);
  house.add(snout);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), toon(INK));
  nose.position.set(0, 3.0, 5.15);
  house.add(nose);

  // bushy tail curling round the side
  const tail = new THREE.Mesh(new THREE.SphereGeometry(1.6, 16, 12), bodyMat);
  tail.position.set(3.6, 1.9, -1.4);
  tail.scale.set(0.7, 0.7, 1.4);
  house.add(tail);
  const tailTip = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 10), toon('#fff4ea'));
  tailTip.position.set(4.2, 3.0, -1.4);
  house.add(tailTip);

  const frontDoor = door(darken(color, 0.3), 0.78);
  frontDoor.position.set(0, 1.15, 2.95);
  house.add(frontDoor);

  return house;
}

function piggyHouse(color = '#ffc2d4') {
  const house = new THREE.Group();
  const bodyMat = toon(color);

  const body = new THREE.Mesh(new THREE.SphereGeometry(3.8, 24, 18), bodyMat);
  body.position.y = 3.1;
  house.add(body);

  // triangle ears flopping forward
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.95, 1.4, 3), toon(darken(color, 0.12)));
    ear.position.set(side * 1.7, 6.3, 0.4);
    ear.rotation.x = 0.5;
    ear.rotation.z = side * -0.2;
    house.add(ear);
  }

  for (const side of [-1, 1]) {
    const eye = eyeWindow(0.5);
    eye.position.set(side * 1.35, 4.3, 3.4);
    eye.rotation.x = -0.1;
    house.add(eye);
  }

  // big round snout with two nostril windows
  const snout = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.7, 20), toon(lighten(color, 0.25)));
  snout.rotation.x = Math.PI / 2;
  snout.position.set(0, 3.0, 3.8);
  house.add(snout);
  for (const side of [-1, 1]) {
    const nostril = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.2, 12), toon(darken(color, 0.4)));
    nostril.rotation.x = Math.PI / 2;
    nostril.position.set(side * 0.45, 3.0, 4.2);
    house.add(nostril);
  }

  // curly tail
  const tail = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.16, 8, 20, Math.PI * 1.6), bodyMat);
  tail.position.set(0, 3.2, -3.7);
  tail.rotation.y = Math.PI / 2;
  house.add(tail);

  const frontDoor = door(darken(color, 0.28), 0.78);
  frontDoor.position.set(0, 1.15, 3.0);
  house.add(frontDoor);

  return house;
}

/**
 * The animal village. Each entry knows where its door is (local +z), so the
 * game can let a mimimo walk up and go inside. Registers colliders too.
 */
const HOUSES = [
  { key: 'ducky', build: duckyHouse, x: -22, z: -14, r: 5.0, door: 3.0 },
  { key: 'piggy', build: piggyHouse, x: 22, z: -14, r: 5.2, door: 3.0 },
  { key: 'bunny', build: bunnyHouse, x: -34, z: -25, r: 5.2, door: 2.75 },
  { key: 'kitty', build: kittyHouse, x: -15, z: -28, r: 5.4, door: 3.15 },
  { key: 'puppy', build: puppyHouse, x: 15, z: -28, r: 5.2, door: 2.9 },
  { key: 'bear', build: bearHouse, x: 34, z: -25, r: 5.4, door: 3.0 },
  { key: 'froggy', build: froggyHouse, x: -7, z: -39, r: 5.2, door: 3.3 },
  { key: 'foxy', build: foxyHouse, x: 8, z: -39, r: 5.2, door: 2.95 },
];

/**
 * Build the village. Returns an array of {key, x, z, angle, doorWorld}
 * describing each house's door so the "go inside" system can use them.
 */
export function makeHouses(scene) {
  const doors = [];
  for (const spec of HOUSES) {
    const house = spec.build();
    house.position.set(spec.x, 0, spec.z);
    // face the spawn point (0, 0, 6)
    const angle = Math.atan2(0 - spec.x, 6 - spec.z);
    house.rotation.y = angle;
    shadowify(house);
    scene.add(house);
    colliders.push({ x: spec.x, z: spec.z, r: spec.r });

    // world position just outside the door (a bit beyond the collider)
    const reach = spec.door + 1.4;
    doors.push({
      key: spec.key,
      x: spec.x + Math.sin(angle) * reach,
      z: spec.z + Math.cos(angle) * reach,
    });
  }
  return doors;
}
