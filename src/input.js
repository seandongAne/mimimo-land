const keys = new Set();
const joyVec = { x: 0, y: 0 };

/**
 * Keyboard (WASD / arrows, space for magic) + a virtual joystick
 * for touch screens. getMove() returns {x, z} in world space.
 */
export function initInput({ onMagic, onGreet, onEnter }) {
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.code === 'Space') e.preventDefault();
    if (e.code === 'Space' || e.code === 'KeyM') onMagic();
    if (e.code === 'KeyH' && onGreet) onGreet();
    if (e.code === 'KeyE' && onEnter) onEnter();
    keys.add(e.code);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());

  // virtual joystick
  const joy = document.getElementById('joy');
  const nub = document.getElementById('joyNub');
  let pointerId = null;

  joy.addEventListener('pointerdown', (e) => {
    pointerId = e.pointerId;
    joy.setPointerCapture(pointerId);
    moveNub(e);
  });
  joy.addEventListener('pointermove', (e) => {
    if (e.pointerId === pointerId) moveNub(e);
  });
  const release = (e) => {
    if (e.pointerId !== pointerId) return;
    pointerId = null;
    joyVec.x = joyVec.y = 0;
    nub.style.translate = '-50% -50%';
  };
  joy.addEventListener('pointerup', release);
  joy.addEventListener('pointercancel', release);

  function moveNub(e) {
    const rect = joy.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const max = rect.width / 2 - 10;
    const len = Math.hypot(dx, dy);
    if (len > max) {
      dx = (dx / len) * max;
      dy = (dy / len) * max;
    }
    nub.style.translate = `calc(-50% + ${dx}px) calc(-50% + ${dy}px)`;
    joyVec.x = dx / max;
    joyVec.y = dy / max;
  }
}

export function getMove() {
  let x = joyVec.x;
  let z = joyVec.y;
  if (keys.has('KeyW') || keys.has('ArrowUp')) z -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) z += 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
  const len = Math.hypot(x, z);
  if (len > 1) {
    x /= len;
    z /= len;
  }
  return { x, z };
}
