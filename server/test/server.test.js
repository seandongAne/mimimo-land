import assert from 'node:assert/strict';
import test from 'node:test';
import { io as createClient } from 'socket.io-client';

import { createMultiplayerServer, createOriginChecker } from '../index.js';
import {
  MAGIC_COMBO_COOLDOWN_MS,
  MAGIC_COMBO_RECIPES,
  MAGIC_COMBO_WINDOW_MS,
  MAX_PLAYERS,
  MAX_SESSIONS,
  PROTOCOL_VERSION,
} from '../protocol.js';

const PROFILE = Object.freeze({
  name: 'Mimimo',
  species: 'bunny',
  color: '#ff9ed2',
  shape: 'classic',
});

function payload(fields = {}) {
  return { protocolVersion: PROTOCOL_VERSION, ...fields };
}

function magicAction(power, {
  locationId = 'world',
  x = 0,
  y = 0,
  z = 0,
} = {}) {
  return payload({
    actionId: 'magic',
    locationId,
    payload: { power, position: { x, y, z } },
  });
}

function waitForEvent(socket, event, timeoutMs = 1_500) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, onEvent);
      reject(new Error(`Timed out waiting for ${event}`));
    }, timeoutMs);
    const onEvent = (value) => {
      clearTimeout(timer);
      resolve(value);
    };
    socket.once(event, onEvent);
  });
}

function expectNoEvent(socket, event, timeoutMs = 120) {
  return new Promise((resolve, reject) => {
    const onEvent = (value) => {
      clearTimeout(timer);
      reject(new Error(`Unexpected ${event}: ${JSON.stringify(value)}`));
    };
    const timer = setTimeout(() => {
      socket.off(event, onEvent);
      resolve();
    }, timeoutMs);
    socket.once(event, onEvent);
  });
}

function emitAck(socket, event, value, timeoutMs = 1_500) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${event} acknowledgement`)), timeoutMs);
    socket.emit(event, value, (result) => {
      clearTimeout(timer);
      resolve(result);
    });
  });
}

async function connectClient(url, options = {}) {
  const socket = createClient(url, {
    forceNew: true,
    reconnection: false,
    transports: ['websocket'],
    ...options,
  });
  await Promise.race([
    waitForEvent(socket, 'connect'),
    new Promise((_, reject) => socket.once('connect_error', reject)),
  ]);
  return socket;
}

async function makeHarness(options = {}) {
  const service = createMultiplayerServer(options);
  const address = await service.start(0, '127.0.0.1');
  const url = `http://127.0.0.1:${address.port}`;
  const clients = [];
  return {
    service,
    url,
    async client(clientOptions) {
      const socket = await connectClient(url, clientOptions);
      clients.push(socket);
      return socket;
    },
    async close() {
      for (const socket of clients) socket.disconnect();
      await service.stop();
    },
  };
}

async function createSession(socket, playerId = 'player_owner', profile = PROFILE) {
  const response = waitForEvent(socket, 'session:created');
  const ack = await emitAck(socket, 'session:create', payload({ playerId, profile }));
  assert.equal(ack.ok, true);
  return response;
}

async function joinSession(socket, sessionCode, playerId, profile = PROFILE) {
  const response = waitForEvent(socket, 'session:joined');
  const ack = await emitAck(socket, 'session:join', payload({ sessionCode, playerId, profile }));
  assert.equal(ack.ok, true);
  return response;
}

test('explicit origin configuration replaces the permissive local and GitHub defaults', () => {
  const defaults = createOriginChecker({});
  assert.equal(defaults('https://another-project.github.io'), true);
  assert.equal(defaults('http://localhost:5173'), true);
  assert.equal(createOriginChecker({ ALLOWED_ORIGINS: '' })('http://localhost:5173'), true);

  const configured = createOriginChecker({
    ALLOWED_ORIGINS: 'https://mimimo.example, https://friends.example',
  });
  assert.equal(configured(undefined), true);
  assert.equal(configured('https://mimimo.example'), true);
  assert.equal(configured('https://another-project.github.io'), false);
  assert.equal(configured('http://localhost:5173'), false);

  const wildcard = createOriginChecker({ CLIENT_ORIGIN: '*' });
  assert.equal(wildcard('https://another-project.github.io'), true);
});

