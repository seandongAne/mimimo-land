import * as THREE from 'three';
import { toon, lighten, darken, rand, pick, shadowify, colliders, treeKeepOut } from './utils.js';
import { makeFlower } from './world.js';
import { makeSignpost } from './town.js';

const FLOWER_COLORS = ['#ff8fc7', '#ffe066', '#ffffff', '#ffb46b', '#ff8f8f', '#b79cff'];

/* ------------------------------------------------------------ park props */

function bench() {
  const g = new THREE.Group();
  const woodA = toon('#e0a56b');
  const seat = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.18, 0.7), woodA);
  seat.position.y = 0.7;
  g.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.7, 0.16), woodA);
  back.position.set(0, 1.05, -0.32);
  g.add(back);
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.7, 0.6), toon('#b98a5e'));
    leg.position.set(side * 0.9, 0.35, 0);
    g.add(leg);
  }
  return g;
}

function swingSet() {
  const g = new THREE.Group();
  const barMat = toon('#7ad0ff');
  // two A-frames
  for (const side of [-1, 1]) {
    for (const lean of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.4, 8), barMat);
      leg.position.set(side * 2.4, 1.6, lean * 0.5);
      leg.rotation.x = lean * 0.28;
      g.add(leg);
    }
  }
  const topBar = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 5.2, 8), barMat);
  topBar.rotation.z = Math.PI / 2;
  topBar.position.y = 3.15;
  g.add(topBar);
  // two swings
  for (const sx of [-1.1, 1.1]) {
    for (const off of [-0.22, 0.22]) {
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2, 6), toon('#8a6b4a'));
      rope.position.set(sx, 2.1, off);
      g.add(rope);
    }
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.1, 0.5), toon('#ff8f8f'));
    seat.position.set(sx, 1.1, 0);
    g.add(seat);
  }
  return g;
}

function slide() {
  const g = new THREE.Group();
  const platform = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.2, 1.2), toon('#ffd54f'));
  platform.position.set(0, 2.2, 0);
  g.add(platform);
  for (const cx of [-0.5, 0.5]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.2, 8), toon('#ff8fc7'));
    post.position.set(cx, 1.1, -0.5);
    g.add(post);
  }
  // slope
  const slope = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.16, 3.4), toon('#7ad0ff'));
  slope.position.set(0, 1.2, 1.7);
  slope.rotation.x = 0.55;
  g.add(slope);
  for (const side of [-0.5, 0.5]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.4, 3.4), toon('#5fb0ff'));
    rail.position.set(side, 1.4, 1.7);
    rail.rotation.x = 0.55;
    g.add(rail);
  }
  // ladder
  for (let i = 0; i < 4; i++) {
    const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 6), toon('#8a6b4a'));
    rung.rotation.z = Math.PI / 2;
    rung.position.set(0, 0.5 + i * 0.5, -1.0);
    g.add(rung);
  }
  return g;
}

function pond(x, z, r = 4) {
  const g = new THREE.Group();
  const water = new THREE.Mesh(new THREE.CircleGeometry(r, 32), toon('#5fc8e8'));
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.04;
  g.add(water);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.28, 10, 40), toon('#9fdcc0'));
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = 0.1;
  g.add(rim);
  for (let i = 0; i < 3; i++) {
    const pad = new THREE.Mesh(new THREE.CircleGeometry(rand(0.5, 0.8), 16), toon('#5fcf9a'));
    pad.rotation.x = -Math.PI / 2;
    const a = rand(0, Math.PI * 2);
    const d = rand(0.5, r - 1);
    pad.position.set(Math.cos(a) * d, 0.06, Math.sin(a) * d);
    g.add(pad);
  }
  g.position.set(x, 0, z);
  return g;
}

