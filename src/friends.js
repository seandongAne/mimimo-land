import * as THREE from 'three';
import { buildMimimo, animateMimimo, randomName, SPECIES, SHAPES, COLORS } from './mimimo.js';
import { textSprite, emojiSprite, rand, pick } from './utils.js';

const _dir = new THREE.Vector3();

// friendly things the mimimos say when you come near
const GREETINGS = [
  'Hi! 👋', 'Hello!', "Let's play!", 'Wanna be friends?',
  'Yay! ✨', 'So happy!', 'Nice day! 🌸', 'Hehe!', 'Ooh, hi!',
];
const AMBIENT = ['✨', '🎵', '💭', '🌸', '☁️'];

// where the wandering mimimos hang out — one near each district
const HOMES = [
  { x: -12, z: -10 }, { x: 10, z: -13 }, { x: -4, z: -30 }, // village
  { x: -38, z: 6 }, { x: -43, z: 1 },                        // park
  { x: 38, z: 2 }, { x: 45, z: 8 },                          // town plaza
  { x: -4, z: 42 }, { x: 17, z: 33 },                        // beach & pool
];

function turnToward(group, dx, dz, dt, rate = 8) {
  const target = Math.atan2(dx, dz);
  let delta = target - group.rotation.y;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  group.rotation.y += delta * Math.min(1, dt * rate);
}

/** Show a word/emoji bubble above something, replacing any previous one. */
function setBubble(host, text, y = 3.4) {
  if (host.userData.bubble) {
    host.remove(host.userData.bubble);
    host.userData.bubble.material.map.dispose();
    host.userData.bubble.material.dispose();
  }
  const bubble = textSprite(text, { fontSize: 40 });
  bubble.position.y = y;
  host.add(bubble);
  host.userData.bubble = bubble;
  host.userData.bubbleTime = 2.4;
}

function hideBubble(host) {
  if (host.userData.bubble) {
    host.remove(host.userData.bubble);
    host.userData.bubble.material.map.dispose();
    host.userData.bubble.material.dispose();
    host.userData.bubble = null;
  }
  host.userData.bubbleTime = 0;
}

/**
 * A lively village of NPC mimimos that wander, wave, and chat with little
 * speech bubbles — and a pet that follows you. `greet()` lets the player
 * say hi to everyone nearby (all local, no network needed).
 */
export function makeFriends(scene, player) {
  const friends = [];
  const speciesKeys = Object.keys(SPECIES);
  const shapeKeys = Object.keys(SHAPES);

  for (const home of HOMES) {
    const friend = buildMimimo({
      species: pick(speciesKeys),
      color: pick(COLORS),
      shape: pick(shapeKeys),
    });
    friend.position.set(home.x, 0, home.z);
    friend.rotation.y = rand(0, Math.PI * 2);
    scene.add(friend);

    const tag = textSprite(randomName());
    tag.position.y = 2.5;
    friend.add(tag);

    const heart = emojiSprite('💗', 0.8);
    heart.position.y = 3.1;
    heart.visible = false;
    friend.add(heart);

    friend.userData.ai = {
      home,
      target: null,
      wait: rand(0, 2),
      heart,
      chatCooldown: rand(2, 8),
      greetCooldown: 0,
    };
    friends.push(friend);
  }

  // the pet: a tiny random mimimo that tags along (hidden until play starts)
  const petInner = buildMimimo({ species: pick(speciesKeys), color: pick(COLORS), shape: pick(shapeKeys) });
  const pet = new THREE.Group();
  pet.add(petInner);
  pet.scale.setScalar(0.45);
  pet.visible = false;
  scene.add(pet);

  // a bubble the player can pop up when greeting
  player.userData.bubble = null;

  function showPet() {
    pet.position.set(player.position.x - 1.8, 0, player.position.z + 1.2);
    pet.visible = true;
  }

  function hidePet() {
    pet.visible = false;
  }

  /** Player says hi — pops a bubble and makes nearby mimimos wave back. */
  function greet() {
    setBubble(player, pick(['Hi! 👋', 'Hello!', 'Hiii ✨']), 2.7);
    for (const friend of friends) {
      if (friend.position.distanceTo(player.position) < 8) {
        const ai = friend.userData.ai;
        ai.heart.visible = true;
        ai.greetCooldown = 2.2;
        setBubble(friend, pick(GREETINGS));
        _dir.subVectors(player.position, friend.position);
        turnToward(friend, _dir.x, _dir.z, 1, 20);
      }
    }
  }

  function update(dt, t) {
    // --- wandering, chatting friends ---
    for (const friend of friends) {
      const ai = friend.userData.ai;
      let moving = false;

      if (ai.greetCooldown > 0) ai.greetCooldown -= dt;

      if (ai.wait > 0) {
        ai.wait -= dt;
      } else if (!ai.target) {
        const a = rand(0, Math.PI * 2);
        const d = rand(2, 7);
        ai.target = new THREE.Vector3(ai.home.x + Math.cos(a) * d, 0, ai.home.z + Math.sin(a) * d);
      } else {
        _dir.subVectors(ai.target, friend.position);
        _dir.y = 0;
        if (_dir.length() < 0.3) {
          ai.target = null;
          ai.wait = rand(1.5, 4);
        } else {
          _dir.normalize();
          friend.position.addScaledVector(_dir, dt * 1.3);
          turnToward(friend, _dir.x, _dir.z, dt, 5);
          moving = true;
        }
      }

      // greet the player with a heart + words when close
      const near = friend.position.distanceTo(player.position) < 3.6;
      ai.heart.visible = near || ai.greetCooldown > 0;
      if (near) {
        ai.heart.position.y = 3.1 + Math.sin(t * 3) * 0.15;
        _dir.subVectors(player.position, friend.position);
        turnToward(friend, _dir.x, _dir.z, dt, 4);
        if (friend.userData.bubbleTime <= 0 && ai.greetCooldown <= 0) {
          setBubble(friend, pick(GREETINGS));
          ai.greetCooldown = 3.5;
        }
      }

      // ambient chatter even when you're not around
      ai.chatCooldown -= dt;
      if (ai.chatCooldown <= 0) {
        ai.chatCooldown = rand(6, 14);
        if (!near && friend.userData.bubbleTime <= 0) setBubble(friend, pick(AMBIENT));
      }

      // fade out bubbles over time
      if (friend.userData.bubbleTime > 0) {
        friend.userData.bubbleTime -= dt;
        if (friend.userData.bubbleTime <= 0) hideBubble(friend);
      }

      animateMimimo(friend, t + friend.id, dt, moving);
    }

    // player bubble timer
    if (player.userData.bubbleTime > 0) {
      player.userData.bubbleTime -= dt;
      if (player.userData.bubbleTime <= 0) hideBubble(player);
    }

    // --- pet follows the player ---
    if (pet.visible) {
      _dir.subVectors(player.position, pet.position);
      _dir.y = 0;
      const dist = _dir.length();
      let petMoving = false;
      if (dist > 1.6) {
        _dir.normalize();
        const speed = Math.min(6, (dist - 1.4) * 3.5);
        pet.position.addScaledVector(_dir, dt * speed);
        turnToward(pet, _dir.x, _dir.z, dt, 8);
        petMoving = true;
      }
      animateMimimo(pet.children[0], t * 1.3, dt, petMoving);
    }
  }

  return { update, showPet, hidePet, greet };
}