test('health check and session:create return a complete versioned snapshot', async (t) => {
  const harness = await makeHarness();
  t.after(() => harness.close());

  const health = await fetch(`${harness.url}/health`).then((response) => response.json());
  assert.deepEqual(
    { status: health.status, protocolVersion: health.protocolVersion, sessions: health.sessions },
    { status: 'ok', protocolVersion: 1, sessions: 0 },
  );

  const owner = await harness.client();
  const snapshot = await createSession(owner);
  assert.match(snapshot.sessionCode, /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
  assert.equal(snapshot.protocolVersion, 1);
  assert.deepEqual(snapshot.furnitureByLocation, {});
  assert.deepEqual(snapshot.players, [{
    playerId: 'player_owner',
    profile: PROFILE,
    pose: {
      seq: 0,
      locationId: 'world',
      x: 0,
      y: 0,
      z: 0,
      rotation: 0,
      moving: false,
      flying: false,
    },
  }]);
});

test('join enforces five players and explicit leave removes and broadcasts the player', async (t) => {
  const harness = await makeHarness();
  t.after(() => harness.close());

  const owner = await harness.client();
  const { sessionCode } = await createSession(owner);
  const joined = [owner];

  for (let index = 1; index < MAX_PLAYERS; index += 1) {
    const client = await harness.client();
    const notification = waitForEvent(owner, 'player:joined');
    const snapshot = await joinSession(client, sessionCode, `player_${index}`);
    assert.equal(snapshot.players.length, index + 1);
    assert.equal((await notification).player.playerId, `player_${index}`);
    joined.push(client);
  }

  const overflow = await harness.client();
  const rejected = await emitAck(overflow, 'session:join', payload({
    sessionCode,
    playerId: 'player_overflow',
    profile: PROFILE,
  }));
  assert.equal(rejected.ok, false);
  assert.equal(rejected.error.code, 'SESSION_FULL');

  const left = waitForEvent(owner, 'player:left');
  const leaveAck = await emitAck(joined.at(-1), 'session:leave', payload());
  assert.equal(leaveAck.ok, true);
  assert.equal((await left).playerId, `player_${MAX_PLAYERS - 1}`);
  assert.equal(harness.service.sessions.get(sessionCode).players.size, MAX_PLAYERS - 1);
});

test('a new player takes the oldest disconnected slot while stable playerIds can reconnect', async (t) => {
  let clock = 10_000;
  const harness = await makeHarness({ now: () => clock });
  t.after(() => harness.close());

  const owner = await harness.client();
  const { sessionCode } = await createSession(owner);
  const players = [owner];
  for (let index = 1; index < MAX_PLAYERS; index += 1) {
    const client = await harness.client();
    await joinSession(client, sessionCode, `player_${index}`);
    players.push(client);
  }

  await emitAck(players[2], 'player:pose', payload({
    seq: 4,
    locationId: 'cloudland',
    x: 2,
    y: 3,
    z: 4,
    rotation: 0.5,
    moving: false,
    flying: true,
  }));

  const firstLeft = waitForEvent(owner, 'player:left');
  clock = 11_000;
  players[1].disconnect();
  assert.equal((await firstLeft).playerId, 'player_1');

  const secondLeft = waitForEvent(owner, 'player:left');
  clock = 12_000;
  players[2].disconnect();
  assert.equal((await secondLeft).playerId, 'player_2');

  const newcomer = await harness.client();
  const newcomerSnapshot = await joinSession(newcomer, sessionCode, 'player_new');
  const storedPlayers = harness.service.sessions.get(sessionCode).players;
  assert.equal(storedPlayers.size, MAX_PLAYERS);
  assert.equal(storedPlayers.has('player_1'), false);
  assert.equal(storedPlayers.has('player_2'), true);
  assert.equal(newcomerSnapshot.players.some((player) => player.playerId === 'player_new'), true);

  const reconnect = await harness.client();
  const reconnectSnapshot = await joinSession(reconnect, sessionCode, 'player_2');
  const restored = reconnectSnapshot.players.find((player) => player.playerId === 'player_2');
  assert.equal(restored.pose.seq, 4);
  assert.equal(restored.pose.locationId, 'cloudland');
  assert.equal(storedPlayers.size, MAX_PLAYERS);
});

test('stable playerId replaces an old socket and retains pose across reconnects', async (t) => {
  const harness = await makeHarness();
  t.after(() => harness.close());

  const owner = await harness.client();
  const { sessionCode } = await createSession(owner);
  const peer = await harness.client();
  await joinSession(peer, sessionCode, 'player_peer');

  const poseAck = await emitAck(owner, 'player:pose', payload({
    seq: 7,
    locationId: 'cloudland',
    x: 12,
    y: 4,
    z: -2,
    rotation: 1.5,
    moving: true,
    flying: true,
  }));
  assert.equal(poseAck.ok, true);

  const replaced = waitForEvent(owner, 'session:error');
  const replacement = await harness.client();
  const replacementSnapshot = await joinSession(replacement, sessionCode, 'player_owner', {
    ...PROFILE,
    name: 'Mimimo Again',
  });
  assert.equal((await replaced).code, 'CONNECTION_REPLACED');
  assert.equal(owner.connected, false);
  assert.equal(replacementSnapshot.players.length, 2);
  const restored = replacementSnapshot.players.find((player) => player.playerId === 'player_owner');
  assert.equal(restored.pose.seq, 7);
  assert.equal(restored.pose.locationId, 'cloudland');
  assert.equal(harness.service.sessions.get(sessionCode).players.size, 2);

  const left = waitForEvent(peer, 'player:left');
  replacement.disconnect();
  assert.equal((await left).playerId, 'player_owner');

  const rejoinedNotice = waitForEvent(peer, 'player:joined');
  const reconnect = await harness.client();
  const reconnectSnapshot = await joinSession(reconnect, sessionCode, 'player_owner', {
    ...PROFILE,
    name: 'Mimimo Again',
  });
  assert.equal((await rejoinedNotice).player.playerId, 'player_owner');
  assert.equal(
    reconnectSnapshot.players.find((player) => player.playerId === 'player_owner').pose.seq,
    7,
  );
});

test('actions are enum-validated, rate-limited, and only sent to the same location', async (t) => {
  const harness = await makeHarness();
  t.after(() => harness.close());

  const owner = await harness.client();
  const { sessionCode } = await createSession(owner);
  const nearby = await harness.client();
  const farAway = await harness.client();
  await joinSession(nearby, sessionCode, 'player_nearby');
  await joinSession(farAway, sessionCode, 'player_far_away');
  await emitAck(farAway, 'player:pose', payload({
    seq: 1,
    locationId: 'underwater',
    x: 0,
    y: 0,
    z: 0,
    rotation: 0,
    moving: false,
    flying: false,
  }));

  const received = waitForEvent(nearby, 'player:action');
  const notReceived = expectNoEvent(farAway, 'player:action');
  const actionAck = await emitAck(owner, 'player:action', payload({
    actionId: 'wave',
    locationId: 'world',
    payload: {},
  }));
  assert.equal(actionAck.ok, true);
  assert.deepEqual(await received, {
    protocolVersion: 1,
    playerId: 'player_owner',
    actionId: 'wave',
    locationId: 'world',
    payload: {},
  });
  await notReceived;

  const invalid = await emitAck(owner, 'player:action', payload({
    actionId: 'phrase',
    locationId: 'world',
    payload: { phraseId: 'free-form-text' },
  }));
  assert.equal(invalid.ok, false);
  assert.equal(invalid.error.code, 'INVALID_ACTION');

  let rateLimited = null;
  for (let index = 0; index < 8; index += 1) {
    const result = await emitAck(owner, 'player:action', payload({
      actionId: 'wave',
      locationId: 'world',
      payload: {},
    }));
    if (!result.ok) rateLimited = result;
  }
  assert.equal(rateLimited?.error.code, 'RATE_LIMITED');
});

test('two players can trigger every cooperative magic recipe for everyone in their location', async (t) => {
  const harness = await makeHarness();
  t.after(() => harness.close());

  const owner = await harness.client();
  const { sessionCode } = await createSession(owner);
  const peer = await harness.client();
  const observer = await harness.client();
  const farAway = await harness.client();
  await joinSession(peer, sessionCode, 'player_peer', { ...PROFILE, name: 'Pip' });
  await joinSession(observer, sessionCode, 'player_observer', { ...PROFILE, name: 'Lumi' });
  await joinSession(farAway, sessionCode, 'player_far', { ...PROFILE, name: 'Nova' });
  await emitAck(farAway, 'player:pose', payload({
    seq: 1,
    locationId: 'underwater',
    x: 0,
    y: 0,
    z: 0,
    rotation: 0,
    moving: false,
    flying: false,
  }));

  const ownerCombo = waitForEvent(owner, 'magic:combo');
  const peerCombo = waitForEvent(peer, 'magic:combo');
  const observerCombo = waitForEvent(observer, 'magic:combo');
  const farAwayCombo = expectNoEvent(farAway, 'magic:combo');
  await emitAck(owner, 'player:action', magicAction('water', { x: 2, y: 4, z: 6 }));
  const comboAck = await emitAck(
    peer,
    'player:action',
    magicAction('blossom', { x: 6, y: 8, z: 10 }),
  );
  const combos = await Promise.all([ownerCombo, peerCombo, observerCombo]);
  await farAwayCombo;

  assert.equal(comboAck.ok, true);
  assert.equal(comboAck.comboId, combos[0].comboId);
  assert.deepEqual(combos[1], combos[0]);
  assert.deepEqual(combos[2], combos[0]);
  assert.equal(combos[0].protocolVersion, PROTOCOL_VERSION);
  assert.match(combos[0].comboId, /^combo-[0-9a-f-]+$/i);
  assert.equal(combos[0].type, 'rainbow-garden');
  assert.equal(combos[0].locationId, 'world');
  assert.deepEqual(combos[0].position, { x: 4, y: 6, z: 8 });
  assert.deepEqual(combos[0].contributors, [
    { playerId: 'player_owner', name: 'Mimimo' },
    { playerId: 'player_peer', name: 'Pip' },
  ]);
  assert.deepEqual(combos[0].powers, ['water', 'blossom']);

  for (const type of ['sky-bridge', 'friendship-fountain']) {
    const [firstPower, secondPower] = MAGIC_COMBO_RECIPES[type];
    const received = waitForEvent(owner, 'magic:combo');
    await emitAck(owner, 'player:action', magicAction(firstPower));
    await emitAck(peer, 'player:action', magicAction(secondPower));
    const combo = await received;
    assert.equal(combo.type, type);
    assert.deepEqual(combo.powers, [firstPower, secondPower]);
  }
});

test('one player cannot trigger a cooperative magic recipe alone', async (t) => {
  const harness = await makeHarness();
  t.after(() => harness.close());

  const owner = await harness.client();
  await createSession(owner);
  const noCombo = expectNoEvent(owner, 'magic:combo');
  await emitAck(owner, 'player:action', magicAction('water'));
  await emitAck(owner, 'player:action', magicAction('blossom'));
  await noCombo;
});

test('matching magic powers cast in different locations do not combine', async (t) => {
  const harness = await makeHarness();
  t.after(() => harness.close());

  const owner = await harness.client();
  const { sessionCode } = await createSession(owner);
  const peer = await harness.client();
  await joinSession(peer, sessionCode, 'player_peer');
  await emitAck(peer, 'player:pose', payload({
    seq: 1,
    locationId: 'underwater',
    x: 0,
    y: 0,
    z: 0,
    rotation: 0,
    moving: false,
    flying: false,
  }));

  const ownerNoCombo = expectNoEvent(owner, 'magic:combo');
  const peerNoCombo = expectNoEvent(peer, 'magic:combo');
  await emitAck(owner, 'player:action', magicAction('water'));
  await emitAck(peer, 'player:action', magicAction('blossom', { locationId: 'underwater' }));
  await Promise.all([ownerNoCombo, peerNoCombo]);
});

test('a location and recipe stay on cooldown after a cooperative magic trigger', async (t) => {
  let clock = 10_000;
  const harness = await makeHarness({ now: () => clock });
  t.after(() => harness.close());

  const owner = await harness.client();
  const { sessionCode } = await createSession(owner);
  const peer = await harness.client();
  await joinSession(peer, sessionCode, 'player_peer');

  const firstCombo = waitForEvent(owner, 'magic:combo');
  await emitAck(owner, 'player:action', magicAction('water'));
  await emitAck(peer, 'player:action', magicAction('blossom'));
  await firstCombo;

  clock += 1;
  const noRepeatedCombo = expectNoEvent(owner, 'magic:combo');
  const firstRepeat = await emitAck(owner, 'player:action', magicAction('water'));
  const secondRepeat = await emitAck(peer, 'player:action', magicAction('blossom'));
  assert.equal(firstRepeat.comboId, undefined);
  assert.equal(secondRepeat.comboId, undefined);
  await noRepeatedCombo;
  assert.equal(harness.service.sessions.get(sessionCode).magicComboCooldowns.size, 1);

  clock += MAGIC_COMBO_COOLDOWN_MS;
  const afterCooldown = waitForEvent(owner, 'magic:combo');
  await emitAck(owner, 'player:action', magicAction('water'));
  await emitAck(peer, 'player:action', magicAction('blossom'));
  assert.equal((await afterCooldown).type, 'rainbow-garden');
});

test('magic casts older than the cooperation window are forgotten', async (t) => {
  let clock = 10_000;
  const harness = await makeHarness({ now: () => clock });
  t.after(() => harness.close());

  const owner = await harness.client();
  const { sessionCode } = await createSession(owner);
  const peer = await harness.client();
  await joinSession(peer, sessionCode, 'player_peer');

  await emitAck(owner, 'player:action', magicAction('water'));
  clock += MAGIC_COMBO_WINDOW_MS + 1;
  const noCombo = expectNoEvent(owner, 'magic:combo');
  await emitAck(peer, 'player:action', magicAction('blossom'));
  await noCombo;
});

test('furniture operations are house-scoped, idempotent, and included in late-join snapshots', async (t) => {
  const harness = await makeHarness();
  t.after(() => harness.close());

  const owner = await harness.client();
  const { sessionCode } = await createSession(owner);
  const peer = await harness.client();
  await joinSession(peer, sessionCode, 'player_peer');
  const housePose = payload({
    seq: 1,
    locationId: 'house:home:floor:1',
    x: 0,
    y: 0,
    z: 0,
    rotation: 0,
    moving: false,
    flying: false,
  });
  await emitAck(owner, 'player:pose', housePose);
  await emitAck(peer, 'player:pose', housePose);

  const item = {
    itemId: 'furniture_123',
    kind: 'sofa',
    color: '#ff9ed2',
    x: 2.25,
    z: -1.5,
    ry: Math.PI / 4,
  };
  const ownerAdded = waitForEvent(owner, 'furniture:added');
  const peerAdded = waitForEvent(peer, 'furniture:added');
  const add = await emitAck(owner, 'furniture:add', payload({
    locationId: 'house:home:floor:1',
    item,
  }));
  assert.equal(add.ok, true);
  assert.deepEqual((await ownerAdded).item, item);
  assert.deepEqual((await peerAdded).item, item);

  const duplicateNotice = waitForEvent(owner, 'furniture:added');
  const duplicate = await emitAck(owner, 'furniture:add', payload({
    locationId: 'house:home:floor:1',
    item,
  }));
  assert.equal(duplicate.duplicate, true);
  await duplicateNotice;
  assert.equal(
    harness.service.sessions.get(sessionCode).furnitureByLocation.get('house:home:floor:1').length,
    1,
  );

  const lateJoiner = await harness.client();
  const lateSnapshot = await joinSession(lateJoiner, sessionCode, 'player_late');
  assert.deepEqual(lateSnapshot.furnitureByLocation['house:home:floor:1'], [item]);

  const removedNotice = waitForEvent(owner, 'furniture:removed');
  const removed = await emitAck(peer, 'furniture:remove', payload({
    locationId: 'house:home:floor:1',
    itemId: item.itemId,
  }));
  assert.equal(removed.existed, true);
  await removedNotice;
  const removedAgain = await emitAck(peer, 'furniture:remove', payload({
    locationId: 'house:home:floor:1',
    itemId: item.itemId,
  }));
  assert.equal(removedAgain.existed, false);

  const mismatch = await emitAck(owner, 'furniture:clear', payload({
    locationId: 'house:home:floor:2',
  }));
  assert.equal(mismatch.ok, false);
  assert.equal(mismatch.error.code, 'LOCATION_MISMATCH');
});

test('invalid protocol, profile, coordinates, and unknown events are rejected', async (t) => {
  const harness = await makeHarness();
  t.after(() => harness.close());
  const client = await harness.client();

  const wrongVersion = await emitAck(client, 'session:create', {
    protocolVersion: 2,
    playerId: 'player_invalid',
    profile: PROFILE,
  });
  assert.equal(wrongVersion.error.code, 'INVALID_PROTOCOL_VERSION');

  const badProfile = await emitAck(client, 'session:create', payload({
    playerId: 'player_invalid',
    profile: { ...PROFILE, color: '#000000' },
  }));
  assert.equal(badProfile.error.code, 'INVALID_PROFILE');

  await createSession(client, 'player_valid');
  const badPose = await emitAck(client, 'player:pose', payload({
    seq: 1,
    locationId: 'world',
    x: 1_001,
    y: 0,
    z: 0,
    rotation: 0,
    moving: false,
    flying: false,
  }));
  assert.equal(badPose.ok, false);
  assert.equal(badPose.error.code, 'INVALID_PAYLOAD');

  const unknownError = waitForEvent(client, 'session:error');
  client.emit('player:free-text', payload({ text: 'not allowed' }));
  assert.equal((await unknownError).code, 'INVALID_EVENT');
});

test('empty sessions are removed after the configured five-minute-style grace period', async (t) => {
  let clock = 10_000;
  const harness = await makeHarness({
    now: () => clock,
    emptySessionTtlMs: 300_000,
    cleanupIntervalMs: 60_000,
  });
  t.after(() => harness.close());

  const owner = await harness.client();
  const { sessionCode } = await createSession(owner);
  await emitAck(owner, 'session:leave', payload());
  assert.equal(harness.service.sessions.get(sessionCode).emptySince, clock);

  clock += 299_999;
  harness.service.cleanupExpiredSessions();
  assert.equal(harness.service.sessions.has(sessionCode), true);
  clock += 1;
  const replacement = await createSession(owner, 'player_returned');
  assert.equal(harness.service.sessions.has(sessionCode), false);
  assert.equal(harness.service.sessions.has(replacement.sessionCode), true);
  assert.equal(harness.service.sessions.size, 1);
});

test('session creation is capped and recycles the oldest empty room first', async (t) => {
  let clock = 10_000;
  const harness = await makeHarness({
    now: () => clock,
    emptySessionTtlMs: 300_000,
  });
  t.after(() => harness.close());

  const firstOwner = await harness.client();
  const first = await createSession(firstOwner, 'player_first');
  clock = 11_000;
  const secondOwner = await harness.client();
  const second = await createSession(secondOwner, 'player_second');
  assert.equal(harness.service.sessions.size, MAX_SESSIONS);

  const blockedOwner = await harness.client();
  const blocked = await emitAck(blockedOwner, 'session:create', payload({
    playerId: 'player_blocked',
    profile: PROFILE,
  }));
  assert.equal(blocked.ok, false);
  assert.equal(blocked.error.code, 'SESSION_LIMIT');
  assert.equal(harness.service.sessions.size, MAX_SESSIONS);

  clock = 12_000;
  await emitAck(firstOwner, 'session:leave', payload());
  clock = 13_000;
  await emitAck(secondOwner, 'session:leave', payload());

  clock = 14_000;
  const replacement = await createSession(blockedOwner, 'player_replacement');
  assert.equal(harness.service.sessions.size, MAX_SESSIONS);
  assert.equal(harness.service.sessions.has(first.sessionCode), false);
  assert.equal(harness.service.sessions.has(second.sessionCode), true);
  assert.equal(harness.service.sessions.has(replacement.sessionCode), true);
});
