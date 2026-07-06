import * as THREE from 'three';
import { makeFlower } from './world.js';
import { rand, pick } from './utils.js';

const SPARKLE_COLORS = ['#ff8fc7', '#ffe066', '#7ad0ff', '#b79cff', '#8ee08e', '#ffffff'];

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
  }

  cast(position) {
    this.spawnBurst(position);
    this.spawnRing(position);
    const count = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2);
      const d = rand(1.2, 3);
      this.spawnFlower(position.x + Math.cos(a) * d, position.z + Math.sin(a) * d);
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

  spawnRing(position) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.6, 0.06, 8, 40),
      new THREE.MeshBasicMaterial({ color: '#ff9fce', transparent: true, opacity: 0.9 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(position.x, 0.12, position.z);
    this.scene.add(ring);
    this.rings.push({ ring, life: 0, maxLife: 0.7 });
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
  }
}
