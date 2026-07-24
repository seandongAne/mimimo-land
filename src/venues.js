import * as THREE from 'three';
import { toon, darken, lighten, emojiSprite, textSprite, shadowify, pick, rand } from './utils.js';
import { buildMimimo, animateMimimo, disposeMimimo } from './mimimo.js';
import { grantItem, EXTRA_ITEMS } from './shop.js';
import { makeFlower } from './world.js';

const ROOM = { halfX: 7, backZ: -7, frontZ: 6 };
const ITEM_BY_KEY = Object.fromEntries(EXTRA_ITEMS.map((item) => [item.key, item]));

const box = (w, h, d, color) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(color));

/* ------------------------------------------------------------ staff hats */

function graduationCap() {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.2, 12), toon('#4a3b5c'));
  g.add(base);
  const board = box(0.95, 0.07, 0.95, '#4a3b5c');
  board.position.y = 0.14;
  board.rotation.y = 0.35;
  g.add(board);
  const tassel = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), toon('#ffe066'));
  tassel.position.set(0.42, 0.02, 0.3);
  g.add(tassel);
  return g;
}

function nurseCap() {
  const g = new THREE.Group();
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.44, 0.26, 12), toon('#fffdf8'));
  g.add(cap);
  const crossV = box(0.12, 0.3, 0.05, '#ff6f91');
  crossV.position.set(0, 0.02, 0.4);
  g.add(crossV);
  const crossH = box(0.3, 0.12, 0.05, '#ff6f91');
  crossH.position.set(0, 0.02, 0.4);
  g.add(crossH);
  return g;
}

function chefHat() {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.42, 12), toon('#fffdf8'));
  base.position.y = 0.1;
  g.add(base);
  const puff = new THREE.Mesh(new THREE.SphereGeometry(0.46, 12, 10), toon('#fffdf8'));
  puff.position.y = 0.45;
  puff.scale.set(1, 0.8, 1);
  g.add(puff);
  for (const side of [-1, 1]) {
    const bump = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), toon('#fffdf8'));
    bump.position.set(side * 0.32, 0.34, 0);
    g.add(bump);
  }
  return g;
}

/* ------------------------------------------------------------ room dressing */

function dressSchool(root) {
  // blackboard with chalk scribbles
  const frame = box(6.0, 3.0, 0.14, '#c9976a');
  frame.position.set(0, 2.6, ROOM.backZ + 0.08);
  root.add(frame);
  const board = box(5.6, 2.6, 0.18, '#3f7d5c');
  board.position.set(0, 2.6, ROOM.backZ + 0.15);
  root.add(board);
  const scribbles = [
    [-1.2, 3.2, 1.6, 0.06],
    [0.7, 2.7, 2.1, -0.05],
    [-0.9, 2.2, 1.2, 0.03],
  ];
  for (const [x, y, len, tilt] of scribbles) {
    const chalk = box(len, 0.07, 0.05, '#ffffff');
    chalk.position.set(x, y, ROOM.backZ + 0.28);
    chalk.rotation.z = tilt;
    root.add(chalk);
  }
  const abc = emojiSprite('🔤', 0.9);
  abc.position.set(1.9, 3.3, ROOM.backZ + 0.4);
  root.add(abc);

  // teacher's desk with an apple
  const desk = box(2.6, 0.9, 1.1, '#e0a56b');
  desk.position.set(0, 0.45, -4.6);
  root.add(desk);
  const deskTop = box(2.9, 0.16, 1.3, '#f2c99a');
  deskTop.position.set(0, 0.95, -4.6);
  root.add(deskTop);
  const apple = emojiSprite('🍎', 0.55);
  apple.position.set(0.85, 1.3, -4.4);
  root.add(apple);

  // four student desks with books and stools
  const bookColors = ['#ff8fc7', '#7ad0ff', '#8ee08e', '#ffe066'];
  let i = 0;
  for (const dx of [-2.4, 2.4]) {
    for (const dz of [-1.6, 1.1]) {
      const student = box(1.7, 0.75, 0.9, '#e9c298');
      student.position.set(dx, 0.38, dz);
      root.add(student);
      const book = box(0.55, 0.12, 0.75, bookColors[i % 4]);
      book.position.set(dx - 0.3, 0.82, dz);
      book.rotation.y = 0.25;
      root.add(book);
      const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.55, 10), toon(bookColors[(i + 2) % 4]));
      stool.position.set(dx, 0.28, dz + 1.05);
      root.add(stool);
      i++;
    }
  }

  // posters flanking the blackboard
  for (const [px, emoji] of [[-4.8, '🎨'], [4.8, '🌍']]) {
    const poster = box(1.1, 1.4, 0.08, '#fffdf8');
    poster.position.set(px, 3.0, ROOM.backZ + 0.12);
    root.add(poster);
    const icon = emojiSprite(emoji, 0.7);
    icon.position.set(px, 3.0, ROOM.backZ + 0.3);
    root.add(icon);
  }
}

