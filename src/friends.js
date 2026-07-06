import * as THREE from 'three';
import { buildMimimo, animateMimimo, randomName, SPECIES, COLORS } from './mimimo.js';
import { textSprite, emojiSprite, rand, pick } from './utils.js';

const _dir = new THREE.Vector3();

function turnToward(group, dx, dz, dt, rate = 8) {
  const target = Math.atan2(dx, dz);
  let delta = target - group.rotation.y;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  group.rotation.y += delta * Math.min(1, dt * rate);
}

/**
 * Friendly NPC mimimos that wander near their homes and blow hearts
 * when your mimimo comes close — plus a little pet that follows you.
 */
export function makeFriends(scene, player) {
  const friends = [];
  const homes = [
    { x: -12, z: -12 },
    { x: 5, z: -19 },
    { x: 14, z: -9 },
  ];

  for (const home of homes) {
    const friend = buildMimimo({ species: pick(Object.keys(SPECIES)), color: pick(COLORS) });
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

    friend.userData.ai = { home, target: null, wait: rand(0, 2), heart };
    friends.push(friend);
  }

  // the pet: a tiny random mimimo that tags along (hidden until play starts,
  // so it doesn't photobomb the character creator)
  const petInner = buildMimimo({ species: pick(Object.keys(SPECIES)), color: pick(COLORS) });
  const pet = new THREE.Group();
  pet.add(petInner);
  pet.scale.setScalar(0.45);
  pet.visible = false;
  scene.add(pet);

  function showPet() {
    pet.position.set(player.position.x - 1.8, 0, player.position.z + 1.2);
    pet.visible = true;
  }

  function hidePet() {
    pet.visible = false;
  }

  function update(dt, t) {
    // --- wandering friends ---
    for (const friend of friends) {
      const ai = friend.userData.ai;
      let moving = false;

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

      // greet the player with a floating heart
      const near = friend.position.distanceTo(player.position) < 3.2;
      ai.heart.visible = near;
      if (near) {
        ai.heart.position.y = 3.1 + Math.sin(t * 3) * 0.15;
        _dir.subVectors(player.position, friend.position);
        turnToward(friend, _dir.x, _dir.z, dt, 4);
      }

      animateMimimo(friend, t + friend.id, dt, moving);
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

  return { update, showPet, hidePet };
}
