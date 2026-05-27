/* ═══════════════════════════════════════════════════════════
   CYVEX XDR  —  carousel.js
   3D cylinder carousel + block expand / collapse
═══════════════════════════════════════════════════════════ */

let currentBlock  = 0;
let autoRotateId  = null;
let isExpanded    = false;
let isAnimating   = false;

const TOTAL_BLOCKS = 3;
const AUTO_INTERVAL = 4000;

/* ── GET REFS ── */
function getWrapper() { return document.getElementById('carousel-wrapper'); }
function getDots()    { return document.querySelectorAll('.c-dot'); }

/* ════════════════════════════
   INIT  (called after intro)
════════════════════════════ */
function initCarousel() {
  const wrapper = getWrapper();
  if (!wrapper) return;
  wrapper.dataset.active = currentBlock;
  updateDots();
  startAutoRotate();
}

/* ════════════════════════════
   ROTATION
════════════════════════════ */
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

/* ════════════════════════════
   EXPAND / COLLAPSE
════════════════════════════ */
function handleBlockClick(idx) {
  if (isAnimating || isExpanded) return;

  /* First bring clicked block to front if not already */
  if (idx !== currentBlock) {
    stopAutoRotate();
    goToBlock(idx);
    isAnimating = true;
    setTimeout(() => {
      isAnimating = false;
      openExpanded(idx);
    }, 700);
    return;
  }
  openExpanded(idx);
}

function openExpanded(idx) {
  if (isExpanded) return;
  isExpanded = true;
  stopAutoRotate();

  const overlay = document.getElementById('expanded-overlay');

  /* hide all exp-blocks, show the right one */
  document.querySelectorAll('.exp-block').forEach(b => {
    b.classList.remove('active', 'reveal-active');
  });
  const target = document.getElementById('exp-' + idx);
  if (target) target.classList.add('active');

  overlay.classList.remove('collapsing');
  overlay.classList.add('active', 'expanding');

  overlay.addEventListener('animationend', () => {
    overlay.classList.remove('expanding');

    /* trigger staggered reveal after zoom finishes */
    setTimeout(() => {
      if (target) target.classList.add('reveal-active');

      /* start dashboard AFTER reveals begin */
      setTimeout(() => {
        if (idx === 0 && window.startSOCDashboard) startSOCDashboard();
      }, 500);
    }, 60);
  }, { once: true });
}

function closeExpanded() {
  if (!isExpanded) return;
  const overlay = document.getElementById('expanded-overlay');

  /* stop dashboard loops */
  if (window.stopSOCDashboard) stopSOCDashboard();

  /* first hide all reveals instantly */
  document.querySelectorAll('.exp-block').forEach(b => b.classList.remove('reveal-active'));

  /* brief pause then collapse */
  setTimeout(() => {
    overlay.classList.add('collapsing');
    overlay.addEventListener('animationend', () => {
      overlay.classList.remove('active', 'collapsing');
      document.querySelectorAll('.exp-block').forEach(b => b.classList.remove('active'));
      isExpanded = false;
      startAutoRotate();
    }, { once: true });
  }, 120);
}

/* keyboard support */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && isExpanded) closeExpanded();
  if (!isExpanded) {
    if (e.key === 'ArrowRight') nextBlock();
    if (e.key === 'ArrowLeft')  prevBlock();
  }
});

/* touch / swipe */
(function addSwipe() {
  let sx = 0;
  const scene = document.getElementById('carousel-scene');
  if (!scene) return;
  scene.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
  scene.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 40) { dx < 0 ? nextBlock() : prevBlock(); }
  }, { passive: true });
})();