function dressHospital(root) {
  // two beds against the left wall
  for (const bz of [-3.8, -0.8]) {
    const bedBase = box(2.6, 0.55, 1.5, '#fffdf8');
    bedBase.position.set(-5.4, 0.28, bz);
    root.add(bedBase);
    const mattress = box(2.5, 0.25, 1.4, '#f4f9ff');
    mattress.position.set(-5.4, 0.66, bz);
    root.add(mattress);
    const blanket = box(1.5, 0.26, 1.44, '#ff9fce');
    blanket.position.set(-5.0, 0.72, bz);
    root.add(blanket);
    const pillow = box(0.55, 0.22, 0.9, '#ffffff');
    pillow.position.set(-6.2, 0.76, bz);
    root.add(pillow);
  }

  // heart monitor between the beds
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 1.6, 8), toon('#b9c4d8'));
  stand.position.set(-4.2, 0.8, -2.3);
  root.add(stand);
  const screen = box(1.0, 0.72, 0.16, '#2b2f4a');
  screen.position.set(-4.2, 1.85, -2.3);
  root.add(screen);
  const beats = [
    [-0.3, 0, 0.6],
    [-0.05, 0.1, -1.1],
    [0.15, -0.05, 1.2],
    [0.35, 0.02, 0],
  ];
  for (const [bx, by, tilt] of beats) {
    const blip = box(0.22, 0.05, 0.04, '#7dffa8');
    blip.position.set(-4.2 + bx, 1.85 + by, -2.2);
    blip.rotation.z = tilt;
    root.add(blip);
  }

  // big soft cross on the back wall
  const crossV = box(0.6, 1.8, 0.12, '#ff8fa8');
  crossV.position.set(0, 3.2, ROOM.backZ + 0.12);
  root.add(crossV);
  const crossH = box(1.8, 0.6, 0.12, '#ff8fa8');
  crossH.position.set(0, 3.2, ROOM.backZ + 0.12);
  root.add(crossH);

  // medicine cabinet with a cross
  const cabinet = box(2.2, 2.4, 0.9, '#fffdf8');
  cabinet.position.set(4.6, 1.2, ROOM.backZ + 0.6);
  root.add(cabinet);
  const cabV = box(0.24, 0.9, 0.1, '#ff6f91');
  cabV.position.set(4.6, 1.4, ROOM.backZ + 1.1);
  root.add(cabV);
  const cabH = box(0.9, 0.24, 0.1, '#ff6f91');
  cabH.position.set(4.6, 1.4, ROOM.backZ + 1.1);
  root.add(cabH);
  const healthyPoster = emojiSprite('🍎', 0.7);
  healthyPoster.position.set(3.2, 3.2, ROOM.backZ + 0.3);
  root.add(healthyPoster);

  // cheery potted flower
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 0.6, 10), toon('#e0a56b'));
  pot.position.set(6.1, 0.3, 1.6);
  root.add(pot);
  const flower = makeFlower();
  flower.position.set(6.1, 0.55, 1.6);
  flower.scale.setScalar(1.8);
  root.add(flower);
}

