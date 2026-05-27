/* ═══════════════════════════════════════════════════════════
   CYVEX XDR  —  main.js
   Entry point — ties everything together in order
═══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  /* ── 1. Language default ── */
  setLang('en');

  /* ── 2. Matrix BG (starts immediately, very subtle) ── */
  // already auto-started in matrix.js

  /* ── 3. Intro (starts immediately) ── */
  // already auto-started in intro.js
  // intro.js calls initCarousel() and initMiniCanvases() on finish

  /* ── 4. Clock in console / debug (optional) ── */
  setInterval(() => {
    const now = new Date();
    const ts  = now.toTimeString().slice(0, 8);
    // keep a live clock if needed
  }, 1000);

});

/* expose globally in case intro is skipped before DOM fully parses */
window.addEventListener('load', () => {
  // ensure main-page is visible if intro was already done
  const intro = document.getElementById('intro-overlay');
  const main  = document.getElementById('main-page');
  if (intro && intro.style.display === 'none' && main) {
    main.classList.add('visible');
  }
});
