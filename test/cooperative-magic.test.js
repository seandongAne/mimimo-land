import assert from 'node:assert/strict';
import test from 'node:test';

import {
  COOPERATIVE_MAGIC_COMBO_IDS,
  COOPERATIVE_MAGIC_COMBOS,
  playCooperativeMagicCombo,
} from '../src/cooperative-magic.js';

function validEvent(overrides = {}) {
  return {
    comboId: 'combo-123',
    type: 'rainbow-garden',
    locationId: 'world',
    position: { x: 2, y: 0.5, z: -4 },
    contributors: [
      { playerId: 'player-a', name: 'Fiora' },
      { playerId: 'player-b', name: 'Mimi' },
    ],
    ...overrides,
  };
}

function playbackHarness({ locationId = 'world' } = {}) {
  let currentLocationId = locationId;
  const calls = [];
  const scheduled = [];
  const announcements = [];
  const magic = {
    cast(position, power) {
      calls.push({ position, power });
    },
  };
  const options = {
    getMagicForLocation(requestedLocationId) {
      calls.push({ resolved: requestedLocationId });
      return magic;
    },
    getCurrentLocationId() {
      return currentLocationId;
    },
    announce(message) {
      announcements.push(message);
    },
    schedule(callback, delayMs) {
      scheduled.push({ callback, delayMs });
    },
  };
  return {
    announcements,
    calls,
    options,
    scheduled,
    setLocation(nextLocationId) {
      currentLocationId = nextLocationId;
    },
  };
}

test('exports the three stable cooperative-magic recipe ids and friendly metadata', () => {
  assert.deepEqual(COOPERATIVE_MAGIC_COMBO_IDS, [
    'rainbow-garden',
    'sky-bridge',
    'friendship-fountain',
  ]);
  for (const comboId of COOPERATIVE_MAGIC_COMBO_IDS) {
    const recipe = COOPERATIVE_MAGIC_COMBOS[comboId];
    assert.equal(typeof recipe.title, 'string');
    assert.ok(recipe.title.length > 0);
    assert.equal(typeof recipe.emoji, 'string');
    assert.ok(recipe.emoji.length > 0);
    assert.ok(recipe.casts.length >= 3);
  }
});

for (const type of COOPERATIVE_MAGIC_COMBO_IDS) {
  test(`${type} casts its complete recipe in order`, () => {
    const harness = playbackHarness();
    const recipe = COOPERATIVE_MAGIC_COMBOS[type];

    assert.equal(
      playCooperativeMagicCombo(validEvent({ comboId: `combo-${type}`, type }), harness.options),
      true,
    );

    assert.deepEqual(
      harness.calls.filter((call) => call.power).map((call) => call.power),
      [recipe.casts[0].power],
    );
    assert.deepEqual(
      harness.scheduled.map((entry) => entry.delayMs),
      recipe.casts.slice(1).map((cast) => cast.delayMs),
    );

    for (const scheduled of harness.scheduled) scheduled.callback();

    assert.deepEqual(
      harness.calls.filter((call) => call.power).map((call) => call.power),
      recipe.casts.map((cast) => cast.power),
    );
    assert.deepEqual(
      harness.calls.filter((call) => call.power).map((call) => call.position),
      recipe.casts.map(() => ({ x: 2, y: 0.5, z: -4 })),
    );
    assert.match(harness.announcements[0], new RegExp(recipe.title));
    assert.match(harness.announcements[0], /Fiora \+ Mimi/);
  });
}

test('does not play an event for a different current location', () => {
  const harness = playbackHarness({ locationId: 'cloudland' });

  assert.equal(playCooperativeMagicCombo(validEvent(), harness.options), false);
  assert.deepEqual(harness.calls, []);
  assert.deepEqual(harness.scheduled, []);
  assert.deepEqual(harness.announcements, []);
});

test('delayed casts stop if the player moves to another location', () => {
  const harness = playbackHarness();

  assert.equal(playCooperativeMagicCombo(validEvent(), harness.options), true);
  harness.setLocation('underwater');
  for (const scheduled of harness.scheduled) scheduled.callback();

  assert.deepEqual(
    harness.calls.filter((call) => call.power).map((call) => call.power),
    ['water'],
  );
});

test('each scheduled cast runs at most once', () => {
  const harness = playbackHarness();
  assert.equal(playCooperativeMagicCombo(validEvent(), harness.options), true);

  for (const scheduled of harness.scheduled) {
    scheduled.callback();
    scheduled.callback();
  }

  assert.equal(
    harness.calls.filter((call) => call.power).length,
    COOPERATIVE_MAGIC_COMBOS['rainbow-garden'].casts.length,
  );
});

test('rejects malformed or unsafe network events without side effects', () => {
  const badEvents = [
    null,
    [],
    validEvent({ comboId: '' }),
    validEvent({ comboId: '../not-safe' }),
    validEvent({ type: 'not-a-recipe' }),
    validEvent({ type: 'toString' }),
    validEvent({ locationId: '../secret' }),
    validEvent({ position: null }),
    validEvent({ position: [2, 0.5, -4] }),
    validEvent({ position: { x: '2', y: 0.5, z: -4 } }),
    validEvent({ position: { x: Number.NaN, y: 0.5, z: -4 } }),
    validEvent({ position: { x: 1001, y: 0.5, z: -4 } }),
    validEvent({ contributors: [{ playerId: 'player-a', name: 'Fiora' }] }),
    validEvent({ contributors: [{ name: 'Fiora' }, { playerId: 'player-b', name: 'Mimi' }] }),
    validEvent({ contributors: [{ playerId: 'player-a', name: 'Fiora' }, { playerId: 'player-b', name: '' }] }),
    validEvent({ contributors: [{ playerId: 'same', name: 'Fiora' }, { playerId: 'same', name: 'Mimi' }] }),
    validEvent({ contributors: ['Fiora', 'Mimi'] }),
    validEvent({ contributors: Array.from({ length: 6 }, (_, index) => ({ playerId: `p-${index}`, name: `M${index}` })) }),
  ];

  for (const event of badEvents) {
    const harness = playbackHarness();
    assert.equal(playCooperativeMagicCombo(event, harness.options), false);
    assert.deepEqual(harness.calls, []);
    assert.deepEqual(harness.scheduled, []);
    assert.deepEqual(harness.announcements, []);
  }
});

test('announcement names are short plain text, not HTML', () => {
  const harness = playbackHarness();
  const event = validEvent({
    contributors: [
      { playerId: 'player-a', name: '<b>Fi\u202eora</b>' },
      { playerId: 'player-b', name: 'Mimi & Friends' },
      { playerId: 'player-c', name: `A very very very very long name` },
    ],
  });

  assert.equal(playCooperativeMagicCombo(event, harness.options), true);
  assert.equal(harness.announcements.length, 1);
  assert.doesNotMatch(harness.announcements[0], /[<>&\u202e]/u);
  assert.match(harness.announcements[0], /Fiora, Mimi Friends \+ A very very very very l/);
});

test('rejects missing or invalid playback dependencies', () => {
  const harness = playbackHarness();
  assert.equal(playCooperativeMagicCombo(validEvent()), false);
  assert.equal(playCooperativeMagicCombo(validEvent(), {
    ...harness.options,
    schedule: 42,
  }), false);
  assert.equal(playCooperativeMagicCombo(validEvent(), {
    ...harness.options,
    getMagicForLocation: () => null,
  }), false);
});