function dressRestaurant(root) {
  // kitchen counter along the back
  const counter = box(6.4, 1.3, 1.5, '#ffb46b');
  counter.position.set(0, 0.65, -4.9);
  root.add(counter);
  const counterTop = box(6.8, 0.2, 1.7, '#fffdf8');
  counterTop.position.set(0, 1.4, -4.9);
  root.add(counterTop);

  // stove with a bubbling soup pot
  const stove = box(1.6, 1.15, 1.2, '#6b5a7c');
  stove.position.set(-4.6, 0.58, -4.9);
  root.add(stove);
  for (const side of [-0.35, 0.35]) {
    const burner = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 12), toon('#3a2b4a'));
    burner.position.set(-4.6 + side, 1.19, -4.9);
    root.add(burner);
  }
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.5, 0.6, 12), toon('#ff6f91'));
  pot.position.set(-4.25, 1.5, -4.9);
  root.add(pot);
  const steam = [];
  [0.16, 0.22, 0.28].forEach((size, i) => {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(size, 10, 8), toon('#fffdf8'));
    puff.position.set(-4.25 + i * 0.14, 2.1 + i * 0.5, -4.9);
    root.add(puff);
    steam.push({ mesh: puff, baseY: puff.position.y, phase: i * 1.4 });
  });
  root.userData.steam = steam;

  // menu board above the counter
  const menu = box(3.6, 1.5, 0.12, '#4a3b5c');
  menu.position.set(0, 3.4, ROOM.backZ + 0.15);
  root.add(menu);
  ['🍜', '🍕', '🥞', '🧃'].forEach((emoji, i) => {
    const icon = emojiSprite(emoji, 0.62);
    icon.position.set(-1.25 + i * 0.85, 3.4, ROOM.backZ + 0.35);
    root.add(icon);
  });

  // two round tables with plates, flowers and stools
  const stoolColors = ['#ff8fc7', '#7ad0ff', '#8ee08e', '#ffe066'];
  [[-3.2, 0.8], [3.2, 0.4]].forEach(([tx, tz], tableIndex) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 1.05, 8), toon('#c9976a'));
    leg.position.set(tx, 0.52, tz);
    root.add(leg);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.14, 18), toon('#fff3e0'));
    top.position.set(tx, 1.1, tz);
    root.add(top);
    for (const side of [-1, 1]) {
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.05, 14), toon('#ffffff'));
      plate.position.set(tx + side * 0.6, 1.2, tz);
      root.add(plate);
      const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.55, 10), toon(stoolColors[(tableIndex * 2 + side + 1) % 4]));
      stool.position.set(tx, 0.28, tz + side * 1.5);
      root.add(stool);
    }
    const flower = makeFlower();
    flower.position.set(tx, 1.17, tz);
    flower.scale.setScalar(0.9);
    root.add(flower);
  });
}

/* ------------------------------------------------------------ venue configs */

