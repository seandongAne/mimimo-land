import * as THREE from 'three';
import { toon, darken, lighten, emojiSprite, textSprite, shadowify, pick } from './utils.js';
import { buildMimimo, animateMimimo, disposeMimimo } from './mimimo.js';

const ROOM = { halfX: 7, backZ: -7, frontZ: 6 };
const INVENTORY_KEY = 'mimimo.inventory.v1';

export const SHOP_PRODUCTS = {
  toys: [
    { key: 'teddy', emoji: '🧸', name: 'Teddy', action: 'play', useMessage: 'Teddy hug! I love you! 💖' },
    { key: 'ball', emoji: '⚽', name: 'Bouncy ball', action: 'play', useMessage: "Let's bounce the ball!" },
    { key: 'blocks', emoji: '🧱', name: 'Building blocks', action: 'play', useMessage: "Let's build something!" },
    { key: 'kite', emoji: '🪁', name: 'Rainbow kite', action: 'play', useMessage: 'My kite can touch the clouds!' },
  ],
  bakery: [
    { key: 'croissant', emoji: '🥐', name: 'Croissant', action: 'eat', useMessage: 'Crunchy and yummy!' },
    { key: 'cupcake', emoji: '🧁', name: 'Cupcake', action: 'eat', useMessage: 'Yum, sprinkles!' },
    { key: 'cookie', emoji: '🍪', name: 'Cookie', action: 'eat', useMessage: 'Mmm, cookie!' },
    { key: 'cake', emoji: '🍰', name: 'Cake slice', action: 'eat', useMessage: 'This cake is delicious!' },
  ],
  market: [
    { key: 'apple', emoji: '🍎', name: 'Apple', action: 'eat', useMessage: 'Crunch! I love apples!' },
    { key: 'milk', emoji: '🥛', name: 'Milk', action: 'drink', useMessage: 'Slurp! So refreshing!' },
    { key: 'carrot', emoji: '🥕', name: 'Carrot', action: 'eat', useMessage: 'Crunchy carrot power!' },
    { key: 'watermelon', emoji: '🍉', name: 'Watermelon', action: 'eat', useMessage: 'Juicy watermelon!' },
  ],
  icecream: [
    { key: 'cone', emoji: '🍦', name: 'Swirl cone', action: 'eat', useMessage: 'Cold and creamy!' },
    { key: 'sundae', emoji: '🍨', name: 'Sundae', action: 'eat', useMessage: 'Best sundae ever!' },
    { key: 'shaved_ice', emoji: '🍧', name: 'Shaved ice', action: 'eat', useMessage: 'Brrr! Sweet snow!' },
    { key: 'pop', emoji: '🍡', name: 'Sweet pop', action: 'eat', useMessage: 'Yummy rainbow pop!' },
  ],
  candy: [
    { key: 'lollipop', emoji: '🍭', name: 'Lollipop', action: 'eat', useMessage: 'Sweet lollipop!' },
    { key: 'candy', emoji: '🍬', name: 'Candy', action: 'eat', useMessage: 'Candy sparkle power!' },
    { key: 'chocolate', emoji: '🍫', name: 'Chocolate', action: 'eat', useMessage: 'Mmm, chocolate!' },
    { key: 'donut', emoji: '🍩', name: 'Donut', action: 'eat', useMessage: 'A perfect donut!' },
  ],
};

const ALL_PRODUCTS = Object.values(SHOP_PRODUCTS).flat();
const CASHIER_CHATS = [
  { player: 'Hi! How are you?', cashier: "I'm happy to see you! 🌸" },
  { player: 'I love your shop! 💖', cashier: 'Thank you! I love it too!' },
  { player: 'What do you like?', cashier: 'I like helping mimimos!' },
  { player: 'You are a great cashier!', cashier: 'You are very kind! ✨' },
  { player: 'Have a lovely day!', cashier: 'You too, my friend! 👋' },
];

function readInventory() {
  try { return JSON.parse(localStorage.getItem(INVENTORY_KEY)) || {}; } catch { return {}; }
}

function writeInventory(inventory) {
  try { localStorage.setItem(INVENTORY_KEY, JSON.stringify(inventory)); } catch { /* ignore */ }
}

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
  let playerBubble = null;
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

  function setPlayerMessage(message) {
    if (!player) return;
    if (playerBubble) disposeSprite(playerBubble);
    playerBubble = textSprite(message, { fontSize: 36 });
    playerBubble.position.y = 2.9;
    player.add(playerBubble);
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
    playerBubble = null;
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
    const inventory = readInventory();
    for (const item of bought) inventory[item.key] = (inventory[item.key] || 0) + 1;
    writeInventory(inventory);
    cart = [];
    setCashierMessage('Thank you! Come again! 💖');
    return { count: bought.length, items: bought };
  }

  function talkToCashier() {
    const chat = pick(CASHIER_CHATS);
    setPlayerMessage(chat.player);
    setCashierMessage(chat.cashier);
    return chat;
  }

  function getInventoryItems() {
    const inventory = readInventory();
    return ALL_PRODUCTS
      .filter((item) => inventory[item.key] > 0)
      .map((item) => ({ ...item, count: inventory[item.key] }));
  }

  function useInventoryItem(productKey) {
    const inventory = readInventory();
    const item = ALL_PRODUCTS.find((product) => product.key === productKey);
    if (!item || !inventory[productKey]) return null;

    // Food and drinks are used up. Toys stay in the bag so they can be
    // played with again and again.
    if (item.action !== 'play') {
      inventory[productKey] -= 1;
      if (inventory[productKey] <= 0) delete inventory[productKey];
      writeInventory(inventory);
    }
    return { item, remaining: inventory[productKey] || 0 };
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
    talkToCashier,
    getInventoryItems,
    useInventoryItem,
    getProducts: () => products,
    getCartCount: () => cart.length,
    getPlayerPos: () => (player ? player.position : new THREE.Vector3()),
    getActiveShop: () => activeShop,
  };
}
