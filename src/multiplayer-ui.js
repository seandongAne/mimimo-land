const DEFAULT_PHRASES = Object.freeze({
  hello: 'Hi!',
  'lets-play': "Let's play!",
  'follow-me': 'Follow me!',
  'great-job': 'Great job!',
});

const FRIENDLY_ERRORS = Object.freeze({
  CONNECTION_FAILED: 'The shared world is offline right now. Solo play still works.',
  SESSION_NOT_FOUND: 'That room has ended. Ask a friend for a new code or create a room.',
  INVALID_SESSION_CODE: 'Check the 6-character room code and try again.',
  SESSION_FULL: 'That room already has five friends.',
  SESSION_LIMIT: 'Two friend rooms are already playing. Try again in a little while.',
  CONNECTION_REPLACED: 'This player reconnected in another tab.',
  RATE_LIMITED: 'Too many actions at once. Take a tiny pause and try again.',
  FURNITURE_LIMIT: 'This floor is full of furniture. Remove something before adding more.',
  LOCATION_MISMATCH: 'That only works when everyone is in the same place.',
});

const LOCATION_LABELS = Object.freeze({
  world: 'MIMIMO Land',
  cloudland: 'Cloudland',
  underwater: 'Underwater',
  'shop:toys': 'Toy Shop',
  'shop:bakery': 'Bakery',
  'shop:market': 'Supermarket',
  'shop:icecream': 'Ice Cream Shop',
  'shop:candy': 'Candy Shop',
  'venue:school': 'School',
  'venue:hospital': 'Hospital',
  'venue:restaurant': 'Restaurant',
});

function required(root, id) {
  const element = root.getElementById(id);
  if (!element) throw new Error('Missing multiplayer UI element #' + id);
  return element;
}

