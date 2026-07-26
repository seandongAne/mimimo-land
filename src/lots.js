import * as THREE from 'three';
import { toon, shadowify, colliders, treeKeepOut, emojiSprite, textSprite } from './utils.js';
import { HOUSE_BUILDERS } from './houses.js';

const LOTS = [
  { x: -22, z: -42 },
  { x: 22, z: -42 },
  { x: 16, z: 50 },
];
const SAVE_KEY = 'mimimo.myhouses.v1';

function readSaved() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch { return {}; }
}

function writeSaved(saved) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(saved)); } catch { /* ignore */ }
}

/** Ground markings + sign that show a lot is waiting for a house. */
function lotProps(spec) {
  const g = new THREE.Group();
  const pad = new THREE.Mesh(new THREE.CircleGeometry(4.6, 28), toon('#ffeccb'));
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = 0.02;
  g.add(pad);
  // corner pegs
  for (const [cx, cz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) {
    const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.9, 8), toon('#ff8f8f'));
    peg.position.set(cx, 0.45, cz);
    g.add(peg);
  }
  // a little pile of planks and bricks
  const planks = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.9), toon('#e0a56b'));
  planks.position.set(1.8, 0.25, 1.2);
  planks.rotation.y = 0.4;
  g.add(planks);
  const bricks = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.7), toon('#ff9f9f'));
  bricks.position.set(-1.6, 0.3, 1.6);
  g.add(bricks);
  // sign
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 2.4, 8), toon('#b98a5e'));
  post.position.set(0, 1.2, 0);
  g.add(post);
  const icon = emojiSprite('🏗️', 1.4);
  icon.position.set(0, 3.0, 0);
  g.add(icon);
  const tag = textSprite('Build here!', { fontSize: 38 });
  tag.position.set(0, 4.0, 0);
  g.add(tag);
  g.position.set(spec.x, 0, spec.z);
  shadowify(g);
  return g;
}

/**
 * Empty lots where the player can raise their very own house — styled after
 * their species and painted their color. Built houses persist and can be
 * entered and decorated just like the village homes.
 */
export function makeLots(scene) {
  const doors = []; // doors of houses that have been built
  const props = new Map(); // lot index -> "build here" props
  const saved = readSaved();

  function raiseHouse(index, home) {
    const spec = LOTS[index];
    const builder = HOUSE_BUILDERS[home.species] || HOUSE_BUILDERS.bunny;
    const house = builder(home.color, home.floors);
    house.position.set(spec.x, 0, spec.z);
    const angle = Math.atan2(0 - spec.x, 6 - spec.z); // face the spawn point
    house.rotation.y = angle;
    shadowify(house);
    scene.add(house);
    colliders.push({ x: spec.x, z: spec.z, r: 5.4 });

    if (props.has(index)) {
      props.get(index).removeFromParent();
      props.delete(index);
    }

    const reach = 3.1 + 1.4;
    const door = {
      key: `dream${index}`,
      custom: true,
      x: spec.x + Math.sin(angle) * reach,
      z: spec.z + Math.cos(angle) * reach,
    };
    doors.push(door);
    return door;
  }

  LOTS.forEach((spec, index) => {
    treeKeepOut.push({ x: spec.x, z: spec.z, r: 9 });
    if (saved[index]) {
      raiseHouse(index, saved[index]);
    } else {
      const g = lotProps(spec);
      scene.add(g);
      props.set(index, g);
    }
  });

  /** Nearest lot that is still empty and close enough to build on. */
  function nearestEmptyLot(position) {
    for (let index = 0; index < LOTS.length; index++) {
      if (saved[index]) continue;
      const spec = LOTS[index];
      if (Math.hypot(position.x - spec.x, position.z - spec.z) < 5.4) {
        return { index, x: spec.x, z: spec.z };
      }
    }
    return null;
  }

  /** Build the player's house on a lot. Returns its door (or null). */
  function buildAt(index, config) {
    if (saved[index]) return null;
    saved[index] = { species: config.species, color: config.color, floors: config.floors || 1 };
    writeSaved(saved);
    return raiseHouse(index, saved[index]);
  }

  return { doors, nearestEmptyLot, buildAt };
}
