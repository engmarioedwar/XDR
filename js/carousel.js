/* ═══════════════════════════════════════════════════════════
   CYVEX XDR  —  carousel.js  (v2 — Mobile Optimized)
   Fixes:
   - Passive touch events
   - Debounced click to prevent double-fire on mobile
   - Reveal delay halved on mobile
═══════════════════════════════════════════════════════════ */

let currentBlock  = 0;
let autoRotateId  = null;
let isExpanded    = false;
let isAnimating   = false;
let lastClickTime = 0;

const TOTAL_BLOCKS   = 3;
const AUTO_INTERVAL  = 4000;
const IS_MOB         = window.innerWidth < 768;

function getWrapper() { return document.getElementById('carousel-wrapper'); }
function getDots()    { return document.querySelectorAll('.c-dot'); }

/* ════════════════════
   INIT
════════════════════ */
function initCarousel() {
  const wrapper = getWrapper();
  if (!wrapper) return;
  wrapper.dataset.active = currentBlock;
  updateDots();
  startAutoRotate();
}

/* ════════════════════
   ROTATION
════════════════════ */
function goToBlock(idx) {
  if (isAnimating || isExpanded) return;
  currentBlock = ((idx % TOTAL_BLOCKS) + TOTAL_BLOCKS) % TOTAL_BLOCKS;
  const deg = -currentBlock * (360 / TOTAL_BLOCKS);
  const wrapper = getWrapper();
  wrapper.style.transform = `rotateY(${deg}deg)`;
  wrapper.dataset.active  = currentBlock;
  updateDots();
}

function nextBlock() { goToBlock(currentBlock + 1); }
function prevBlock() { goToBlock(currentBlock - 1); }

function updateDots() {
  getDots().forEach((d, i) => d.classList.toggle('active', i === currentBlock));
}

function startAutoRotate() {
  stopAutoRotate();
  autoRotateId = setInterval(nextBlock, AUTO_INTERVAL);
}
function stopAutoRotate() {
  if (autoRotateId) { clearInterval(autoRotateId); autoRotateId = null; }
}

/* ════════════════════
   EXPAND / COLLAPSE
════════════════════ */
function handleBlockClick(idx) {
  /* Debounce: ignore if tapped within 600ms */
  const now = Date.now();
  if (now - lastClickTime < 600) return;
  lastClickTime = now;

  if (isAnimating || isExpanded) return;

  if (idx !== currentBlock) {
    stopAutoRotate();
    goToBlock(idx);
    isAnimating = true;
    setTimeout(() => {
      isAnimating = false;
      openExpanded(idx);
    }, IS_MOB ? 500 : 700);
    return;
  }
  openExpanded(idx);
}

function openExpanded(idx) {
  if (isExpanded) return;
  isExpanded = true;
  stopAutoRotate();

  const overlay = document.getElementById('expanded-overlay');

  document.querySelectorAll('.exp-block').forEach(b => {
    b.classList.remove('active', 'reveal-active');
  });
  const target = document.getElementById('exp-' + idx);
  if (target) target.classList.add('active');

  overlay.classList.remove('collapsing');
  overlay.classList.add('active', 'expanding');

  overlay.addEventListener('animationend', () => {
    overlay.classList.remove('expanding');

    /* Shorter delay on mobile */
    const revealDelay = IS_MOB ? 30 : 60;
    setTimeout(() => {
      if (target) target.classList.add('reveal-active');

      /* Start dashboard after reveals */
      const dashDelay = IS_MOB ? 300 : 500;
      setTimeout(() => {
        if (idx === 0 && window.startSOCDashboard) startSOCDashboard();
      }, dashDelay);
    }, revealDelay);
  }, { once: true });
}

function closeExpanded() {
  if (!isExpanded) return;
  const overlay = document.getElementById('expanded-overlay');

  if (window.stopSOCDashboard) stopSOCDashboard();

  document.querySelectorAll('.exp-block').forEach(b => b.classList.remove('reveal-active'));

  setTimeout(() => {
    overlay.classList.add('collapsing');
    overlay.addEventListener('animationend', () => {
      overlay.classList.remove('active', 'collapsing');
      document.querySelectorAll('.exp-block').forEach(b => b.classList.remove('active'));
      isExpanded = false;
      startAutoRotate();
    }, { once: true });
  }, IS_MOB ? 60 : 120);
}

/* ── KEYBOARD ── */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && isExpanded) closeExpanded();
  if (!isExpanded) {
    if (e.key === 'ArrowRight') nextBlock();
    if (e.key === 'ArrowLeft')  prevBlock();
  }
});

/* ── TOUCH / SWIPE ── */
(function addSwipe() {
  let sx = 0, sy = 0;
  const scene = document.getElementById('carousel-scene');
  if (!scene) return;

  scene.addEventListener('touchstart', e => {
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
  }, { passive: true });

  scene.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - sx;
    const dy = e.changedTouches[0].clientY - sy;
    /* Only trigger swipe if horizontal movement dominates */
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      dx < 0 ? nextBlock() : prevBlock();
      stopAutoRotate();
      startAutoRotate(); /* reset timer */
    }
  }, { passive: true });
})();