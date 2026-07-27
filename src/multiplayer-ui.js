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
  CONNECTION_REPLACED: 'This player reconnected in another tab.',
  RATE_LIMITED: 'Too many actions at once. Take a tiny pause and try again.',
});

function required(root, id) {
  const element = root.getElementById(id);
  if (!element) throw new Error('Missing multiplayer UI element #' + id);
  return element;
}

function cleanCode(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

export function createMultiplayerUI({
  client,
  getLocationId,
  onLeave,
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
  const phrases = required(root, 'multiplayerPhrases');
  const leaveButton = required(root, 'multiplayerLeaveBtn');
  const feedback = required(root, 'multiplayerFeedback');
  const unsubscribe = [];
  const removeDomListeners = [];
  let currentState = client.state();

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

  function render(nextState = client.state()) {
    currentState = nextState;
    const joined = Boolean(nextState.joined);
    const busy = Boolean(nextState.connecting);
    const unavailable = !nextState.available;

    setup.classList.toggle('hidden', joined);
    room.classList.toggle('hidden', !joined);
    createButton.disabled = busy || unavailable;
    joinButton.disabled = busy || unavailable;
    codeInput.disabled = busy || unavailable;
    leaveButton.disabled = busy;

    roomCode.value = joined ? nextState.sessionCode : '------';
    roomCode.textContent = roomCode.value;
    playerCount.textContent = String(nextState.playerCount) + ' of 5 mimimos here';

    if (joined) {
      status.dataset.state = 'online';
      status.textContent = nextState.sessionCode + ' - ' + nextState.playerCount + '/5';
      connection.dataset.state = 'online';
      connection.textContent = 'Connected to room ' + nextState.sessionCode;
      button.textContent = 'Friends ' + nextState.sessionCode;
      setFeedback('');
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

  render();
  return {
    client,
    open,
    close,
    render,
    sendPhrase,
    destroy() {
      for (const stop of unsubscribe) stop?.();
      for (const remove of removeDomListeners) remove();
    },
  };
}

export const initMultiplayerUI = createMultiplayerUI;
