# 🌸 MIMIMO Land

A cozy web-based kids' game built with [three.js](https://threejs.org). Make a
mimimo — any living thing you can imagine — and hop out into a candy world
where the clouds are pink cotton candy, the trees are purple, the grass is
blue, and the houses are shaped like animals.

## Play

```bash
npm install
npm run dev
```

Then open the printed URL (defaults to http://localhost:5173).

**Controls**

| Action  | Desktop            | Touch                |
| ------- | ------------------ | -------------------- |
| Explore | WASD / arrow keys  | Drag the wheel       |
| Magic ✨ | SPACE or M         | Tap the ✨ button     |

Magic makes flowers grow! Walk up to other mimimos to say hi — they'll send
you hearts. A little pet mimimo follows you everywhere.

## What's here so far

- **Character creator** — pick a species (bunny, kitty, dragon, ducky, blob),
  a candy color, and a name (or roll the 🎲). Your mimimo is saved in the
  browser and waiting next time you visit.
- **The world** — blue grass meadow, purple blob & lollipop trees, drifting
  cotton-candy clouds, a smiling sun, a rainbow, and an animal village with
  bunny-, kitty-, and froggy-shaped houses.
- **Life** — three friendly mimimos wander the village, and your pet tags
  along behind you.
- **Magic** — sparkle bursts, expanding rings, a happy twirl, and flowers
  that grow where your magic lands.

## Project layout

```
index.html        UI shell: character creator + in-game HUD
src/style.css     Candy-sticker UI styling
src/main.js       Bootstrap, game states (creator/play), camera, game loop
src/world.js      Sky, sun, rainbow, ground, flowers, lights
src/clouds.js     Cotton-candy clouds
src/trees.js      Purple trees
src/houses.js     Animal-shaped houses (+ collision circles)
src/mimimo.js     Procedural character builder + shared hop animation
src/friends.js    Wandering NPC mimimos and the follower pet
src/magic.js      Sparkles, rings, growing flowers
src/input.js      Keyboard + virtual joystick
src/utils.js      Toon materials, sprites, colliders, helpers
```

## Ideas for what's next

- Enter houses (interiors!) and build/decorate your own animal house
- Adopt more pets, name them, feed them
- Friends you can befriend → partners → mimimo kids
- More spells: rainbow bridges, growing giant trees, weather magic
- Day/night with a sleepy moon, fireflies
- Sounds & music (add on first user tap so autoplay rules are happy)
- Multiplayer mimimo village
