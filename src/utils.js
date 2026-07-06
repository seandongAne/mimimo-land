import * as THREE from 'three';

/** Round obstacles ({x, z, r}) that the player gets pushed out of. */
export const colliders = [];

/** Soft zones ({x, z, r}) the tree scatterer avoids (parks, plazas, beach...). */
export const treeKeepOut = [];

let gradientMap = null;

/** Shared 3-step gradient so every toon material shades the same way. */
function toonGradient() {
  if (!gradientMap) {
    const data = new Uint8Array([90, 170, 255]);
    gradientMap = new THREE.DataTexture(data, 3, 1, THREE.RedFormat);
    gradientMap.minFilter = THREE.NearestFilter;
    gradientMap.magFilter = THREE.NearestFilter;
    gradientMap.needsUpdate = true;
  }
  return gradientMap;
}

export function toon(color) {
  return new THREE.MeshToonMaterial({ color, gradientMap: toonGradient() });
}

export function lighten(color, amount = 0.5) {
  return new THREE.Color(color).lerp(new THREE.Color('#ffffff'), amount);
}

export function darken(color, amount = 0.25) {
  return new THREE.Color(color).lerp(new THREE.Color('#2b1f3a'), amount);
}

export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function shadowify(root) {
  root.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
}

/** Floating text label (used for friend name tags). */
export function textSprite(text, { fontSize = 44, pad = 22 } = {}) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const font = `600 ${fontSize}px Fredoka, "Comic Sans MS", sans-serif`;
  ctx.font = font;
  const w = Math.ceil(ctx.measureText(text).width) + pad * 2;
  const h = fontSize + pad * 1.6;
  canvas.width = w;
  canvas.height = h;

  // pill background
  ctx.fillStyle = 'rgba(255, 253, 248, 0.92)';
  ctx.strokeStyle = '#4a3b5c';
  ctx.lineWidth = 6;
  const r = h / 2 - 3;
  ctx.beginPath();
  ctx.roundRect(3, 3, w - 6, h - 6, r);
  ctx.fill();
  ctx.stroke();

  ctx.font = font;
  ctx.fillStyle = '#4a3b5c';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2 + 2);

  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false })
  );
  const scale = 0.011;
  sprite.scale.set(w * scale, h * scale, 1);
  return sprite;
}

/** Emoji rendered onto a sprite (hearts, sparkles...). */
export function emojiSprite(emoji, size = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.font = '100px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, 64, 70);
  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false })
  );
  sprite.scale.set(size, size, 1);
  return sprite;
}
