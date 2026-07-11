import * as THREE from 'three';
import { toon, lighten, rand, pick, shadowify } from './utils.js';
import { buildMimimo, animateMimimo, disposeMimimo } from './mimimo.js';

const BOUNDS = { halfX: 11, halfZ: 8 };
const FISH_COLORS = ['#ff8fc7', '#ffe066', '#8ee08e', '#7ad0ff', '#b79cff', '#ffb46b'];
const CORAL_COLORS = ['#ff6f91', '#ff9f68', '#b883ff', '#ffe066'];

function makeFish(color) {
  const fish = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10), toon(color));
  body.scale.set(1.45, 0.75, 0.55);
  fish.add(body);

  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.55, 3), toon(lighten(color, 0.28)));
  tail.position.x = -0.72;
  tail.rotation.z = -Math.PI / 2;
  fish.add(tail);

  const fin = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.35, 3), toon(lighten(color, 0.35)));
  fin.position.set(0, 0.32, 0);
  fish.add(fin);

  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 6), toon('#263553'));
  eye.position.set(0.42, 0.1, 0.3);
  fish.add(eye);
  return fish;
}

function makeShark() {
  const shark = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.72, 16, 12), toon('#7c9aaa'));
  body.scale.set(2.1, 0.72, 0.72);
  shark.add(body);

  const snout = new THREE.Mesh(new THREE.ConeGeometry(0.48, 0.9, 12), toon('#8eabb8'));
  snout.position.x = 1.72;
  snout.rotation.z = -Math.PI / 2;
  shark.add(snout);

  for (const y of [-0.28, 0.28]) {
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.95, 3), toon('#6e8b9c'));
    tail.position.set(-1.65, y, 0);
    tail.rotation.z = Math.PI / 2 + y * 0.35;
    shark.add(tail);
  }

  const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.9, 3), toon('#6e8b9c'));
  dorsal.position.set(-0.15, 0.72, 0);
  shark.add(dorsal);

  for (const z of [-0.45, 0.45]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), toon('#1c2940'));
    eye.position.set(0.95, 0.18, z);
    shark.add(eye);
  }
  return shark;
}

function makeCoral(color) {
  const coral = new THREE.Group();
  const mat = toon(color);
  const branches = [
    [0, 0.9, 0, 1.8, 0],
    [-0.38, 0.65, 0, 1.2, -0.38],
    [0.38, 0.75, 0.05, 1.4, 0.42],
    [-0.55, 0.42, 0.1, 0.8, -0.62],
    [0.58, 0.45, -0.08, 0.9, 0.62],
  ];
  for (const [x, y, z, h, rz] of branches) {
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, h, 8), mat);
    branch.position.set(x, y, z);
    branch.rotation.z = rz;
    coral.add(branch);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.15, 9, 7), mat);
    tip.position.set(x - Math.sin(rz) * h * 0.48, y + Math.cos(rz) * h * 0.48, z);
    coral.add(tip);
  }
  return coral;
}

