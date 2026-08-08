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

Choose **MIMIMO Lab · 奇想实验室** from the character creator, or open
http://localhost:5173/lab/ directly, for the bilingual learning experience.
The Lab is designed for a child and adult learning together on a laptop.

**Controls**

| Action        | Desktop            | Touch                |
| ------------- | ------------------ | -------------------- |
| Explore       | WASD / arrow keys  | Drag the wheel       |
| Turn the view | Drag the mouse     | —                    |
| Choose power  | Number keys 1–0     | Tap a power bubble   |
| Use power ✨   | SPACE or M          | Tap the big power button |
| Talk 👋        | H                   | Tap the 👋 button     |
| Fly / land 🪽  | F (flying species)  | Tap Fly / Land        |
| Use purchases | Open the 🎒 bag      | Open the 🎒 bag       |
| Interact 🚪   | E (by a door/pool) | Tap the prompt       |
| Rotate item   | R (inside a house) | Tap the ↻ button     |

Choose several powers at once, including levitation, teleportation, water,
fire, cloud and leaf magic. Say loving and friendly things to other mimimos and
they'll wave and chat back. Walk up to a house, shop or the pool and use its
interaction prompt. Purchases go into your bag: food can be eaten, drinks can
be sipped and toys can be played with again and again.

## What's here

- **Character creator** — pick from **12 species** including squid 🦑 and fairy
  🧚, choose a **body shape** (classic or round), one of **20 candy colors**,
  multiple powers and a name (or roll the 🎲). Saved in the browser for next
  time. Ducky, fairy, dragon and phoenix mimimos really fly.
- **MIMIMO Lab / 奇想实验室** — a separate Chinese/English interactive space
  for short, hands-on AI literacy and AI application experiments. The first
  experiment compares repeatable rule-based answers with varied AI samples,
  asks the learner to check both, then turns the evidence and decision into a
  Feature Passport.
- **A whole candy land** —
  - **Village** of eight animal-shaped houses (bunny, kitty, froggy, puppy,
    bear, ducky, foxy, piggy) that you can walk into.
  - **Town square** with an enterable supermarket, bakery, ice-cream parlor,
    candy shop and toy shop. Each has a cashier to talk to, carts and usable
    items to buy.
  - **Park** with a pond, swings, a slide, benches, lamps and flowers.
  - **Beach** with striped umbrellas, towels, beach balls and a sandcastle.
  - **Swimming pool** with a diving board, ring floats and a tiled deck. Dive
    below it to swim with fish and sharks around a coral reef.
  - A **forest** grove, purple candy trees, cotton-candy clouds, a smiling sun
    and a rainbow.
- **My house** — use the always-visible house button in regular Mimimo Land to
  build or remodel your saved home with any Mimimo shape, color and 1–3
  interior floors without losing each floor's furniture.
- **A giant Cloudland town** — a much bigger cloud island with all eight animal
  houses, all five shops, the school, hospital and restaurant, plus nine lots
  where mimimos can choose 1–3 separately decorated interior floors, any Mimimo
  shape and any candy color
  for their own saved cloud homes.
- **Rainbow Cloud Castle** — an enterable castle made from pink, light-blue,
  yellow and purple clouds. Twinkle and Starmane live nearby and answer when a
  mimimo talks to them.
- **House interiors** — decorate with beds, sofas, chairs, tables, lamps,
  plants, TVs, rugs, teddies and balloons. Rotate each item before placing it.
  Custom homes can have 1–3 interior floors, and every floor remembers its own
  layout. Walk to a bed to sleep, then wake at dawn.
- **A living sky** — time moves through dawn, day, dusk and midnight. The clock
  button jumps ahead when you want to see the next phase.
- **Life & chatter** — friendly mimimos wander every district, wave, blow
  hearts and pop up speech bubbles; a little pet tags along behind you.
- **Magic** — select any combination of flower, rainbow, bubble, heart,
  levitation, teleportation, water, fire, cloud and leaf powers, then switch
  between them from the HUD or number keys.

## Project layout

```
index.html        UI shell: character creator + in-game/build HUD
lab/index.html    Bilingual MIMIMO Lab page (built as a separate Vite entry)
src/style.css     Candy-sticker UI styling
src/main.js       Bootstrap, game states, interactions, camera and main loop
src/lab/          Lab interactions, translations, experiment data and progress
src/world.js      Animated day/night sky, sun, moon, stars, ground and lights
src/clouds.js     Cotton-candy clouds
src/trees.js      Purple trees + the forest grove
src/houses.js     Animal-shaped houses (+ door positions, collision circles)
src/town.js       Shop exteriors, doors, market stalls, plaza, signposts
src/shop.js       Shop interiors, cashiers, carts, products and checkout
src/nature.js     Park, beach, swimming pool and dive trigger
src/underwater.js Fish, sharks, coral reef and underwater swimming
src/mimimo.js     Procedural character builder (species/shapes) + hop animation
src/friends.js    Wandering NPC mimimos, greetings/speech, the follower pet
src/interior.js   House interiors + the build-your-own-room system
src/magic.js      Flower, rainbow, bubble and heart powers
src/input.js      Keyboard + virtual joystick
src/utils.js      Toon materials, sprites, colliders, helpers
src/cloudland.js  Giant sky town, cloud castle, residents + cloud house lots
```

## Ideas for what's next

- Real online multiplayer (a shared village over the network)
- Adopt more pets, name them, feed them
- Friends you can befriend → partners → mimimo kids
- More spells: rainbow bridges, growing giant trees, weather magic
- Weather, seasons and fireflies
- Sounds & music (add on first user tap so autoplay rules are happy)
