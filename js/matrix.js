/* ═══════════════════════════════════════════════════════════
   CYVEX XDR  —  matrix.js
   Scrolling binary matrix background (slow, subtle)
═══════════════════════════════════════════════════════════ */

(function initMatrix() {
  const canvas = document.getElementById('matrix-bg');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const CHARS = '01';
  const FONT_SIZE = 14;
  let cols, drops;

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    cols  = Math.floor(canvas.width / FONT_SIZE);
    drops = Array.from({ length: cols }, () => Math.random() * -canvas.height / FONT_SIZE);
  }

  resize();
  window.addEventListener('resize', resize);

  ctx.font = FONT_SIZE + 'px "JetBrains Mono", monospace';

  function draw() {
    // semi-transparent background → trail effect
    ctx.fillStyle = 'rgba(3,6,11, 0.055)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = FONT_SIZE + 'px "JetBrains Mono", monospace';

    for (let i = 0; i < cols; i++) {
      const char = CHARS[Math.floor(Math.random() * CHARS.length)];
      const x = i * FONT_SIZE;
      const y = drops[i] * FONT_SIZE;

      // leading char is bright
      ctx.fillStyle = 'rgba(0,255,157, 0.85)';
      ctx.fillText(char, x, y);

      // random reset
      if (y > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i] += 0.35; // slow speed
    }
    requestAnimationFrame(draw);
  }

  draw();
})();
