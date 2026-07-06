# 🌸 MIMIMO Land

A cozy web-based kids' game built with [three.js](https://threejs.org). Make a
mimimo — any living thing you can imagine — and hop out into a candy world
where the clouds are pink cotton candy, the trees are purple, the grass is
blue, the houses are shaped like animals, and there's a whole town to explore.

## Play

```bash
npm install
npm run dev
```

Then open the printed URL (defaults to http://localhost:5173).

**Controls**

| Action        | Desktop            | Touch                |
| ------------- | ------------------ | -------------------- |
| Explore       | WASD / arrow keys  | Drag the wheel       |
| Magic ✨       | SPACE or M         | Tap the ✨ button     |
| Say hi 👋      | H                  | Tap the 👋 button     |
| Go inside 🚪  | E (by a door)      | Tap the door prompt  |

Magic makes flowers grow! Say hi to other mimimos and they'll wave and chat
back with little speech bubbles. Walk up to any animal house and go inside to
**build and decorate your own room** — it's saved per house for next time.

## What's here

- **Character creator** — pick from **10 species** including mythical ones
  (bunny, kitty, puppy, bear, foxy, ducky, blob, dragon 🐲, unicorn 🦄,
  phoenix 🔥), choose a **body shape** (classic or round), one of **20 candy
  colors**, and a name (or roll the 🎲). Saved in the browser for next time.
- **A whole candy land** —
  - **Village** of eight animal-shaped houses (bunny, kitty, froggy, puppy,
    bear, ducky, foxy, piggy) that you can walk into.
  - **Town square** with a supermarket, bakery, ice-cream parlor, candy shop,
    toy shop and market stalls.
  - **Park** with a pond, swings, a slide, benches, lamps and flowers.
  - **Beach** with striped umbrellas, towels, beach balls and a sandcastle.
  - **Swimming pool** with a diving board, ring floats and a tiled deck.
  - A **forest** grove, purple candy trees, cotton-candy clouds, a smiling sun
    and a rainbow.
- **House interiors** — go inside any house and decorate with beds, sofas,
  chairs, tables, lamps, plants, TVs, rugs, teddies and balloons. Each house
  remembers its own layout.
- **Life & chatter** — friendly mimimos wander every district, wave, blow
  hearts and pop up speech bubbles; a little pet tags along behind you.
- **Magic** — sparkle bursts, expanding rings, a happy twirl, and flowers that
  grow where your magic lands.

## Project layout

```
index.html        UI shell: character creator + in-game/build HUD
src/style.css     Candy-sticker UI styling
src/main.js       Bootstrap, game states (creator/play/interior), camera, loop
src/world.js      Sky, sun, rainbow, ground, flowers, lights
src/clouds.js     Cotton-candy clouds
src/trees.js      Purple trees + the forest grove
src/houses.js     Animal-shaped houses (+ door positions, collision circles)
src/town.js       Shops, market stalls, plaza, signposts
src/nature.js     Park, beach and swimming pool
src/mimimo.js     Procedural character builder (species/shapes) + hop animation
src/friends.js    Wandering NPC mimimos, greetings/speech, the follower pet
src/interior.js   House interiors + the build-your-own-room system
src/magic.js      Sparkles, rings, growing flowers
src/input.js      Keyboard + virtual joystick
src/utils.js      Toon materials, sprites, colliders, helpers
```

## Ideas for what's next

- Real online multiplayer (a shared village over the network)
- Adopt more pets, name them, feed them
- Friends you can befriend → partners → mimimo kids
- More spells: rainbow bridges, growing giant trees, weather magic
- Day/night with a sleepy moon, fireflies
- Sounds & music (add on first user tap so autoplay rules are happy)
