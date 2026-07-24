import * as THREE from 'three';
import { toon, rand, pick, shadowify, treeKeepOut, emojiSprite, textSprite } from './utils.js';
import { buildMimimo, animateMimimo, disposeMimimo } from './mimimo.js';

const GATE = { x: 14, z: -18 };
const BOUNDS = { halfX: 11, halfZ: 8 };
const RAINBOW_BANDS = ['#ff8f8f', '#ffb46b', '#ffe066', '#8ee08e', '#7ad0ff', '#b79cff'];

const RESIDENT_CHATTER = [
  'We live up here! ☁️', 'So soft and fluffy!', 'Catch a star with me! ⭐',
  'Welcome to Cloudland! 🌈', 'The sun tells the best jokes!', 'Nap time on a cloud? 💤',
];

function puffCluster(count, spread, size) {
  const g = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(rand(size * 0.7, size), 14, 10), toon('#ffffff'));
    puff.position.set(rand(-spread, spread), rand(-size * 0.3, size * 0.3), rand(-spread, spread));
    puff.scale.y = 0.7;
    g.add(puff);
  }
  return g;
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

  // a mini rainbow arcing over the cloud
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
 * Cloudland: a dreamy island in the sky where fairy and unicorn mimimos
 * live. Mythical players float up here to bounce on clouds with them.
 */
