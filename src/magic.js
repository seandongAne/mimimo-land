import * as THREE from 'three';
import { makeFlower } from './world.js';
import { rand, pick, emojiSprite } from './utils.js';

const SPARKLE_COLORS = ['#ff8fc7', '#ffe066', '#7ad0ff', '#b79cff', '#8ee08e', '#ffffff'];
const RAINBOW_COLORS = ['#ff8f8f', '#ffb46b', '#ffe066', '#8ee08e', '#7ad0ff', '#b79cff'];

export const POWERS = {
  blossom: { label: 'Flower bloom', shortLabel: 'Bloom', emoji: '🌸' },
  rainbow: { label: 'Rainbow rings', shortLabel: 'Rainbow', emoji: '🌈' },
  bubbles: { label: 'Bubble float', shortLabel: 'Bubbles', emoji: '🫧' },
  hearts: { label: 'Heart shower', shortLabel: 'Hearts', emoji: '💖' },
  levitation: { label: 'Levitation', shortLabel: 'Levitate', emoji: '🪄' },
  teleport: { label: 'Teleportation', shortLabel: 'Teleport', emoji: '💫' },
  water: { label: 'Water magic', shortLabel: 'Water', emoji: '💧' },
  fire: { label: 'Fire magic', shortLabel: 'Fire', emoji: '🔥' },
  cloud: { label: 'Cloud magic', shortLabel: 'Cloud', emoji: '☁️' },
  leaves: { label: 'Leaf magic', shortLabel: 'Leaves', emoji: '🍃' },
};

let sparkleTexture = null;
function getSparkleTexture() {
  if (sparkleTexture) return sparkleTexture;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  // four-point sparkle
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(32, 2);
  ctx.quadraticCurveTo(36, 28, 62, 32);
  ctx.quadraticCurveTo(36, 36, 32, 62);
  ctx.quadraticCurveTo(28, 36, 2, 32);
  ctx.quadraticCurveTo(28, 28, 32, 2);
  ctx.fill();
  sparkleTexture = new THREE.CanvasTexture(canvas);
  return sparkleTexture;
}

/**
 * Casting magic bursts sparkles, sends out a pink ring,
 * and makes candy flowers grow where the magic lands.
 */
export class Magic {
  constructor(scene) {
    this.scene = scene;
    this.bursts = [];
    this.rings = [];
    this.flowers = [];
    this.floaters = [];
  }