const VENUE_SPECS = {
  school: {
    title: '🏫 Welcome to school!',
    hint: 'The teacher is so happy you came to learn!',
    staff: { name: 'Teacher', species: 'blob', color: '#b79cff', hat: graduationCap },
    dress: dressSchool,
    floor: '#f4ddb8', walls: '#fff3d1', back: '#ffe9c9', sky: '#fff3e0', rug: '#ffd9a1',
    chats: [
      { player: 'I love school!', staff: 'And school loves you! 📚' },
      { player: 'What will we learn today?', staff: 'Something wonderful — we always do! ✨' },
      { player: 'Reading is fun!', staff: 'Books are little doors to everywhere! 📖' },
      { player: 'You are the best teacher!', staff: 'And you are a star student! ⭐' },
    ],
    actions: [
      {
        key: 'story', emoji: '📖', label: 'Story time', burst: '📖',
        lines: [
          { player: 'Tell us a story!', staff: 'Once upon a time, a brave mimimo climbed a rainbow… 🌈', feedback: '📖 Story time was magical!' },
          { player: 'One more story!', staff: '…and the sleepy dragon shared his cookies with everyone! 🐲🍪', feedback: '📖 What a cozy story!' },
          { player: 'Story, please!', staff: '…the tiny fairy watered one seed until it became a giant sunflower! 🌻', feedback: '📖 The end — for now!' },
        ],
      },
      {
        key: 'count', emoji: '🔢', label: 'Counting game', burst: '✨',
        lines: [
          { player: '1, 2, 3, 4…', staff: '…8, 9, 10! Perfect counting! 🎉', feedback: '🔢 You counted all the way to ten!' },
          { player: '2, 4, 6…', staff: '…8, 10! Counting by twos, amazing! 🌟', feedback: '🔢 Super speedy counting!' },
        ],
      },
      {
        key: 'song', emoji: '🎵', label: 'Sing along', burst: '🎵',
        lines: [
          { player: 'La la la~ 🎵', staff: 'Beautiful! The whole class is humming along! 🎶', feedback: '🎵 What a lovely song!' },
          { player: 'Mi mi mi mo~ 🎶', staff: 'Encore! Encore! 👏', feedback: '🎵 The classroom loved your song!' },
        ],
      },
      { key: 'power', emoji: '✨', label: 'Learn a power', type: 'learnPower' },
    ],
  },

  hospital: {
    title: '🏥 Welcome to the hospital!',
    hint: 'The doctor will make sure you feel great!',
    staff: { name: 'Doctor', species: 'bear', color: '#fdf3e7', hat: nurseCap },
    dress: dressHospital,
    floor: '#eef6ff', walls: '#f6fbff', back: '#e8f3ff', sky: '#eaf6ff', rug: '#d8ecff',
    chats: [
      { player: 'Doctor, are you busy?', staff: 'Never too busy for you! 🩺' },
      { player: 'Being healthy is fun!', staff: 'Eat well, sleep well, play lots! 💪' },
      { player: 'Are shots scary?', staff: 'Just a tiny pinch — and you get a sticker! 🩹' },
      { player: 'Thank you for helping everyone!', staff: 'Helping mimimos is the best job! 💖' },
    ],
    actions: [
      {
        key: 'checkup', emoji: '🩺', label: 'Check-up', burst: '💖',
        lines: [
          { player: 'I came for a check-up!', staff: 'Thump-thump! Your heart sounds happy and strong! 💖', feedback: '🩺 You are super healthy!' },
          { player: 'Check me, please!', staff: 'Say ahh… aaah! All sparkly in there! ✨', feedback: '🩺 A perfect check-up!' },
          { player: 'Am I okay, doctor?', staff: 'Big deep breath… whoosh! Wonderful lungs! 🌬️', feedback: '🩺 Fit as a fiddle!' },
        ],
      },
      {
        key: 'teeth', emoji: '🦷', label: 'Tooth check', burst: '✨',
        lines: [
          { player: 'Are my teeth okay?', staff: 'Open wide… what shiny, sparkly teeth! 🦷✨', feedback: '🦷 Sparkly clean teeth!' },
          { player: 'I brushed this morning!', staff: 'I can tell — they twinkle like stars! ⭐', feedback: '🦷 Keep on brushing!' },
        ],
      },
      { key: 'sticker', emoji: '🩹', label: 'Boo-boo sticker', type: 'grant', items: ['bandage'], staffSay: 'A brave mimimo earns a boo-boo sticker! 🩹' },
      { key: 'vitamin', emoji: '🍊', label: 'Vitamin gummy', type: 'grant', items: ['vitamin'], staffSay: 'One yummy vitamin gummy a day! 🍊' },
    ],
  },

  restaurant: {
    title: '🍜 Welcome to the restaurant!',
    hint: 'Take a seat — the chef will cook anything you like!',
    staff: { name: 'Chef', species: 'kitty', color: '#ff8f8f', hat: chefHat },
    dress: dressRestaurant,
    floor: '#ffe3c9', walls: '#ffd9c2', back: '#ffcdb4', sky: '#fff0e5', rug: '#ffc9a3',
    chats: [
      { player: 'It smells amazing in here!', staff: 'Secret recipe: a spoonful of love! 💖' },
      { player: 'What is cooking, chef?', staff: 'Rainbow soup with extra sparkles! ✨' },
      { player: 'You are the best chef!', staff: 'And you are my favorite guest! 😻' },
      { player: 'Can I help cook one day?', staff: 'Of course! Little chefs welcome! 👩‍🍳' },
    ],
    actions: [
      { key: 'noodles', emoji: '🍜', label: 'Order noodles', type: 'meal', playerSay: 'Slurp slurp… so good!', staffSay: 'One warm noodle soup, coming up! 🍜', feedback: '🍜 You slurped up warm noodle soup!' },
      { key: 'pizza', emoji: '🍕', label: 'Order pizza', type: 'meal', playerSay: 'Mmm, stretchy cheese!', staffSay: 'Cheesy pizza, fresh and hot! 🍕', feedback: '🍕 You munched a cheesy pizza slice!' },
      { key: 'pancakes', emoji: '🥞', label: 'Order pancakes', type: 'meal', playerSay: 'Fluffy and sweet!', staffSay: 'A tall tower of pancakes! 🥞', feedback: '🥞 You ate a fluffy pancake tower!' },
      { key: 'juice', emoji: '🧃', label: 'Order juice', type: 'meal', playerSay: 'Glug glug… yum!', staffSay: 'Fresh berry juice, extra bubbles! 🧃', feedback: '🧃 You drank fresh berry juice!' },
      { key: 'takeaway', emoji: '🥡', label: 'Takeaway box', type: 'grant', items: ['noodles', 'pizza', 'pancakes', 'juice'], staffSay: 'Packed with love — enjoy it later! 🥡' },
    ],
  },
};