export function makeCloudland() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#9fd4ff');
  scene.fog = new THREE.Fog('#b8e2ff', 30, 95);
  scene.add(new THREE.HemisphereLight('#fffbe8', '#9fc4ff', 1.3));
  const light = new THREE.DirectionalLight('#fff6d8', 1.5);
  light.position.set(8, 14, 6);
  light.castShadow = true;
  scene.add(light);

  // the big walkable cloud island
  const island = new THREE.Mesh(new THREE.CylinderGeometry(14, 11, 1.4, 36), toon('#ffffff'));
  island.position.y = -0.7;
  island.receiveShadow = true;
  scene.add(island);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const rim = new THREE.Mesh(new THREE.SphereGeometry(rand(1.2, 2.2), 14, 10), toon('#ffffff'));
    rim.position.set(Math.cos(a) * 13, rand(-0.4, 0.2), Math.sin(a) * 13);
    rim.scale.y = 0.65;
    scene.add(rim);
  }

  // cloud cottage where the residents live
  const cottage = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(3.2, 20, 16), toon('#fffdf8'));
  body.position.y = 2.6;
  body.scale.set(1.1, 0.95, 1);
  cottage.add(body);
  const roofPuffs = puffCluster(4, 1.4, 1.0);
  roofPuffs.position.y = 5.4;
  cottage.add(roofPuffs);
  const door = new THREE.Mesh(new THREE.CapsuleGeometry(0.7, 0.9, 6, 12), toon('#b79cff'));
  door.scale.z = 0.3;
  door.position.set(0, 1.15, 3.0);
  cottage.add(door);
  for (const side of [-1, 1]) {
    const win = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.15, 18), toon('#ffe066'));
    win.rotation.x = Math.PI / 2;
    win.position.set(side * 1.5, 3.4, 2.85);
    cottage.add(win);
  }
  RAINBOW_BANDS.forEach((color, i) => {
    const arc = new THREE.Mesh(
      new THREE.TorusGeometry(1.6 - i * 0.14, 0.09, 8, 24, Math.PI),
      new THREE.MeshBasicMaterial({ color })
    );
    arc.position.set(0, 2.0, 3.0);
    cottage.add(arc);
  });
  cottage.position.set(-5.5, 0, -4.5);
  cottage.rotation.y = 0.6;
  shadowify(cottage);
  scene.add(cottage);

  // a big rainbow on the horizon + drifting background clouds
  const horizon = new THREE.Group();
  RAINBOW_BANDS.forEach((color, i) => {
    const arc = new THREE.Mesh(
      new THREE.TorusGeometry(15 - i * 0.9, 0.45, 8, 44, Math.PI),
      new THREE.MeshBasicMaterial({ color, fog: false })
    );
    horizon.add(arc);
  });
  horizon.position.set(18, -2, -46);
  scene.add(horizon);

  const drifters = [];
  for (let i = 0; i < 8; i++) {
    const cloud = puffCluster(4, 1.8, 1.1);
    cloud.position.set(rand(-34, 34), rand(3, 12), rand(-38, -16));
    cloud.userData.speed = rand(0.3, 0.9);
    scene.add(cloud);
    drifters.push(cloud);
  }

  // twinkling stars you can almost touch
  const stars = [];
  for (let i = 0; i < 12; i++) {
    const star = emojiSprite(pick(['⭐', '🌟', '✨']), rand(0.5, 0.9));
    star.position.set(rand(-10, 10), rand(2.5, 6.5), rand(-7, 7));
    star.userData.phase = rand(0, Math.PI * 2);
    star.userData.baseY = star.position.y;
    scene.add(star);
    stars.push(star);
  }

  // the mimimos who live here
  const residents = [];
  const residentSpecs = [
    { species: 'fairy', color: '#c9a2ff', name: 'Twinkle' },
    { species: 'unicorn', color: '#fdf3e7', name: 'Starmane' },
  ];
  for (const spec of residentSpecs) {
    const resident = buildMimimo({ species: spec.species, color: spec.color, shape: 'classic' });
    resident.position.set(rand(-4, 4), 0, rand(-2, 3));
    scene.add(resident);
    const tag = textSprite(spec.name);
    tag.position.y = 2.5;
    resident.add(tag);
    resident.userData.ai = { target: null, wait: rand(0, 2), chat: rand(2, 6) };
    residents.push(resident);
  }
  const _dir = new THREE.Vector3();

  function setResidentBubble(resident, text) {
    if (resident.userData.bubble) {
      resident.remove(resident.userData.bubble);
      resident.userData.bubble.material.map.dispose();
      resident.userData.bubble.material.dispose();
    }
    const bubble = textSprite(text, { fontSize: 36 });
    bubble.position.y = 3.1;
    resident.add(bubble);
    resident.userData.bubble = bubble;
    resident.userData.bubbleTime = 2.6;
  }

  let player = null;
  let heading = Math.PI;

  function enter(config) {
    if (player) disposeMimimo(player);
    player = buildMimimo(config);
    player.position.set(0, 0, 5.5);
    player.rotation.y = Math.PI;
    scene.add(player);
    for (const resident of residents) setResidentBubble(resident, 'Welcome to Cloudland! 🌈');
  }

  function update(dt, t, move) {
    if (player) {
      const moving = Math.hypot(move.x, move.z) > 0.05;
      if (moving) {
        player.position.x += move.x * 4.2 * dt;
        player.position.z += move.z * 4.2 * dt;
        player.position.x = THREE.MathUtils.clamp(player.position.x, -BOUNDS.halfX, BOUNDS.halfX);
        player.position.z = THREE.MathUtils.clamp(player.position.z, -BOUNDS.halfZ, BOUNDS.halfZ);
        heading = Math.atan2(move.x, move.z);
      }
      let delta = heading - player.rotation.y;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      player.rotation.y += delta * Math.min(1, dt * 8);
      // extra bouncy walk, like the ground is made of marshmallow
      player.position.y = Math.abs(Math.sin(t * 3.2)) * 0.18;
      animateMimimo(player, t, dt, moving);
    }

    for (const resident of residents) {
      const ai = resident.userData.ai;
      let moving = false;
      if (ai.wait > 0) {
        ai.wait -= dt;
      } else if (!ai.target) {
        ai.target = new THREE.Vector3(rand(-8, 8), 0, rand(-6, 6));
      } else {
        _dir.subVectors(ai.target, resident.position);
        _dir.y = 0;
        if (_dir.length() < 0.3) {
          ai.target = null;
          ai.wait = rand(1.5, 4);
        } else {
          _dir.normalize();
          resident.position.addScaledVector(_dir, dt * 1.4);
          const target = Math.atan2(_dir.x, _dir.z);
          let dr = target - resident.rotation.y;
          while (dr > Math.PI) dr -= Math.PI * 2;
          while (dr < -Math.PI) dr += Math.PI * 2;
          resident.rotation.y += dr * Math.min(1, dt * 5);
          moving = true;
        }
      }
      ai.chat -= dt;
      if (ai.chat <= 0) {
        ai.chat = rand(5, 11);
        if (resident.userData.bubbleTime <= 0) setResidentBubble(resident, pick(RESIDENT_CHATTER));
      }
      if (resident.userData.bubbleTime > 0) {
        resident.userData.bubbleTime -= dt;
        if (resident.userData.bubbleTime <= 0 && resident.userData.bubble) {
          resident.remove(resident.userData.bubble);
          resident.userData.bubble.material.map.dispose();
          resident.userData.bubble.material.dispose();
          resident.userData.bubble = null;
        }
      }
      animateMimimo(resident, t + resident.id, dt, moving);
    }

    for (const cloud of drifters) {
      cloud.position.x += cloud.userData.speed * dt;
      if (cloud.position.x > 36) cloud.position.x = -36;
    }
    for (const star of stars) {
      star.position.y = star.userData.baseY + Math.sin(t * 1.4 + star.userData.phase) * 0.3;
      star.material.opacity = 0.7 + Math.sin(t * 2.2 + star.userData.phase) * 0.3;
    }
  }

  function getPlayerPos() {
    return player ? player.position : new THREE.Vector3();
  }

  return { scene, gate: GATE, enter, update, getPlayerPos };
}