function buildEnvironment(scene, swimmers, bubbles) {
  scene.background = new THREE.Color('#167aa9');
  scene.fog = new THREE.FogExp2('#12688f', 0.035);
  scene.add(new THREE.HemisphereLight('#c8f5ff', '#16466f', 1.25));
  const light = new THREE.DirectionalLight('#d9fbff', 1.5);
  light.position.set(-6, 12, 7);
  scene.add(light);

  const sand = new THREE.Mesh(new THREE.BoxGeometry(26, 0.6, 20), toon('#f0d69c'));
  sand.position.y = -0.3;
  sand.receiveShadow = true;
  scene.add(sand);

  const surface = new THREE.Mesh(
    new THREE.PlaneGeometry(26, 20, 16, 12),
    new THREE.MeshBasicMaterial({ color: '#9ce8ff', transparent: true, opacity: 0.32, side: THREE.DoubleSide })
  );
  surface.rotation.x = Math.PI / 2;
  surface.position.y = 6;
  scene.add(surface);

  for (let i = 0; i < 14; i++) {
    const coral = makeCoral(pick(CORAL_COLORS));
    const side = i % 2 ? -1 : 1;
    coral.position.set(side * rand(7.2, 10.3), 0, rand(-7, 7));
    coral.scale.setScalar(rand(0.7, 1.35));
    shadowify(coral);
    scene.add(coral);
  }
  for (let i = 0; i < 16; i++) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rand(0.25, 0.7), 0), toon(pick(['#b9b0a0', '#a8bdad', '#c5aa9b'])));
    rock.position.set(rand(-10, 10), rand(0.05, 0.25), rand(-7.5, 7.5));
    rock.scale.y = rand(0.5, 0.9);
    scene.add(rock);
  }

  for (let i = 0; i < 11; i++) {
    const fish = makeFish(pick(FISH_COLORS));
    const direction = i % 2 ? -1 : 1;
    fish.position.set(rand(-10, 10), rand(1.1, 4.8), rand(-7, 7));
    fish.rotation.y = direction > 0 ? 0 : Math.PI;
    fish.userData.swim = { direction, speed: rand(0.8, 1.8), phase: rand(0, Math.PI * 2) };
    scene.add(fish);
    swimmers.push(fish);
  }

  for (let i = 0; i < 2; i++) {
    const shark = makeShark();
    const direction = i ? -1 : 1;
    shark.position.set(direction * -8, 2.4 + i * 1.4, i ? -4.8 : 4.5);
    shark.rotation.y = direction > 0 ? 0 : Math.PI;
    shark.userData.swim = { direction, speed: 0.7 + i * 0.18, phase: i * Math.PI, shark: true };
    scene.add(shark);
    swimmers.push(shark);
  }

  for (let i = 0; i < 28; i++) {
    const bubble = new THREE.Mesh(
      new THREE.SphereGeometry(rand(0.04, 0.13), 8, 6),
      new THREE.MeshBasicMaterial({ color: '#e8fbff', transparent: true, opacity: 0.55, wireframe: true })
    );
    bubble.position.set(rand(-10, 10), rand(0.4, 5.8), rand(-7, 7));
    bubble.userData.rise = rand(0.25, 0.75);
    scene.add(bubble);
    bubbles.push(bubble);
  }
}

export function makeUnderwater() {
  const scene = new THREE.Scene();
  const swimmers = [];
  const bubbles = [];
  buildEnvironment(scene, swimmers, bubbles);

  let player = null;
  let heading = Math.PI;

  function enter(config) {
    if (player) disposeMimimo(player);
    player = buildMimimo(config);
    player.userData.anim.baseY = 1.25;
    player.position.set(0, 1.25, 5.5);
    player.rotation.y = Math.PI;
    scene.add(player);
  }

  function exit() {
    // The scene stays warm between visits; enter() refreshes the player model.
  }

  function update(dt, t, move) {
    if (player) {
      const moving = Math.hypot(move.x, move.z) > 0.05;
      if (moving) {
        player.position.x += move.x * 3.8 * dt;
        player.position.z += move.z * 3.8 * dt;
        player.position.x = THREE.MathUtils.clamp(player.position.x, -BOUNDS.halfX, BOUNDS.halfX);
        player.position.z = THREE.MathUtils.clamp(player.position.z, -BOUNDS.halfZ, BOUNDS.halfZ);
        heading = Math.atan2(move.x, move.z);
      }
      let delta = heading - player.rotation.y;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      player.rotation.y += delta * Math.min(1, dt * 7);
      animateMimimo(player, t * 0.8, dt, moving);
    }

    for (const swimmer of swimmers) {
      const swim = swimmer.userData.swim;
      swimmer.position.x += swim.direction * swim.speed * dt;
      swimmer.position.y += Math.sin(t * 1.5 + swim.phase) * dt * (swim.shark ? 0.08 : 0.18);
      swimmer.rotation.z = Math.sin(t * 3 + swim.phase) * 0.035;
      if (swim.direction > 0 && swimmer.position.x > 12.5) swimmer.position.x = -12.5;
      if (swim.direction < 0 && swimmer.position.x < -12.5) swimmer.position.x = 12.5;
    }

    for (const bubble of bubbles) {
      bubble.position.y += bubble.userData.rise * dt;
      if (bubble.position.y > 6) bubble.position.y = 0.25;
    }
  }

  function getPlayerPos() {
    return player ? player.position : new THREE.Vector3();
  }

  return { scene, enter, exit, update, getPlayerPos };
}
