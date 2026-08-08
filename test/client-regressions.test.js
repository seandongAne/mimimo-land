import assert from 'node:assert/strict';
import test from 'node:test';

import { bindMultiplayerFurnitureEvents } from '../src/multiplayer-furniture.js';
import {
  createMultiplayerUI,
  friendlyMultiplayerLocation,
} from '../src/multiplayer-ui.js';
import { isMultiplayerBusy, isMultiplayerConnecting } from '../src/multiplayer.js';

class FakeClassList {
  constructor() {
    this.values = new Set();
  }

  add(name) {
    this.values.add(name);
  }

  remove(name) {
    this.values.delete(name);
  }

  contains(name) {
    return this.values.has(name);
  }

  toggle(name, force) {
    const enabled = force === undefined ? !this.values.has(name) : Boolean(force);
    if (enabled) this.values.add(name);
    else this.values.delete(name);
    return enabled;
  }
}

class FakeElement {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this.classList = new FakeClassList();
    this.dataset = {};
    this.listeners = new Map();
    this.children = [];
    this.style = {};
    this.textContent = '';
    this.value = '';
    this.disabled = false;
  }

  addEventListener(event, handler) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(handler);
  }

  removeEventListener(event, handler) {
    this.listeners.get(event)?.delete(handler);
  }

  setAttribute(name, value) {
    this[name] = value;
  }

  append(...children) {
    this.children.push(...children);
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  replaceChildren(...children) {
    this.children = [...children];
  }

  focus() {
    this.focused = true;
  }

  click() {
    for (const handler of this.listeners.get('click') || []) handler({ target: this });
  }

  querySelectorAll() {
    return [];
  }
}

function makeUiRoot() {
  const ids = [
    'multiplayerBtn',
    'multiplayerStatus',
    'multiplayerPanel',
    'multiplayerCloseBtn',
    'multiplayerConnection',
    'multiplayerSetup',
    'multiplayerRoom',
    'multiplayerCreateBtn',
    'multiplayerJoinForm',
    'multiplayerCodeInput',
    'multiplayerJoinBtn',
    'multiplayerRoomCode',
    'multiplayerPlayerCount',
    'multiplayerFriends',
    'multiplayerFriendsEmpty',
    'multiplayerPhrases',
    'multiplayerPhotoBtn',
    'multiplayerLeaveBtn',
    'multiplayerFeedback',
    'friendCompass',
    'friendCompassArrow',
    'friendCompassName',
    'friendCompassDetail',
  ];
  const elements = new Map(ids.map((id) => [id, new FakeElement()]));
  return {
    defaultView: new FakeElement(),
    getElementById(id) {
      return elements.get(id);
    },
    createElement(tagName) {
      return new FakeElement(tagName);
    },
    element(id) {
      return elements.get(id);
    },
  };
}

function makeUiClient(initialState) {
  let currentState = initialState;
  const handlers = new Map();
  return {
    state() {
      return currentState;
    },
    on(event, handler) {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event).add(handler);
      return () => handlers.get(event)?.delete(handler);
    },
    emit(event, payload) {
      for (const handler of handlers.get(event) || []) handler(payload);
    },
    setState(nextState) {
      currentState = nextState;
      this.emit('state', nextState);
    },
    createSession() {
      return true;
    },
    joinSession() {
      return true;
    },
    leaveSession() {},
    sendAction() {
      return true;
    },
  };
}

function multiplayerState(overrides = {}) {
  return {
    available: true,
    connected: true,
    connecting: false,
    requestInFlight: false,
    busy: false,
    joined: false,
    sessionCode: '',
    playerCount: 0,
    playerId: 'local-player',
    players: [],
    error: null,
    ...overrides,
  };
}

test('a connection error overrides Socket.IO automatic reconnect state', () => {
  const retryingSocket = { active: true, connected: false };

  assert.equal(isMultiplayerConnecting(retryingSocket), true);
  assert.equal(
    isMultiplayerConnecting(retryingSocket, { code: 'CONNECTION_FAILED' }),
    false,
  );
});

