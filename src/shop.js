import * as THREE from 'three';
import { toon, darken, lighten, emojiSprite, textSprite, shadowify } from './utils.js';
import { buildMimimo, animateMimimo, disposeMimimo } from './mimimo.js';

const ROOM = { halfX: 7, backZ: -7, frontZ: 6 };
const INVENTORY_KEY = 'mimimo.inventory.v1';

export const SHOP_PRODUCTS = {
  toys: [
    { key: 'teddy', emoji: '🧸', name: 'Teddy' },
    { key: 'ball', emoji: '⚽', name: 'Bouncy ball' },
    { key: 'blocks', emoji: '🧱', name: 'Building blocks' },
    { key: 'kite', emoji: '🪁', name: 'Rainbow kite' },
  ],
  bakery: [
    { key: 'croissant', emoji: '🥐', name: 'Croissant' },
    { key: 'cupcake', emoji: '🧁', name: 'Cupcake' },
    { key: 'cookie', emoji: '🍪', name: 'Cookie' },
    { key: 'cake', emoji: '🍰', name: 'Cake slice' },
  ],
  market: [
    { key: 'apple', emoji: '🍎', name: 'Apple' },
    { key: 'milk', emoji: '🥛', name: 'Milk' },
    { key: 'carrot', emoji: '🥕', name: 'Carrot' },
    { key: 'watermelon', emoji: '🍉', name: 'Watermelon' },
  ],
  icecream: [
    { key: 'cone', emoji: '🍦', name: 'Swirl cone' },
    { key: 'sundae', emoji: '🍨', name: 'Sundae' },
    { key: 'shaved_ice', emoji: '🍧', name: 'Shaved ice' },
    { key: 'pop', emoji: '🍡', name: 'Sweet pop' },
  ],
  candy: [
    { key: 'lollipop', emoji: '🍭', name: 'Lollipop' },
    { key: 'candy', emoji: '🍬', name: 'Candy' },
    { key: 'chocolate', emoji: '🍫', name: 'Chocolate' },
    { key: 'donut', emoji: '🍩', name: 'Donut' },
  ],
};

const box = (w, h, d, color) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(color));

function makeCart(color) {
  const cart = new THREE.Group();
  const basket = box(1.7, 0.9, 1.25, lighten(color, 0.25));
  basket.position.y = 1.15;
  cart.add(basket);
  const inside = box(1.38, 0.65, 0.95, '#fffdf8');
  inside.position.set(0, 1.35, 0);
  cart.add(inside);
  const handle = box(2.0, 0.12, 0.12, darken(color, 0.3));
  handle.position.set(0, 1.9, -0.72);
  cart.add(handle);
  for (const x of [-0.68, 0.68]) {
    const post = box(0.1, 1.25, 0.1, darken(color, 0.25));
    post.position.set(x, 0.72, -0.6);
    cart.add(post);
  }
  for (const x of [-0.62, 0.62]) for (const z of [-0.42, 0.42]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.12, 10), toon('#4a3b5c'));
    wheel.position.set(x, 0.18, z);
    wheel.rotation.z = Math.PI / 2;
    cart.add(wheel);
  }
  shadowify(cart);
  return cart;
}

function buildRoom(scene) {
  const floor = box(16, 0.4, 15, '#f4d9bd');
  floor.position.set(0, -0.2, -0.5);
  floor.receiveShadow = true;
  scene.add(floor);
  for (let i = 0; i < 7; i++) {
    const stripe = box(16, 0.42, 0.85, i % 2 ? '#f0cda8' : '#f7e4cb');
    stripe.position.set(0, -0.19, ROOM.backZ + 0.8 + i * 2);
    scene.add(stripe);
  }

  const back = box(16, 6.5, 0.4, '#ffe1d4');
  back.position.set(0, 3.25, ROOM.backZ - 0.5);
  scene.add(back);
  for (const side of [-1, 1]) {
    const wall = box(0.4, 6.5, 15, '#ffe9dc');
    wall.position.set(side * 7.8, 3.25, -0.5);
    scene.add(wall);
  }

  const counter = box(6.2, 1.35, 1.55, '#8fd0ff');
  counter.position.set(0, 0.68, -4.8);
  scene.add(counter);
  const counterTop = box(6.6, 0.22, 1.8, '#fffdf8');
  counterTop.position.set(0, 1.42, -4.8);
  scene.add(counterTop);
  const till = box(1.1, 0.75, 0.8, '#ff8fc7');
  till.position.set(1.9, 1.85, -4.8);
  scene.add(till);
  const tillScreen = box(0.7, 0.38, 0.08, '#4a3b5c');
  tillScreen.position.set(1.9, 1.95, -4.35);
  scene.add(tillScreen);

  for (const side of [-1, 1]) {
    for (let level = 0; level < 3; level++) {
      const shelf = box(3.4, 0.16, 1.0, '#c9976a');
      shelf.position.set(side * 5.1, 1 + level * 1.45, -1.2);
      scene.add(shelf);
    }
    const end = box(0.18, 4.25, 1.0, '#ad7a52');
    end.position.set(side * 6.75, 2.05, -1.2);
    scene.add(end);
  }

  const carts = [makeCart('#ff8fc7'), makeCart('#7ad0ff')];
  carts[0].position.set(-4.6, 0, 0.9);
  carts[0].rotation.y = 0.35;
  carts[1].position.set(4.5, 0, 0.6);
  carts[1].rotation.y = -0.45;
  scene.add(...carts);
}

