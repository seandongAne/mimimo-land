import * as THREE from 'three';
import { toon, rand, pick, shadowify, colliders } from './utils.js';

const CANOPY_PURPLES = ['#9b6ff0', '#8657e8', '#b48cff', '#a578f5'];

function blobTree() {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 2.4, 8), toon('#9a6a52'));
  trunk.position.y = 1.2;
  tree.add(trunk);

  const mat = toon(pick(CANOPY_PURPLES));
  const canopy = new THREE.Group();
  const blobs = Math.floor(rand(3, 5));
  for (let i = 0; i < blobs; i++) {
    const blob = new THREE.Mesh(new THREE.SphereGeometry(rand(1.0, 1.7), 14, 10), mat);
    blob.position.set(rand(-0.9, 0.9), 2.9 + rand(0, 1.4), rand(-0.9, 0.9));
    canopy.add(blob);
  }
  tree.add(canopy);
  tree.userData.canopy = canopy;
  return tree;
}

function lollipopTree() {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 3.2, 8), toon('#a97ad1'));
  trunk.position.y = 1.6;
  tree.add(trunk);

  const canopy = new THREE.Group();
  const ball = new THREE.Mesh(new THREE.SphereGeometry(1.6, 16, 12), toon(pick(CANOPY_PURPLES)));
  ball.position.y = 4.2;
  canopy.add(ball);
  tree.add(canopy);
  tree.userData.canopy = canopy;
  return tree;
}

/** Purple candy trees scattered around the meadow. Returns an updater (canopy sway). */
export function makeTrees(scene, count = 26) {
  const trees = [];
  let attempts = 0;
  while (trees.length < count && attempts < 400) {
    attempts++;
    const a = rand(0, Math.PI * 2);
    const d = rand(16, 60);
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;

    // keep clear of houses and other obstacles
    if (colliders.some((c) => (x - c.x) ** 2 + (z - c.z) ** 2 < (c.r + 3) ** 2)) continue;
    // keep the spawn path clear
    if (Math.abs(x) < 6 && z > -12 && z < 10) continue;

    const tree = Math.random() < 0.75 ? blobTree() : lollipopTree();
    tree.position.set(x, 0, z);
    tree.rotation.y = rand(0, Math.PI * 2);
    tree.scale.setScalar(rand(0.85, 1.5));
    tree.userData.phase = rand(0, Math.PI * 2);
    shadowify(tree);
    scene.add(tree);
    trees.push(tree);
    colliders.push({ x, z, r: 0.9 * tree.scale.x });
  }

  return function update(dt, t) {
    for (const tree of trees) {
      tree.userData.canopy.rotation.z = Math.sin(t * 0.8 + tree.userData.phase) * 0.02;
    }
  };
}
