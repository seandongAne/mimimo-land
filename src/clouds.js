import * as THREE from 'three';
import { toon, rand, pick } from './utils.js';

const CLOUD_PINKS = ['#ffb7d9', '#ffc9e3', '#ff9fce', '#ffd4ea'];

function makeCloud() {
  const cloud = new THREE.Group();
  const mat = toon(pick(CLOUD_PINKS));
  const puffs = Math.floor(rand(5, 9));
  for (let i = 0; i < puffs; i++) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(rand(1.4, 2.6), 14, 10), mat);
    puff.position.set(rand(-3.2, 3.2), rand(-0.7, 0.7), rand(-1.4, 1.4));
    puff.scale.y = 0.78;
    cloud.add(puff);
  }
  return cloud;
}

/** Drifting cotton-candy clouds. Returns an updater for the game loop. */
export function makeClouds(scene, count = 12) {
  const clouds = [];
  for (let i = 0; i < count; i++) {
    const cloud = makeCloud();
    cloud.position.set(rand(-130, 130), rand(24, 44), rand(-120, 60));
    cloud.scale.setScalar(rand(0.8, 1.8));
    cloud.userData.speed = rand(0.4, 1.1);
    cloud.userData.phase = rand(0, Math.PI * 2);
    scene.add(cloud);
    clouds.push(cloud);
  }

  return function update(dt, t) {
    for (const cloud of clouds) {
      cloud.position.x += cloud.userData.speed * dt;
      if (cloud.position.x > 145) cloud.position.x = -145;
      cloud.position.y += Math.sin(t * 0.5 + cloud.userData.phase) * 0.003;
    }
  };
}