test('a room request remains busy after the socket connects and releases after an answer', () => {
  const connectedSocket = { active: true, connected: true };

  assert.equal(isMultiplayerConnecting(connectedSocket), false);
  assert.equal(isMultiplayerBusy(connectedSocket, null, true), true);
  assert.equal(isMultiplayerBusy(connectedSocket, null, false), false);
  assert.equal(
    isMultiplayerBusy(connectedSocket, { code: 'SESSION_LIMIT' }, false),
    false,
  );
});

test('room request controls stay disabled until the server answers', () => {
  const root = makeUiRoot();
  const client = makeUiClient(multiplayerState({ requestInFlight: true, busy: true }));
  const ui = createMultiplayerUI({ client, root });

  assert.equal(root.element('multiplayerCreateBtn').disabled, true);
  assert.equal(root.element('multiplayerJoinBtn').disabled, true);
  assert.equal(root.element('multiplayerCodeInput').disabled, true);

  client.setState(multiplayerState({
    error: { code: 'SESSION_LIMIT', message: 'Session limit reached' },
  }));

  assert.equal(root.element('multiplayerCreateBtn').disabled, false);
  assert.equal(root.element('multiplayerJoinBtn').disabled, false);
  assert.equal(root.element('multiplayerCodeInput').disabled, false);
  assert.equal(
    root.element('multiplayerFeedback').textContent,
    'Two friend rooms are already playing. Try again in a little while.',
  );
  ui.destroy();
});

test('a room error survives the following joined-state render until a snapshot succeeds', () => {
  const root = makeUiRoot();
  const joined = multiplayerState({
    joined: true,
    sessionCode: 'ABC234',
    playerCount: 2,
  });
  const client = makeUiClient(joined);
  const ui = createMultiplayerUI({ client, root });
  const problem = { code: 'FURNITURE_LIMIT', message: 'Furniture limit reached' };

  client.emit('error', problem);
  client.setState({ ...joined, error: problem });

  assert.equal(root.element('multiplayerFeedback').dataset.state, 'error');
  assert.equal(
    root.element('multiplayerFeedback').textContent,
    'This floor is full of furniture. Remove something before adding more.',
  );

  client.emit('snapshot', {});
  assert.equal(root.element('multiplayerFeedback').dataset.state, 'ok');
  assert.equal(
    root.element('multiplayerFeedback').textContent,
    'Room ready - share the code with up to four friends!',
  );
  ui.destroy();
});

test('friend rows use text content and friendly live location labels', () => {
  const root = makeUiRoot();
  const client = makeUiClient(multiplayerState({
    joined: true,
    sessionCode: 'ABC234',
    playerCount: 3,
    players: [
      { playerId: 'local-player', profile: { name: 'Me' }, pose: { locationId: 'world' } },
      {
        playerId: 'friend-b',
        profile: { name: '<img src=x onerror=alert(1)>' },
        pose: { locationId: 'shop:bakery' },
      },
      {
        playerId: 'friend-a',
        profile: { name: 'Poppy' },
        pose: { locationId: 'house:dream1:floor:2' },
      },
    ],
  }));
  const ui = createMultiplayerUI({ client, root });

  const rows = root.element('multiplayerFriends').children;
  assert.equal(rows.length, 2);
  const unsafeNameRow = rows.find((row) => row.dataset.playerId === 'friend-b');
  assert.equal(unsafeNameRow.children[0].children[0].textContent, '<img src=x onerror=alert(1)>');
  assert.equal(unsafeNameRow.children[0].children[1].textContent, 'Bakery');
  const dreamHouseRow = rows.find((row) => row.dataset.playerId === 'friend-a');
  assert.equal(dreamHouseRow.children[0].children[1].textContent, 'Dream House, floor 2');
  assert.equal(root.element('multiplayerFriendsEmpty').classList.contains('hidden'), true);
  assert.equal(friendlyMultiplayerLocation('cloudland'), 'Cloudland');

  client.state().players.find((player) => player.playerId === 'friend-b').pose.locationId = 'cloudland';
  client.emit('player:updated', { playerId: 'friend-b' });
  const refreshedRow = root.element('multiplayerFriends').children
    .find((row) => row.dataset.playerId === 'friend-b');
  assert.equal(refreshedRow.children[0].children[1].textContent, 'Cloudland');
  ui.destroy();
});