/** Green park with a pond, playground, benches, flowers and lamps. */
function makePark(scene) {
  const center = { x: -40, z: 5 };
  treeKeepOut.push({ x: center.x, z: center.z, r: 17 });

  const lawn = new THREE.Mesh(new THREE.CircleGeometry(15, 44), toon('#8ee08e'));
  lawn.rotation.x = -Math.PI / 2;
  lawn.position.set(center.x, 0.02, center.z);
  lawn.receiveShadow = true;
  scene.add(lawn);

  const p = pond(center.x - 6, center.z + 6);
  scene.add(p);

  const sw = swingSet();
  sw.position.set(center.x + 4, 0, center.z - 4);
  sw.rotation.y = 0.5;
  shadowify(sw);
  scene.add(sw);
  colliders.push({ x: center.x + 4, z: center.z - 4, r: 2.6 });

  const sl = slide();
  sl.position.set(center.x + 7, 0, center.z + 4);
  sl.rotation.y = -1.2;
  shadowify(sl);
  scene.add(sl);
  colliders.push({ x: center.x + 7, z: center.z + 4, r: 2 });

  const benches = [
    [center.x - 2, center.z - 6, 0.3],
    [center.x + 1, center.z + 8, Math.PI + 0.4],
  ];
  for (const [bx, bz, ry] of benches) {
    const b = bench();
    b.position.set(bx, 0, bz);
    b.rotation.y = ry;
    shadowify(b);
    scene.add(b);
  }

  // lamp posts
  for (const [lx, lz] of [[center.x - 10, center.z - 8], [center.x + 9, center.z + 9]]) {
    const lamp = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 3.4, 8), toon('#7a6a8c'));
    pole.position.y = 1.7;
    lamp.add(pole);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 10), toon('#fff2b8'));
    globe.position.y = 3.6;
    lamp.add(globe);
    lamp.position.set(lx, 0, lz);
    shadowify(lamp);
    scene.add(lamp);
  }

  // extra flowers on the lawn
  for (let i = 0; i < 22; i++) {
    const f = makeFlower(pick(FLOWER_COLORS));
    const a = rand(0, Math.PI * 2);
    const d = rand(2, 14);
    f.position.set(center.x + Math.cos(a) * d, 0, center.z + Math.sin(a) * d);
    f.scale.setScalar(rand(0.8, 1.3));
    scene.add(f);
  }

  // a few park trees
  scene.add(makeSignpost('🌳 Park', center.x + 11, center.z - 11));
}

/* ------------------------------------------------------------ beach */

function umbrella(color) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3, 8), toon('#fffdf8'));
  pole.position.y = 1.5;
  g.add(pole);
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.9, 0.9, 16), toon(color));
  canopy.position.y = 3.0;
  g.add(canopy);
  // white stripe wedges
  for (let i = 0; i < 8; i += 2) {
    const wedge = new THREE.Mesh(new THREE.ConeGeometry(1.92, 0.92, 16, 1, false, (i / 8) * Math.PI * 2, Math.PI / 4), toon('#fffdf8'));
    wedge.position.y = 3.0;
    g.add(wedge);
  }
  return g;
}

function sandcastle() {
  const g = new THREE.Group();
  const sandMat = toon('#f4d9a0');
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 0.9, 16), sandMat);
  base.position.y = 0.45;
  g.add(base);
  const mid = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.85, 0.8, 12), sandMat);
  mid.position.y = 1.2;
  g.add(mid);
  for (const [cx, cz] of [[-0.9, 0], [0.9, 0], [0, 0.9], [0, -0.9]]) {
    const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 1.4, 10), sandMat);
    turret.position.set(cx, 0.7, cz);
    g.add(turret);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.5, 10), toon('#ff8fc7'));
    cap.position.set(cx, 1.6, cz);
    g.add(cap);
  }
  const flag = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 6), toon('#8a6b4a'));
  flag.position.y = 2.1;
  g.add(flag);
  const cloth = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.32, 0.04), toon('#ff8f8f'));
  cloth.position.set(0.25, 2.4, 0);
  g.add(cloth);
  return g;
}

/** Sandy beach with umbrellas, towels, beach balls and a sandcastle. */
function makeBeach(scene) {
  const center = { x: -4, z: 45 };
  treeKeepOut.push({ x: center.x, z: center.z, r: 20 });

  const sand = new THREE.Mesh(new THREE.CircleGeometry(17, 48), toon('#f6dca6'));
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(center.x, 0.02, center.z);
  sand.receiveShadow = true;
  scene.add(sand);

  // foamy shoreline arcs on the water side (toward spawn / -z)
  for (let i = 0; i < 3; i++) {
    const foam = new THREE.Mesh(
      new THREE.TorusGeometry(16 - i * 0.6, 0.24, 8, 60, Math.PI * 0.7),
      toon('#ffffff')
    );
    foam.rotation.x = -Math.PI / 2;
    foam.rotation.z = Math.PI + Math.PI * 0.15;
    foam.position.set(center.x, 0.06, center.z);
    scene.add(foam);
  }

  const umbrellas = [
    [center.x - 6, center.z + 2, '#ff8f8f'],
    [center.x + 5, center.z - 1, '#7ad0ff'],
    [center.x + 2, center.z + 7, '#ffe066'],
  ];
  for (const [ux, uz, col] of umbrellas) {
    const u = umbrella(col);
    u.position.set(ux, 0, uz);
    shadowify(u);
    scene.add(u);
    // towel under it
    const towel = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 2.4), toon(lighten(col, 0.2)));
    towel.position.set(ux + 1.4, 0.06, uz);
    towel.rotation.y = rand(-0.4, 0.4);
    scene.add(towel);
  }

  // beach balls
  for (let i = 0; i < 3; i++) {
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), toon(pick(['#ff8fc7', '#7ad0ff', '#ffe066'])));
    ball.position.set(center.x + rand(-8, 8), 0.5, center.z + rand(-8, 8));
    ball.castShadow = true;
    scene.add(ball);
  }

  const castle = sandcastle();
  castle.position.set(center.x + 8, 0, center.z + 6);
  shadowify(castle);
  scene.add(castle);
  colliders.push({ x: center.x + 8, z: center.z + 6, r: 1.6 });

  scene.add(makeSignpost('🏖️ Beach', center.x - 13, center.z - 8));
}

