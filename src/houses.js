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

  // buck-tooth windows below the nose
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

  // whiskers
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

  // curled tail hugging the side
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

  // bulgy eye domes on top
  for (const side of [-1, 1]) {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1.15, 16, 12), bodyMat);
    dome.position.set(side * 1.75, 5.9, 0.5);
    house.add(dome);
    const eye = eyeWindow(0.5);
    eye.position.set(side * 1.75, 5.95, 1.5);
    eye.rotation.x = -0.15;
    house.add(eye);
  }

  // blush
  for (const side of [-1, 1]) {
    const blush = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), toon('#ffa8c5'));
    blush.position.set(side * 2.7, 3.1, 2.4);
    blush.scale.set(1, 0.7, 0.5);
    house.add(blush);
  }

  // wide smiling mouth-door
  const mouth = new THREE.Mesh(new THREE.CapsuleGeometry(0.85, 1.7, 6, 12), toon(darken(color, 0.45)));
  mouth.rotation.z = Math.PI / 2;
  mouth.scale.set(0.8, 1, 0.3);
  mouth.position.set(0, 1.15, 3.3);
  house.add(mouth);

  // lily-pad doormat
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.1, 20), toon('#5fcf9a'));
  pad.position.set(0, 0.05, 5.2);
  pad.receiveShadow = true;
  house.add(pad);

  return house;
}

const HOUSES = [
  { build: bunnyHouse, x: -16, z: -18, r: 5.2 },
  { build: kittyHouse, x: 2, z: -25, r: 5.4 },
  { build: froggyHouse, x: 17, z: -15, r: 5.2 },
];

/** The animal village. Registers colliders so the player can't walk through walls. */
export function makeHouses(scene) {
  for (const spec of HOUSES) {
    const house = spec.build();
    house.position.set(spec.x, 0, spec.z);
    // face the spawn point (0, 0, 6)
    house.rotation.y = Math.atan2(0 - spec.x, 6 - spec.z);
    shadowify(house);
    scene.add(house);
    colliders.push({ x: spec.x, z: spec.z, r: spec.r });
  }
}
