import * as THREE from 'three';
import { toon, rand, pick } from './utils.js';

export const WORLD_RADIUS = 62; // how far the player can wander

const FLOWER_COLORS = ['#ff8fc7', '#ffe066', '#ffffff', '#ffb46b', '#ff8f8f'];

/** A little candy daisy. Reused by the magic system when flowers grow. */
export function makeFlower(color = pick(FLOWER_COLORS)) {
  const flower = new THREE.Group();

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.5, 6), toon('#58c9a5'));
  stem.position.y = 0.25;
  flower.add(stem);

  const center = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), toon('#fff2b8'));
  center.position.y = 0.55;
  flower.add(center);

  const petalGeo = new THREE.SphereGeometry(0.11, 10, 8);
  const petalMat = toon(color);
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const petal = new THREE.Mesh(petalGeo, petalMat);
    petal.position.set(Math.cos(angle) * 0.16, 0.55, Math.sin(angle) * 0.16);
    petal.scale.set(1, 0.35, 0.6);
    petal.rotation.y = -angle;
    flower.add(petal);
  }
  return flower;
}

function makeSky() {
  const geo = new THREE.SphereGeometry(380, 24, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color('#a5c8ff') },
      mid: { value: new THREE.Color('#ffd6f2') },
      bot: { value: new THREE.Color('#fff1dc') },
    },
    vertexShader: /* glsl */ `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vPos;
      uniform vec3 top; uniform vec3 mid; uniform vec3 bot;
      void main() {
        float h = normalize(vPos).y;
        vec3 c = h > 0.12
          ? mix(mid, top, smoothstep(0.12, 0.65, h))
          : mix(bot, mid, smoothstep(-0.08, 0.12, h));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  return new THREE.Mesh(geo, mat);
}

function makeSun() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const cx = 128;

  // soft glow
  const glow = ctx.createRadialGradient(cx, cx, 40, cx, cx, 128);
  glow.addColorStop(0, 'rgba(255, 236, 150, 0.9)');
  glow.addColorStop(1, 'rgba(255, 236, 150, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 256, 256);

  // rays
  ctx.fillStyle = '#ffd66e';
  for (let i = 0; i < 12; i++) {
    ctx.save();
    ctx.translate(cx, cx);
    ctx.rotate((i / 12) * Math.PI * 2);
    ctx.beginPath();
    ctx.moveTo(-9, -70);
    ctx.lineTo(9, -70);
    ctx.lineTo(0, -104);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // face disc
  ctx.fillStyle = '#ffe38a';
  ctx.beginPath();
  ctx.arc(cx, cx, 64, 0, Math.PI * 2);
  ctx.fill();

  // sleepy happy eyes + smile
  ctx.strokeStyle = '#c98a3d';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(cx - 24, 122, 11, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx + 24, 122, 11, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, 138, 20, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke();

  // cheeks
  ctx.fillStyle = 'rgba(255, 150, 170, 0.75)';
  ctx.beginPath(); ctx.arc(cx - 42, 140, 9, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 42, 140, 9, 0, Math.PI * 2); ctx.fill();

  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(canvas),
      transparent: true,
      depthWrite: false,
      fog: false,
    })
  );
  sprite.scale.set(34, 34, 1);
  sprite.position.set(60, 74, -150);
  return sprite;
}

function makeRainbow() {
  const rainbow = new THREE.Group();
  const bands = ['#ff8f8f', '#ffb46b', '#ffe066', '#8ee08e', '#7ad0ff', '#b79cff'];
  bands.forEach((color, i) => {
    const arc = new THREE.Mesh(
      new THREE.TorusGeometry(17 - i * 0.95, 0.5, 8, 48, Math.PI),
      new THREE.MeshBasicMaterial({ color })
    );
    rainbow.add(arc);
  });
  rainbow.position.set(-36, 0, -62);
  rainbow.rotation.y = 0.45;
  return rainbow;
}

function makeGround(scene) {
  const ground = new THREE.Mesh(new THREE.CircleGeometry(130, 48), toon('#5bbef5'));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // lighter grass patches
  const patchMat = toon('#79d2ff');
  for (let i = 0; i < 14; i++) {
    const patch = new THREE.Mesh(new THREE.CircleGeometry(rand(2, 5.5), 20), patchMat);
    patch.rotation.x = -Math.PI / 2;
    const a = rand(0, Math.PI * 2);
    const d = rand(6, 60);
    patch.position.set(Math.cos(a) * d, 0.02, Math.sin(a) * d);
    scene.add(patch);
  }

  // grass tufts
  const tuftGeo = new THREE.ConeGeometry(0.09, 0.45, 5);
  const tuftMat = toon('#3fa3e8');
  for (let i = 0; i < 90; i++) {
    const tuft = new THREE.Group();
    for (let j = 0; j < 3; j++) {
      const blade = new THREE.Mesh(tuftGeo, tuftMat);
      blade.position.set(rand(-0.12, 0.12), 0.2, rand(-0.12, 0.12));
      blade.rotation.z = rand(-0.25, 0.25);
      tuft.add(blade);
    }
    const a = rand(0, Math.PI * 2);
    const d = rand(3, 62);
    tuft.position.set(Math.cos(a) * d, 0, Math.sin(a) * d);
    scene.add(tuft);
  }

  // scattered flowers
  for (let i = 0; i < 40; i++) {
    const flower = makeFlower();
    const a = rand(0, Math.PI * 2);
    const d = rand(4, 58);
    flower.position.set(Math.cos(a) * d, 0, Math.sin(a) * d);
    flower.rotation.y = rand(0, Math.PI * 2);
    flower.scale.setScalar(rand(0.8, 1.3));
    scene.add(flower);
  }

  // stepping stones from spawn toward the village
  const stoneMat = toon('#fff3e0');
  for (let i = 0; i < 8; i++) {
    const stone = new THREE.Mesh(new THREE.CylinderGeometry(rand(0.55, 0.75), rand(0.6, 0.8), 0.14, 12), stoneMat);
    const t = i / 7;
    stone.position.set(Math.sin(t * Math.PI * 1.6) * 1.6, 0.07, 5 - t * 14);
    stone.receiveShadow = true;
    scene.add(stone);
  }
}

function makeLights(scene) {
  scene.add(new THREE.HemisphereLight('#ffe3f2', '#6fb9ff', 0.9));

  const sun = new THREE.DirectionalLight('#fff2d8', 2.2);
  sun.position.set(35, 55, 25);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -70;
  sun.shadow.camera.right = 70;
  sun.shadow.camera.top = 70;
  sun.shadow.camera.bottom = -70;
  sun.shadow.camera.far = 160;
  sun.shadow.bias = -0.0005;
  scene.add(sun);
}

export function makeWorld(scene) {
  scene.fog = new THREE.Fog('#ffd9ec', 65, 230);
  scene.add(makeSky());
  scene.add(makeSun());
  scene.add(makeRainbow());
  makeGround(scene);
  makeLights(scene);
}
