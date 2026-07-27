import assert from 'node:assert/strict';
import test from 'node:test';
import { io as createClient } from 'socket.io-client';

import { createMultiplayerServer } from '../index.js';
import { MAX_PLAYERS, PROTOCOL_VERSION } from '../protocol.js';

const PROFILE = Object.freeze({
  name: 'Mimimo',
  species: 'bunny',
  color: '#ff9ed2',
  shape: 'classic',
});

function payload(fields = {}) {
  return { protocolVersion: PROTOCOL_VERSION, ...fields };
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
  harness.service.cleanupExpiredSessions();
  assert.equal(harness.service.sessions.has(sessionCode), false);
});