function disposeSprite(sprite) {
  if (sprite.material?.map) sprite.material.map.dispose();
  if (sprite.material) sprite.material.dispose();
  sprite.removeFromParent();
}

export function makeShopInterior() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#fff1e5');
  scene.add(new THREE.HemisphereLight('#fff8ef', '#d6b9e8', 1.15));
  const light = new THREE.DirectionalLight('#fff0d5', 1.55);
  light.position.set(7, 12, 8);
  light.castShadow = true;
  scene.add(light);
  buildRoom(scene);

  const productsGroup = new THREE.Group();
  scene.add(productsGroup);

  let player = null;
  let cashier = null;
  let cashierTag = null;
  let cashierBubble = null;
  let activeShop = null;
  let products = [];
  let cart = [];
  let heading = Math.PI;

  function setCashierMessage(message) {
    if (!cashier) return;
    if (cashierBubble) disposeSprite(cashierBubble);
    cashierBubble = textSprite(message, { fontSize: 36 });
    cashierBubble.position.y = 3.6;
    cashier.add(cashierBubble);
  }

  function clearProducts() {
    for (const child of [...productsGroup.children]) {
      child.traverse((obj) => {
        if (obj.material?.map) obj.material.map.dispose();
        if (obj.material) obj.material.dispose();
      });
      child.removeFromParent();
    }
  }

  function displayProducts() {
    clearProducts();
    products.forEach((product, i) => {
      const side = i % 2 ? 1 : -1;
      const row = Math.floor(i / 2);
      const display = new THREE.Group();
      const icon = emojiSprite(product.emoji, 1.15);
      icon.position.y = 0.5;
      display.add(icon);
      const label = textSprite(product.name, { fontSize: 30, pad: 14 });
      label.position.y = -0.25;
      display.add(label);
      display.position.set(side * 5.1, 1.4 + row * 1.55, -0.65);
      display.userData.baseY = display.position.y;
      display.userData.phase = i * 1.7;
      productsGroup.add(display);
    });
  }

  function enter(config, shopInfo) {
    activeShop = shopInfo;
    products = SHOP_PRODUCTS[shopInfo.key] || SHOP_PRODUCTS.market;
    cart = [];
    if (player) disposeMimimo(player);
    player = buildMimimo(config);
    player.position.set(0, 0, 4.5);
    player.rotation.y = Math.PI;
    scene.add(player);

    if (cashier) disposeMimimo(cashier);
    cashier = buildMimimo({ species: shopInfo.key === 'bakery' ? 'bear' : 'kitty', color: '#ffe066', shape: 'classic' });
    cashier.position.set(0, 0, -5.35);
    cashier.rotation.y = 0;
    cashier.scale.setScalar(0.85);
    scene.add(cashier);
    cashierTag = textSprite('Cashier', { fontSize: 34 });
    cashierTag.position.y = 2.8;
    cashier.add(cashierTag);
    cashierBubble = null;
    setCashierMessage(`Welcome to ${shopInfo.label}!`);
    displayProducts();
  }

  function addToCart(productKey) {
    const product = products.find((item) => item.key === productKey);
    if (!product) return cart.length;
    cart.push(product);
    setCashierMessage(`${product.emoji} Great choice!`);
    return cart.length;
  }

  function checkout() {
    if (!cart.length) {
      setCashierMessage('Pick something you like!');
      return { count: 0, items: [] };
    }
    const bought = [...cart];
    let inventory = {};
    try { inventory = JSON.parse(localStorage.getItem(INVENTORY_KEY)) || {}; } catch { inventory = {}; }
    for (const item of bought) inventory[item.key] = (inventory[item.key] || 0) + 1;
    try { localStorage.setItem(INVENTORY_KEY, JSON.stringify(inventory)); } catch { /* ignore */ }
    cart = [];
    setCashierMessage('Thank you! Come again! 💖');
    return { count: bought.length, items: bought };
  }

  function update(dt, t, move) {
    if (player) {
      const moving = Math.hypot(move.x, move.z) > 0.05;
      if (moving) {
        player.position.x += move.x * 4 * dt;
        player.position.z += move.z * 4 * dt;
        player.position.x = THREE.MathUtils.clamp(player.position.x, -ROOM.halfX + 0.5, ROOM.halfX - 0.5);
        player.position.z = THREE.MathUtils.clamp(player.position.z, ROOM.backZ + 2.3, ROOM.frontZ - 0.4);
        heading = Math.atan2(move.x, move.z);
      }
      let delta = heading - player.rotation.y;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      player.rotation.y += delta * Math.min(1, dt * 9);
      animateMimimo(player, t, dt, moving);
    }
    if (cashier) animateMimimo(cashier, t + 1.7, dt, false);
    for (const display of productsGroup.children) {
      display.position.y = display.userData.baseY + Math.sin(t * 1.6 + display.userData.phase) * 0.08;
    }
  }

  function exit() {
    cart = [];
  }

  return {
    scene,
    enter,
    exit,
    update,
    addToCart,
    checkout,
    getProducts: () => products,
    getCartCount: () => cart.length,
    getPlayerPos: () => (player ? player.position : new THREE.Vector3()),
    getActiveShop: () => activeShop,
  };
}