/* ------------------------------------------------------------ pool */

/** A tiled swimming pool with a diving board, ladder and ring floats. */
function makePool(scene) {
  const center = { x: 18, z: 35 };
  treeKeepOut.push({ x: center.x, z: center.z, r: 12 });

  // deck
  const deck = new THREE.Mesh(new THREE.BoxGeometry(14, 0.4, 12), toon('#e9f4ff'));
  deck.position.set(center.x, 0.2, center.z);
  deck.receiveShadow = true;
  scene.add(deck);
  // checker tiles
  for (let i = 0; i < 6; i++) {
    const tile = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.42, 1.4), toon('#cfe6ff'));
    tile.position.set(center.x - 5 + (i % 3) * 5, 0.21, center.z - 4 + Math.floor(i / 3) * 8);
    scene.add(tile);
  }

  // pool basin: rim frame + water
  const rimMat = toon('#bfe4ff');
  const poolW = 8, poolD = 6;
  const water = new THREE.Mesh(new THREE.BoxGeometry(poolW, 0.5, poolD), toon('#4fc3f7'));
  water.position.set(center.x, 0.28, center.z);
  scene.add(water);
  // rim edges
  for (const [ex, ez, ew, ed] of [
    [0, -poolD / 2 - 0.3, poolW + 1.2, 0.6],
    [0, poolD / 2 + 0.3, poolW + 1.2, 0.6],
    [-poolW / 2 - 0.3, 0, 0.6, poolD + 1.2],
    [poolW / 2 + 0.3, 0, 0.6, poolD + 1.2],
  ]) {
    const rim = new THREE.Mesh(new THREE.BoxGeometry(ew, 0.6, ed), rimMat);
    rim.position.set(center.x + ex, 0.5, center.z + ez);
    scene.add(rim);
  }

  // ring floats bobbing on the water
  for (const [fx, fz, col] of [[-1.5, 0.5, '#ff8f8f'], [1.8, -1, '#ffe066']]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.22, 10, 20), toon(col));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(center.x + fx, 0.55, center.z + fz);
    scene.add(ring);
  }

  // diving board
  const boardBase = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.6), toon('#8fd0ff'));
  boardBase.position.set(center.x, 0.75, center.z - poolD / 2 - 1.2);
  scene.add(boardBase);
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.14, 2.4), toon('#fffdf8'));
  board.position.set(center.x, 1.15, center.z - poolD / 2 + 0.1);
  scene.add(board);

  // ladder rails on the far side
  for (const side of [-0.4, 0.4]) {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 8), toon('#cfd8e6'));
    rail.position.set(center.x + side, 0.9, center.z + poolD / 2 + 0.4);
    scene.add(rail);
  }

  // block walking through the raised rim (four soft edge colliders)
  colliders.push({ x: center.x, z: center.z - poolD / 2 - 0.3, r: 1.2 });
  colliders.push({ x: center.x, z: center.z + poolD / 2 + 0.3, r: 1.2 });

  scene.add(makeSignpost('🏊 Pool', center.x - 9, center.z - 7));

  return {
    center,
    halfX: poolW / 2 - 0.35,
    halfZ: poolD / 2 - 0.35,
    contains(position) {
      return Math.abs(position.x - center.x) <= this.halfX
        && Math.abs(position.z - center.z) <= this.halfZ;
    },
  };
}

/** Build every nature district. Call before makeTrees so trees stay clear. */
export function makeNature(scene) {
  makePark(scene);
  makeBeach(scene);
  return { pool: makePool(scene) };
}
