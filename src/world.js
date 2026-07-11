import * as THREE from 'three';
import { toon, rand, pick } from './utils.js';

export const WORLD_RADIUS = 62; // how far the player can wander

const FLOWER_COLORS = ['#ff8fc7', '#ffe066', '#ffffff', '#ffb46b', '#ff8f8f'];
const DAY_LENGTH_SECONDS = 210;
const PHASE_TIMES = { midnight: 0, dawn: 0.25, day: 0.5, dusk: 0.75 };
const PHASES = [
  { at: 0, top: '#071531', mid: '#182d55', bot: '#59476f', fog: '#20375d' },
  { at: 0.25, top: '#777bd2', mid: '#ff9eb4', bot: '#ffd6a4', fog: '#c889a8' },
  { at: 0.5, top: '#79b7ff', mid: '#c9dcff', bot: '#fff1dc', fog: '#ffd9ec' },
  { at: 0.75, top: '#554a9b', mid: '#f07f9d', bot: '#ffc176', fog: '#b66f91' },
  { at: 1, top: '#071531', mid: '#182d55', bot: '#59476f', fog: '#20375d' },
].map((phase) => ({
  ...phase,
  top: new THREE.Color(phase.top),
  mid: new THREE.Color(phase.mid),
  bot: new THREE.Color(phase.bot),
  fog: new THREE.Color(phase.fog),
}));

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

function makeMoon() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const glow = ctx.createRadialGradient(128, 128, 38, 128, 128, 126);
  glow.addColorStop(0, 'rgba(227, 236, 255, 0.92)');
  glow.addColorStop(1, 'rgba(197, 215, 255, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = '#f4f1d0';
  ctx.beginPath();
  ctx.arc(128, 128, 61, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#cfd9d8';
  for (const [x, y, r] of [[105, 105, 12], [151, 143, 15], [119, 157, 8]]) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = '#6f718b';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(108, 125, 8, 0.15, 1.2); ctx.stroke();
  ctx.beginPath(); ctx.arc(148, 125, 8, 0.15, 1.2); ctx.stroke();
  ctx.beginPath(); ctx.arc(128, 146, 15, 0.2, 0.8); ctx.stroke();
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(canvas),
    transparent: true,
    depthWrite: false,
    fog: false,
  }));
  sprite.scale.set(27, 27, 1);
  return sprite;
}

function makeStars() {
  const count = 210;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const a = rand(0, Math.PI * 2);
    const y = rand(35, 170);
    const radius = rand(170, 260);
    positions[i * 3] = Math.cos(a) * radius;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = Math.sin(a) * radius;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: '#fff8ca',
    size: 1.35,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    fog: false,
  });
  return new THREE.Points(geo, material);
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
  const hemi = new THREE.HemisphereLight('#ffe3f2', '#243260', 0.9);
  scene.add(hemi);

  const sunlight = new THREE.DirectionalLight('#fff2d8', 2.2);
  sunlight.position.set(35, 55, 25);
  sunlight.castShadow = true;
  sunlight.shadow.mapSize.set(2048, 2048);
  sunlight.shadow.camera.left = -70;
  sunlight.shadow.camera.right = 70;
  sunlight.shadow.camera.top = 70;
  sunlight.shadow.camera.bottom = -70;
  sunlight.shadow.camera.far = 160;
  sunlight.shadow.bias = -0.0005;
  scene.add(sunlight);
  return { hemi, sunlight };
}

export function makeWorld(scene) {
  scene.fog = new THREE.Fog('#ffd9ec', 65, 230);
  const sky = makeSky();
  const sun = makeSun();
  const moon = makeMoon();
  const stars = makeStars();
  scene.add(sky);
  scene.add(sun);
  scene.add(moon);
  scene.add(stars);
  scene.add(makeRainbow());
  makeGround(scene);
  const { hemi, sunlight } = makeLights(scene);

  let time = 0.43;
  const color = new THREE.Color();

  function phaseLabel() {
    if (time < 0.15 || time >= 0.86) return { key: 'midnight', label: '🌙 Midnight' };
    if (time < 0.34) return { key: 'dawn', label: '🌅 Dawn' };
    if (time < 0.67) return { key: 'day', label: '☀️ Day' };
    return { key: 'dusk', label: '🌇 Dusk' };
  }

  function sample(property) {
    let a = PHASES[0];
    let b = PHASES[1];
    for (let i = 0; i < PHASES.length - 1; i++) {
      if (time >= PHASES[i].at && time <= PHASES[i + 1].at) {
        a = PHASES[i];
        b = PHASES[i + 1];
        break;
      }
    }
    const k = THREE.MathUtils.smoothstep(time, a.at, b.at);
    return color.copy(a[property]).lerp(b[property], k);
  }

  function update(dt = 0) {
    time = (time + dt / DAY_LENGTH_SECONDS) % 1;
    sky.material.uniforms.top.value.copy(sample('top'));
    sky.material.uniforms.mid.value.copy(sample('mid'));
    sky.material.uniforms.bot.value.copy(sample('bot'));
    scene.fog.color.copy(sample('fog'));

    const angle = (time - 0.25) * Math.PI * 2;
    const sunHeight = Math.sin(angle);
    sun.position.set(Math.cos(angle) * 95, sunHeight * 78, -145);
    moon.position.set(-Math.cos(angle) * 88, -sunHeight * 70, -138);
    sun.visible = sunHeight > -0.22;
    moon.visible = sunHeight < 0.3;

    const daylight = THREE.MathUtils.smoothstep(sunHeight, -0.16, 0.38);
    const night = 1 - daylight;
    stars.material.opacity = THREE.MathUtils.smoothstep(night, 0.2, 0.82) * 0.95;
    sunlight.intensity = 0.16 + daylight * 2.05;
    sunlight.color.set(daylight > 0.55 ? '#fff2d8' : '#ffb58a');
    sunlight.position.set(Math.cos(angle) * 55, Math.max(8, sunHeight * 65), 28);
    hemi.intensity = 0.24 + daylight * 0.72;
    hemi.color.set(daylight > 0.5 ? '#ffe3f2' : '#889ed8');
    hemi.groundColor.set(daylight > 0.45 ? '#6fb9ff' : '#172343');
  }

  function setPhase(key) {
    if (PHASE_TIMES[key] === undefined) return;
    time = PHASE_TIMES[key];
    update(0);
  }

  function skipToNextPhase() {
    const stops = [0, 0.25, 0.5, 0.75];
    const next = stops.find((stop) => stop > time + 0.04);
    time = next === undefined ? 0 : next;
    update(0);
    return phaseLabel();
  }

  update(0);
  return { update, setPhase, skipToNextPhase, getPhase: phaseLabel, getTime: () => time };
}