function disposeSprite(sprite) {
  if (sprite.material?.map) sprite.material.map.dispose();
  if (sprite.material) sprite.material.dispose();
  sprite.removeFromParent();
}

/**
 * One shared interior scene for the school, hospital and restaurant.
 * `enter(config, key)` redresses the room and rebuilds the staff mimimo.
 */
export function makeVenueInterior() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#fff1e5');
  scene.add(new THREE.HemisphereLight('#fff8ef', '#d6b9e8', 1.15));
  const light = new THREE.DirectionalLight('#fff0d5', 1.55);
  light.position.set(7, 12, 8);
  light.castShadow = true;
  scene.add(light);

  // room shell — tinted per venue on enter
  const floor = box(16, 0.4, 15, '#f4d9bd');
  floor.position.set(0, -0.2, -0.5);
  floor.receiveShadow = true;
  scene.add(floor);
  const rug = new THREE.Mesh(new THREE.CircleGeometry(3.2, 28), toon('#ffd9a1'));
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0, 0.02, 1.5);
  scene.add(rug);
  const back = box(16, 6.5, 0.4, '#ffe1d4');
  back.position.set(0, 3.25, ROOM.backZ - 0.5);
  scene.add(back);
  const sideWalls = [];
  for (const side of [-1, 1]) {
    const wall = box(0.4, 6.5, 15, '#ffe9dc');
    wall.position.set(side * 7.8, 3.25, -0.5);
    scene.add(wall);
    sideWalls.push(wall);
  }

  const dressGroup = new THREE.Group();
  scene.add(dressGroup);

  let player = null;
  let staff = null;
  let staffBubble = null;
  let playerBubble = null;
  let activeKey = null;
  let heading = Math.PI;
  const sparkles = [];

  function spec() {
    return VENUE_SPECS[activeKey] || VENUE_SPECS.school;
  }

  function setStaffMessage(message) {
    if (!staff) return;
    if (staffBubble) disposeSprite(staffBubble);
    staffBubble = textSprite(message, { fontSize: 36 });
    staffBubble.position.y = 3.6;
    staff.add(staffBubble);
  }

  function setPlayerMessage(message) {
    if (!player) return;
    if (playerBubble) disposeSprite(playerBubble);
    playerBubble = textSprite(message, { fontSize: 36 });
    playerBubble.position.y = 2.9;
    player.add(playerBubble);
  }

  function spawnBurst(emojis, position, count = 10) {
    for (let i = 0; i < count; i++) {
      const sprite = emojiSprite(pick(emojis), rand(0.4, 0.8));
      sprite.position.set(
        position.x + rand(-0.7, 0.7),
        position.y + rand(0.6, 1.6),
        position.z + rand(-0.7, 0.7)
      );
      scene.add(sprite);
      sparkles.push({
        sprite,
        velocity: new THREE.Vector3(rand(-0.8, 0.8), rand(1.5, 2.8), rand(-0.8, 0.8)),
        life: 0,
        maxLife: rand(1.0, 1.7),
      });
    }
  }

  function clearDressing() {
    for (const child of [...dressGroup.children]) {
      child.traverse((obj) => {
        if (obj.material?.map) obj.material.map.dispose();
        if (obj.material) obj.material.dispose();
      });
      child.removeFromParent();
    }
    dressGroup.userData.steam = null;
  }

  function enter(config, key) {
    activeKey = key;
    const venue = spec();

    scene.background.set(venue.sky);
    floor.material.color.set(venue.floor);
    back.material.color.set(venue.back);
    for (const wall of sideWalls) wall.material.color.set(venue.walls);
    rug.material.color.set(venue.rug);

    clearDressing();
    venue.dress(dressGroup);
    shadowify(dressGroup);

    if (player) disposeMimimo(player);
    player = buildMimimo(config);
    playerBubble = null;
    player.position.set(0, 0, 4.5);
    player.rotation.y = Math.PI;
    heading = Math.PI;
    scene.add(player);

    if (staff) disposeMimimo(staff);
    staff = buildMimimo({ species: venue.staff.species, color: venue.staff.color, shape: 'classic' });
    staff.position.set(0, 0, -5.2);
    staff.rotation.y = 0;
    staff.scale.setScalar(0.9);
    const hat = venue.staff.hat();
    hat.position.set(0, 1.82, 0.02);
    hat.rotation.z = 0.06;
    staff.add(hat);
    const tag = textSprite(venue.staff.name, { fontSize: 34 });
    tag.position.y = 2.8;
    staff.add(tag);
    scene.add(staff);
    staffBubble = null;
    setStaffMessage(venue.hint);
  }

  function talkToStaff() {
    const chat = pick(spec().chats);
    setPlayerMessage(chat.player);
    setStaffMessage(chat.staff);
    return chat;
  }

  function doAction(actionKey) {
    const action = spec().actions.find((entry) => entry.key === actionKey);
    if (!action || !player) return null;

    if (action.type === 'learnPower') {
      return { type: 'learnPower' };
    }

    if (action.type === 'grant') {
      const itemKey = pick(action.items);
      const item = ITEM_BY_KEY[itemKey];
      grantItem(itemKey);
      setPlayerMessage('Thank you! 💖');
      setStaffMessage(action.staffSay);
      spawnBurst([item.emoji, '✨'], player.position, 8);
      return { feedback: `${item.emoji} ${item.name} is tucked in your bag!`, granted: true };
    }

    if (action.type === 'meal') {
      setPlayerMessage(action.playerSay);
      setStaffMessage(action.staffSay);
      spawnBurst([action.emoji, '✨', '💖'], player.position, 10);
      return { feedback: action.feedback };
    }

    const line = pick(action.lines);
    setPlayerMessage(line.player);
    setStaffMessage(line.staff);
    if (action.burst) spawnBurst([action.burst, '✨'], player.position, 8);
    return { feedback: line.feedback };
  }

  /** Big cheer from the staff — used when a new power is learned. */
  function celebrate(staffMessage, emoji) {
    setPlayerMessage('I did it! 🎉');
    setStaffMessage(staffMessage);
    if (player) spawnBurst([emoji, '✨', '🎉'], player.position, 14);
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
    if (staff) animateMimimo(staff, t + 1.7, dt, false);

    const steam = dressGroup.userData.steam;
    if (steam) {
      for (const puff of steam) {
        puff.mesh.position.y = puff.baseY + Math.sin(t * 1.8 + puff.phase) * 0.16;
      }
    }

    for (let i = sparkles.length - 1; i >= 0; i--) {
      const s = sparkles[i];
      s.life += dt;
      s.sprite.position.addScaledVector(s.velocity, dt);
      s.sprite.material.opacity = Math.max(0, 1 - s.life / s.maxLife);
      if (s.life >= s.maxLife) {
        disposeSprite(s.sprite);
        sparkles.splice(i, 1);
      }
    }
  }

  return {
    scene,
    enter,
    update,
    doAction,
    celebrate,
    talkToStaff,
    getActions: () => spec().actions.map(({ key, emoji, label }) => ({ key, emoji, label })),
    getTitle: () => spec().title,
    getHint: () => spec().hint,
    getStaffName: () => spec().staff.name,
    getPlayerPos: () => (player ? player.position : new THREE.Vector3()),
    getActiveKey: () => activeKey,
  };
}