test('tracking a friend updates the compass and clears when that friend leaves', () => {
  const root = makeUiRoot();
  const tracked = [];
  const joined = multiplayerState({
    joined: true,
    sessionCode: 'ABC234',
    playerCount: 2,
    players: [
      { playerId: 'local-player', profile: { name: 'Me' }, pose: { locationId: 'world' } },
      {
        playerId: 'friend-1',
        profile: { name: 'Sunny' },
        pose: { locationId: 'world', x: 3, z: 4 },
      },
    ],
  });
  const client = makeUiClient(joined);
  const ui = createMultiplayerUI({
    client,
    root,
    onTrackPlayer: (playerId) => tracked.push(playerId),
  });

  assert.equal(ui.selectTrackedPlayer('friend-1'), 'friend-1');
  assert.equal(ui.getTrackedPlayerId(), 'friend-1');
  assert.equal(root.element('multiplayerFriends').children[0].children[1].textContent, 'Stop');

  assert.equal(ui.updateCompass({
    playerId: 'friend-1',
    name: 'Sunny',
    locationId: 'world',
    sameLocation: true,
    hasPosition: true,
    distance: 4.4,
    angle: Math.PI / 2,
  }), true);
  assert.equal(root.element('friendCompass').classList.contains('hidden'), false);
  assert.equal(root.element('friendCompassDetail').textContent, '4 steps away');
  assert.equal(root.element('friendCompassArrow').style.transform, `rotate(${Math.PI / 2}rad)`);

  client.setState({
    ...joined,
    playerCount: 1,
    players: joined.players.slice(0, 1),
  });
  assert.equal(ui.getTrackedPlayerId(), null);
  assert.equal(root.element('friendCompass').classList.contains('hidden'), true);
  assert.deepEqual(tracked, ['friend-1', null]);
  ui.destroy();
});

test('group photo closes the room panel, calls back once, and blocks repeat clicks', async () => {
  const root = makeUiRoot();
  let finishPhoto;
  let photoCalls = 0;
  const client = makeUiClient(multiplayerState({
    joined: true,
    sessionCode: 'ABC234',
    playerCount: 1,
  }));
  const ui = createMultiplayerUI({
    client,
    root,
    onPhoto: () => {
      photoCalls += 1;
      return new Promise((resolve) => { finishPhoto = resolve; });
    },
  });

  ui.open();
  const firstPhoto = ui.takePhoto();
  assert.equal(root.element('multiplayerPanel').classList.contains('hidden'), true);
  assert.equal(root.element('multiplayerPhotoBtn').disabled, true);
  assert.equal(await ui.takePhoto(), false);
  assert.equal(photoCalls, 1);

  finishPhoto();
  assert.equal(await firstPhoto, true);
  assert.equal(root.element('multiplayerPhotoBtn').disabled, false);
  ui.destroy();
});

test('shared furniture events refresh sleep controls after updating the room', () => {
  const handlers = new Map();
  const calls = [];
  const multiplayer = {
    on(event, handler) {
      handlers.set(event, handler);
      return () => handlers.delete(event);
    },
  };
  const interior = {
    applyFurnitureAdded(locationId, item) {
      calls.push(['add', locationId, item.itemId]);
    },
    applyFurnitureRemoved(locationId, itemId) {
      calls.push(['remove', locationId, itemId]);
    },
    applyFurnitureCleared(locationId) {
      calls.push(['clear', locationId]);
    },
  };

  const subscriptions = bindMultiplayerFurnitureEvents(
    multiplayer,
    interior,
    () => calls.push(['refresh']),
  );

  handlers.get('furniture:added')({
    locationId: 'house:home:floor:1',
    item: { itemId: 'bed-1' },
  });
  handlers.get('furniture:removed')({
    locationId: 'house:home:floor:1',
    itemId: 'bed-1',
  });
  handlers.get('furniture:cleared')({ locationId: 'house:home:floor:1' });

  assert.deepEqual(calls, [
    ['add', 'house:home:floor:1', 'bed-1'],
    ['refresh'],
    ['remove', 'house:home:floor:1', 'bed-1'],
    ['refresh'],
    ['clear', 'house:home:floor:1'],
    ['refresh'],
  ]);
  assert.equal(subscriptions.length, 3);
});