  cast(position, power = 'blossom') {
    this.spawnBurst(position);
    if (power === 'rainbow') {
      RAINBOW_COLORS.forEach((color, i) => this.spawnRing(position, color, 0.55 + i * 0.16));
    } else if (power === 'bubbles') {
      this.spawnRing(position, '#bfeaff');
      for (let i = 0; i < 18; i++) this.spawnBubble(position);
    } else if (power === 'hearts') {
      this.spawnRing(position, '#ff8fc7');
      for (let i = 0; i < 14; i++) this.spawnHeart(position);
    } else if (power === 'levitation') {
      this.spawnRing(position, '#b79cff', 0.55);
      this.spawnRing(position, '#e5d7ff', 0.85);
      this.spawnEmojis(position, ['✨', '🪽'], { count: 12, upMin: 1.8, upMax: 3.5 });
    } else if (power === 'teleport') {
      this.spawnRing(position, '#8a6cff', 0.45);
      this.spawnRing(position, '#ff8fc7', 0.75);
      this.spawnEmojis(position, ['💫', '✨'], { count: 14, outMax: 3.8, upMin: 0.8, upMax: 3.2 });
    } else if (power === 'water') {
      this.spawnRing(position, '#4fc3f7', 0.5);
      this.spawnRing(position, '#bfeaff', 0.8);
      this.spawnEmojis(position, ['💧', '🫧'], { count: 20, outMax: 3.4, upMin: 1.4, upMax: 4.2 });
    } else if (power === 'fire') {
      this.spawnRing(position, '#ff7043', 0.55);
      this.spawnEmojis(position, ['🔥', '✨'], { count: 18, outMax: 2.7, upMin: 2.1, upMax: 4.8 });
    } else if (power === 'cloud') {
      this.spawnRing(position, '#d9f3ff', 0.65);
      this.spawnEmojis(position, ['☁️', '☁️', '✨'], { count: 13, outMax: 2.3, upMin: 1.1, upMax: 2.4, sizeMin: 0.55, sizeMax: 1.05 });
    } else if (power === 'leaves') {
      this.spawnRing(position, '#72c96b', 0.6);
      this.spawnEmojis(position, ['🍃', '🍂', '🌿'], { count: 22, outMax: 4.1, upMin: 1.5, upMax: 4.4 });
    } else {
      this.spawnRing(position, '#ff9fce');
      const count = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        const a = rand(0, Math.PI * 2);
        const d = rand(1.2, 3);
        this.spawnFlower(position.x + Math.cos(a) * d, position.z + Math.sin(a) * d);
      }
    }
  }

  spawnBurst(position) {
    const count = 46;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities = [];
    const color = new THREE.Color();

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x + rand(-0.2, 0.2);
      positions[i * 3 + 1] = position.y + rand(0.4, 1.4);
      positions[i * 3 + 2] = position.z + rand(-0.2, 0.2);
      color.set(pick(SPARKLE_COLORS));
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      const a = rand(0, Math.PI * 2);
      const up = rand(2.5, 5.5);
      const out = rand(0.5, 2.6);
      velocities.push(new THREE.Vector3(Math.cos(a) * out, up, Math.sin(a) * out));
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.34,
      map: getSparkleTexture(),
      transparent: true,
      depthWrite: false,
      vertexColors: true,
    });
    const points = new THREE.Points(geo, mat);
    this.scene.add(points);
    this.bursts.push({ points, velocities, life: 0, maxLife: 1.3 });
  }

  spawnRing(position, color = '#ff9fce', radius = 0.6) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.06, 8, 40),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(position.x, 0.12, position.z);
    this.scene.add(ring);
    this.rings.push({ ring, life: 0, maxLife: 0.7 });
  }

  spawnBubble(position) {
    const size = rand(0.14, 0.38);
    const bubble = new THREE.Mesh(
      new THREE.SphereGeometry(size, 12, 9),
      new THREE.MeshBasicMaterial({
        color: pick(['#ffffff', '#bfeaff', '#e5d7ff']),
        transparent: true,
        opacity: 0.55,
        wireframe: Math.random() < 0.35,
        depthWrite: false,
      })
    );
    bubble.position.set(position.x + rand(-1, 1), position.y + rand(0.3, 1.4), position.z + rand(-1, 1));
    this.scene.add(bubble);
    this.floaters.push({
      object: bubble,
      velocity: new THREE.Vector3(rand(-0.35, 0.35), rand(1.2, 2.5), rand(-0.35, 0.35)),
      life: 0,
      maxLife: rand(1.2, 2.1),
      spin: rand(-2, 2),
      opacity: 0.55,
    });
  }

  spawnHeart(position) {
    const heart = emojiSprite(pick(['💖', '💗', '💕']), rand(0.45, 0.8));
    heart.position.set(position.x + rand(-0.8, 0.8), position.y + rand(0.5, 1.3), position.z + rand(-0.8, 0.8));
    this.scene.add(heart);
    this.floaters.push({
      object: heart,
      velocity: new THREE.Vector3(rand(-0.5, 0.5), rand(1.4, 2.7), rand(-0.5, 0.5)),
      life: 0,
      maxLife: rand(1.1, 1.8),
      spin: rand(-2, 2),
      opacity: 1,
    });
  }

  spawnEmojis(position, emojis, {
    count = 10,
    outMax = 2.5,
    upMin = 1.2,
    upMax = 3,
    sizeMin = 0.4,
    sizeMax = 0.75,
  } = {}) {
    for (let i = 0; i < count; i++) {
      const angle = rand(0, Math.PI * 2);
      const outward = rand(0.25, outMax);
      const sprite = emojiSprite(pick(emojis), rand(sizeMin, sizeMax));
      sprite.position.set(
        position.x + rand(-0.45, 0.45),
        position.y + rand(0.35, 1.4),
        position.z + rand(-0.45, 0.45)
      );
      this.scene.add(sprite);
      this.floaters.push({
        object: sprite,
        velocity: new THREE.Vector3(Math.cos(angle) * outward, rand(upMin, upMax), Math.sin(angle) * outward),
        life: 0,
        maxLife: rand(1.2, 2.1),
        spin: rand(-3.5, 3.5),
        opacity: 1,
      });
    }
  }

  /** A visible little celebration when food is eaten or a toy is played with. */
  useItem(position, item) {
    this.spawnBurst(position);
    const count = item.action === 'play' ? 8 : 5;
    const emojis = item.key === 'teddy' ? [item.emoji, '💖'] : [item.emoji, '✨'];
    this.spawnEmojis(position, emojis, {
      count,
      outMax: item.key === 'kite' ? 1.5 : 2.8,
      upMin: item.key === 'kite' ? 3.2 : 1.7,
      upMax: item.key === 'kite' ? 5.4 : 4,
      sizeMin: 0.5,
      sizeMax: 0.9,
    });
  }

  spawnFlower(x, z) {
    const flower = makeFlower();
    flower.position.set(x, 0, z);
    flower.rotation.y = rand(0, Math.PI * 2);
    flower.scale.setScalar(0.01);
    this.scene.add(flower);
    this.flowers.push({ flower, life: 0, maxLife: 0.7, size: rand(0.9, 1.4) });
  }

  update(dt) {
    // sparkle bursts
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const burst = this.bursts[i];
      burst.life += dt;
      const positions = burst.points.geometry.attributes.position;
      for (let j = 0; j < burst.velocities.length; j++) {
        const v = burst.velocities[j];
        v.y -= 6.5 * dt; // soft gravity
        positions.array[j * 3] += v.x * dt;
        positions.array[j * 3 + 1] += v.y * dt;
        positions.array[j * 3 + 2] += v.z * dt;
        if (positions.array[j * 3 + 1] < 0.05) positions.array[j * 3 + 1] = 0.05;
      }
      positions.needsUpdate = true;
      burst.points.material.opacity = 1 - burst.life / burst.maxLife;
      if (burst.life >= burst.maxLife) {
        this.scene.remove(burst.points);
        burst.points.geometry.dispose();
        burst.points.material.dispose();
        this.bursts.splice(i, 1);
      }
    }

    // expanding rings
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life += dt;
      const k = r.life / r.maxLife;
      r.ring.scale.setScalar(1 + k * 6);
      r.ring.material.opacity = 0.9 * (1 - k);
      if (r.life >= r.maxLife) {
        this.scene.remove(r.ring);
        r.ring.geometry.dispose();
        r.ring.material.dispose();
        this.rings.splice(i, 1);
      }
    }

    // growing flowers (they stay in the world once grown)
    for (let i = this.flowers.length - 1; i >= 0; i--) {
      const f = this.flowers[i];
      f.life += dt;
      const k = Math.min(1, f.life / f.maxLife);
      // bouncy overshoot ease
      const s = 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2);
      f.flower.scale.setScalar(Math.max(0.01, s * f.size));
      if (k >= 1) this.flowers.splice(i, 1);
    }

    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i];
      f.life += dt;
      f.object.position.addScaledVector(f.velocity, dt);
      f.object.rotation.z += f.spin * dt;
      f.object.material.opacity = f.opacity * Math.max(0, 1 - f.life / f.maxLife);
      if (f.life >= f.maxLife) {
        this.scene.remove(f.object);
        if (f.object.geometry) f.object.geometry.dispose();
        if (f.object.material.map) f.object.material.map.dispose();
        f.object.material.dispose();
        this.floaters.splice(i, 1);
      }
    }
  }
}