function cleanCode(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

function titleCase(value) {
  return String(value || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();
}

export function friendlyMultiplayerLocation(locationId) {
  const key = String(locationId || '').trim();
  if (!key) return 'Finding their location...';
  if (LOCATION_LABELS[key]) return LOCATION_LABELS[key];

  if (key.startsWith('shop:')) return titleCase(key.slice(5)) + ' Shop';
  if (key.startsWith('venue:')) return titleCase(key.slice(6));
  if (key.startsWith('house:')) {
    const [, houseKey = '', , floor = '1'] = key.split(':');
    const houseName = houseKey === 'cloud-castle'
      ? 'Rainbow Cloud Castle'
      : /^(?:cloud-)?dream-?\d+$/.test(houseKey)
        ? 'Dream House'
        : titleCase(houseKey) + ' House';
    return floor === '1' ? houseName : `${houseName}, floor ${floor}`;
  }
  return titleCase(key) || 'Somewhere in MIMIMO Land';
}

function friendName(player) {
  return String(player?.profile?.name || 'Mimimo').trim() || 'Mimimo';
}

export function createMultiplayerUI({
  client,
  getLocationId,
  onLeave,
  onTrackPlayer,
  onPhoto,
  phraseLabels = DEFAULT_PHRASES,
  root = document,
} = {}) {
  if (!client) throw new TypeError('createMultiplayerUI requires a client');

  const button = required(root, 'multiplayerBtn');
  const status = required(root, 'multiplayerStatus');
  const panel = required(root, 'multiplayerPanel');
  const closeButton = required(root, 'multiplayerCloseBtn');
  const connection = required(root, 'multiplayerConnection');
  const setup = required(root, 'multiplayerSetup');
  const room = required(root, 'multiplayerRoom');
  const createButton = required(root, 'multiplayerCreateBtn');
  const joinForm = required(root, 'multiplayerJoinForm');
  const codeInput = required(root, 'multiplayerCodeInput');
  const joinButton = required(root, 'multiplayerJoinBtn');
  const roomCode = required(root, 'multiplayerRoomCode');
  const playerCount = required(root, 'multiplayerPlayerCount');
  const friends = required(root, 'multiplayerFriends');
  const friendsEmpty = required(root, 'multiplayerFriendsEmpty');
  const phrases = required(root, 'multiplayerPhrases');
  const photoButton = required(root, 'multiplayerPhotoBtn');
  const leaveButton = required(root, 'multiplayerLeaveBtn');
  const feedback = required(root, 'multiplayerFeedback');
  const compass = required(root, 'friendCompass');
  const compassArrow = required(root, 'friendCompassArrow');
  const compassName = required(root, 'friendCompassName');
  const compassDetail = required(root, 'friendCompassDetail');
  const unsubscribe = [];
  const removeDomListeners = [];
  let currentState = client.state();
  let trackedPlayerId = null;
  let friendsFingerprint = '';
  let photoPending = false;

  function listen(target, event, handler) {
    target.addEventListener(event, handler);
    removeDomListeners.push(() => target.removeEventListener(event, handler));
  }

  function setFeedback(text = '', isError = false) {
    feedback.textContent = text;
    feedback.dataset.state = isError ? 'error' : (text ? 'ok' : '');
  }

  function describeError(problem) {
    if (!problem) return '';
    return FRIENDLY_ERRORS[problem.code] || problem.message || 'Multiplayer is unavailable right now.';
  }

  function roomFriends(nextState = currentState) {
    if (!nextState?.joined) return [];
    return (Array.isArray(nextState.players) ? nextState.players : [])
      .filter((player) => player?.playerId && player.playerId !== nextState.playerId)
      .sort((a, b) => friendName(a).localeCompare(friendName(b)));
  }

  function hideCompass() {
    compass.classList.add('hidden');
    compass.dataset.mode = '';
    compassName.textContent = '';
    compassDetail.textContent = '';
  }

  function selectTrackedPlayer(playerId) {
    const nextId = playerId == null ? null : String(playerId);
    const available = nextId && roomFriends().some((player) => player.playerId === nextId);
    const selected = available ? nextId : null;
    if (selected === trackedPlayerId) return trackedPlayerId;
    trackedPlayerId = selected;
    friendsFingerprint = '';
    if (!trackedPlayerId) hideCompass();
    onTrackPlayer?.(trackedPlayerId);
    renderFriends(currentState);
    return trackedPlayerId;
  }

  function renderFriends(nextState = currentState) {
    const values = roomFriends(nextState);
    if (trackedPlayerId && !values.some((player) => player.playerId === trackedPlayerId)) {
      trackedPlayerId = null;
      hideCompass();
      onTrackPlayer?.(null);
    }

    const fingerprint = JSON.stringify(values.map((player) => [
      player.playerId,
      friendName(player),
      player.pose?.locationId || '',
    ])) + `|${trackedPlayerId || ''}`;
    if (fingerprint === friendsFingerprint) return;
    friendsFingerprint = fingerprint;

    friends.replaceChildren();
    friendsEmpty.classList.toggle('hidden', values.length > 0);
    for (const player of values) {
      const item = root.createElement('li');
      item.className = 'multiplayer-friend';
      item.dataset.playerId = player.playerId;

      const copy = root.createElement('span');
      copy.className = 'multiplayer-friend-copy';
      const name = root.createElement('strong');
      name.className = 'multiplayer-friend-name';
      name.textContent = friendName(player);
      const location = root.createElement('small');
      location.className = 'multiplayer-friend-location';
      location.textContent = friendlyMultiplayerLocation(player.pose?.locationId);
      copy.append(name, location);

      const track = root.createElement('button');
      const selected = player.playerId === trackedPlayerId;
      track.className = 'squishy multiplayer-track';
      track.type = 'button';
      track.textContent = selected ? 'Stop' : 'Track';
      track.dataset.playerId = player.playerId;
      track.setAttribute('aria-pressed', String(selected));
      track.setAttribute('aria-label', `${selected ? 'Stop tracking' : 'Track'} ${friendName(player)}`);
      track.addEventListener('click', () => {
        selectTrackedPlayer(selected ? null : player.playerId);
      });

      item.append(copy, track);
      friends.appendChild(item);
    }
  }

  function refreshFriendsFromClient() {
    currentState = client.state();
    renderFriends(currentState);
  }

  function updateCompass(view = null) {
    if (!view || !trackedPlayerId || view.playerId !== trackedPlayerId) {
      hideCompass();
      return false;
    }

    const name = String(view.name || 'Mimimo');
    compass.classList.remove('hidden');
    if (compassName.textContent !== name) compassName.textContent = name;

    if (!view.sameLocation) {
      compass.dataset.mode = 'away';
      compassArrow.textContent = '🧭';
      const detail = `At ${friendlyMultiplayerLocation(view.locationId)} - go there to meet`;
      if (compassDetail.textContent !== detail) compassDetail.textContent = detail;
      return true;
    }

    compass.dataset.mode = view.hasPosition === false ? 'finding' : 'nearby';
    compassArrow.textContent = '↑';
    if (Number.isFinite(view.angle)) compassArrow.style.transform = `rotate(${view.angle}rad)`;
    const detail = view.hasPosition === false
      ? 'Finding them nearby...'
      : `${Math.max(0, Math.round(Number(view.distance) || 0))} steps away`;
    if (compassDetail.textContent !== detail) compassDetail.textContent = detail;
    return true;
  }

  function render(nextState = client.state()) {
    currentState = nextState;
    const joined = Boolean(nextState.joined);
    const busy = Boolean(nextState.busy || nextState.connecting || nextState.requestInFlight);
    const unavailable = !nextState.available;

    setup.classList.toggle('hidden', joined);
    room.classList.toggle('hidden', !joined);
    createButton.disabled = busy || unavailable;
    joinButton.disabled = busy || unavailable;
    codeInput.disabled = busy || unavailable;
    leaveButton.disabled = busy;
    photoButton.disabled = busy || !joined || photoPending;

    roomCode.value = joined ? nextState.sessionCode : '------';
    roomCode.textContent = roomCode.value;
    playerCount.textContent = String(nextState.playerCount) + ' of 5 mimimos here';
    renderFriends(nextState);

    if (joined) {
      status.dataset.state = 'online';
      status.textContent = nextState.sessionCode + ' - ' + nextState.playerCount + '/5';
      connection.dataset.state = 'online';
      connection.textContent = 'Connected to room ' + nextState.sessionCode;
      button.textContent = 'Friends ' + nextState.sessionCode;
    } else if (busy) {
      status.dataset.state = 'connecting';
      status.textContent = 'Connecting...';
      connection.dataset.state = 'connecting';
      connection.textContent = 'Finding the shared world...';
      button.textContent = 'Multiplayer...';
    } else if (nextState.error) {
      status.dataset.state = 'offline';
      status.textContent = 'Offline - solo ready';
      connection.dataset.state = 'offline';
      connection.textContent = 'Solo play is still available.';
      button.textContent = 'Multiplayer';
      setFeedback(describeError(nextState.error), true);
    } else {
      status.dataset.state = 'solo';
      status.textContent = unavailable ? 'Solo - multiplayer not configured' : 'Solo play';
      connection.dataset.state = 'solo';
      connection.textContent = unavailable
        ? 'Multiplayer is not configured for this build.'
        : 'Start a room or join a friend.';
      button.textContent = 'Multiplayer';
    }
  }

  function open() {
    panel.classList.remove('hidden');
    button.setAttribute('aria-expanded', 'true');
    panel.setAttribute('aria-modal', 'true');
    render();
    if (!currentState.joined) codeInput.focus();
  }

  function close() {
    panel.classList.add('hidden');
    button.setAttribute('aria-expanded', 'false');
    panel.setAttribute('aria-modal', 'false');
    button.focus();
  }

  function sendPhrase(phraseId) {
    if (!currentState.joined || !Object.hasOwn(phraseLabels, phraseId)) return false;
    const locationId = getLocationId?.();
    if (!locationId) return false;
    const sent = client.sendAction('phrase', locationId, { phraseId });
    if (sent) setFeedback('You said: "' + phraseLabels[phraseId] + '"');
    return sent;
  }

  async function takePhoto() {
    if (photoPending || !currentState.joined || typeof onPhoto !== 'function') return false;
    photoPending = true;
    photoButton.disabled = true;
    close();
    try {
      await onPhoto();
      return true;
    } catch {
      open();
      setFeedback('The camera could not take that picture. Please try again.', true);
      return false;
    } finally {
      photoPending = false;
      render();
    }
  }

  listen(button, 'click', open);
  listen(closeButton, 'click', close);
  listen(root.defaultView || window, 'keydown', (event) => {
    if (event.key === 'Escape' && !panel.classList.contains('hidden')) close();
  });
  listen(createButton, 'click', () => {
    setFeedback('');
    client.createSession();
    render();
  });
  listen(codeInput, 'input', () => {
    codeInput.value = cleanCode(codeInput.value);
    setFeedback('');
  });
  listen(joinForm, 'submit', (event) => {
    event.preventDefault();
    setFeedback('');
    if (!client.joinSession(codeInput.value)) {
      setFeedback(describeError(client.state().error), true);
    }
    render();
  });
  listen(roomCode, 'click', async () => {
    if (!currentState.sessionCode) return;
    try {
      await navigator.clipboard.writeText(currentState.sessionCode);
      setFeedback('Room code copied!');
    } catch {
      setFeedback('Room code: ' + currentState.sessionCode);
    }
  });
  listen(leaveButton, 'click', () => {
    client.leaveSession();
    onLeave?.();
    render();
    setFeedback('You left the room. Solo play is still ready.');
  });
  listen(photoButton, 'click', () => { void takePhoto(); });
  for (const phraseButton of phrases.querySelectorAll('[data-phrase-id]')) {
    listen(phraseButton, 'click', () => sendPhrase(phraseButton.dataset.phraseId));
  }

  unsubscribe.push(client.on('state', render));
  unsubscribe.push(client.on('error', (problem) => setFeedback(describeError(problem), true)));
  unsubscribe.push(client.on('snapshot', () => {
    render();
    setFeedback('Room ready - share the code with up to four friends!');
  }));
  unsubscribe.push(client.on('left', () => {
    render();
    setFeedback('You left the room. Solo play is still ready.');
  }));
  unsubscribe.push(client.on('player:joined', refreshFriendsFromClient));
  unsubscribe.push(client.on('player:updated', refreshFriendsFromClient));
  unsubscribe.push(client.on('player:left', refreshFriendsFromClient));

  render();
  return {
    client,
    open,
    close,
    render,
    renderFriends,
    sendPhrase,
    selectTrackedPlayer,
    getTrackedPlayerId: () => trackedPlayerId,
    updateCompass,
    takePhoto,
    destroy() {
      hideCompass();
      for (const stop of unsubscribe) stop?.();
      for (const remove of removeDomListeners) remove();
    },
  };
}

export const initMultiplayerUI = createMultiplayerUI;
