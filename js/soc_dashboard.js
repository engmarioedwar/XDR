/* ═══════════════════════════════════════════════════════════
   CYVEX XDR  —  soc_dashboard.js  (v2 — Mobile Optimized)
   Performance fixes:
   - Staggered canvas init (not all at once)
   - Reduced particle/node counts on mobile
   - Frame throttling for low-end devices
   - shadowBlur disabled on mobile (major perf killer)
   - World map dots pre-rendered to offscreen canvas
   - Continent dots drawn once, not every frame
═══════════════════════════════════════════════════════════ */

/* ── MOBILE DETECTION ── */
const IS_MOBILE = window.innerWidth < 768 || /Mobi|Android/i.test(navigator.userAgent);
const IS_LOW_END = IS_MOBILE && (navigator.hardwareConcurrency || 4) <= 4;

/* shadow helper — disabled on mobile for performance */
function setShadow(ctx, blur, color) {
  if (IS_MOBILE) return;
  ctx.shadowBlur  = blur;
  ctx.shadowColor = color;
}
function clearShadow(ctx) {
  if (IS_MOBILE) return;
  ctx.shadowBlur = 0;
}

/* ── DATA SIMULATION ── */
const _SEV     = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const _TYPES   = ['Ransomware.Encrypt','APT.Lateral','C2.Beacon','Trojan.Generic',
                  'Brute.SSH','DNS.Tunnel','Exfil.HTTPS','Worm.Propagate',
                  'Phishing.Link','Botnet.Mirai','PortScan.Stealth','PrivEsc.Kernel'];
const _COUNTRIES = [
  ['Russia',55,100],['China',35,105],['North Korea',40,127],['Iran',32,53],
  ['USA',38,-97],['Brazil',-10,-55],['Germany',51,10],['India',22,78],
  ['Ukraine',49,32],['Vietnam',16,108],['Turkey',39,35],['Nigeria',9,8]
];
const _ACTIONS = ['BLOCK_IP','QUARANTINE','ISOLATE_HOST','KILL_PROCESS','FIREWALL_RULE','RESET_SESSION'];

function _rip(a) { return a[Math.floor(Math.random() * a.length)]; }
function _ri(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function _rf(a, b) { return +(Math.random() * (b - a) + a).toFixed(2); }
function _ip() { return `${_ri(1,254)}.${_ri(0,255)}.${_ri(0,255)}.${_ri(1,254)}`; }
function _ts(offset = 0) {
  const d = new Date(Date.now() - offset * 1000);
  return d.toTimeString().slice(0, 8);
}

function makeFeedItem() {
  const c   = _rip(_COUNTRIES);
  const sev = _rip(['LOW','MEDIUM','HIGH','CRITICAL']);
  return {
    id:       `INC-${_ri(10000,99999)}`,
    type:     _rip(_TYPES),
    severity: sev,
    src_ip:   _ip(),
    dst_ip:   `10.0.${_ri(0,255)}.${_ri(1,254)}`,
    country:  c[0], lat: c[1], lng: c[2],
    ts:       _ts(0),
    confidence: _rf(75, 99.9),
  };
}

function makeSoarItem() {
  return { ts: _ts(0), action: _rip(_ACTIONS), target: _ip(),
           result: Math.random() > 0.15 ? 'SUCCESS' : 'PENDING' };
}

/* ── STATE ── */
let SOC_STATE = {
  metrics: {
    threats_blocked: 13082,
    active_incidents: 7,
    ai_confidence:  94.8,
    packets_sec:    56796,
  },
  feed:  Array.from({ length: 20 }, (_, i) => { const f = makeFeedItem(); f.ts = _ts(i * 12); return f; }),
  soar:  Array.from({ length: 8  }, makeSoarItem),
};

let socLoopId    = null;
let mapAnimId    = null;
let brainAnimId  = null;
let radarAnimId  = null;
let attacks      = [];

/* ════════════════════════════════════
   ENTRY — staggered init to avoid jank
════════════════════════════════════ */
function startSOCDashboard() {
  renderStats();
  renderFeed();
  renderAIFeed();

  /* Stagger canvas inits to avoid frame drop on open */
  setTimeout(() => initWorldMap(),  80);
  setTimeout(() => initBrain(),    200);
  setTimeout(() => initRadar(),    320);

  /* Slower tick on mobile */
  const tickRate = IS_MOBILE ? 2000 : 1200;
  socLoopId = setInterval(() => {
    tickState();
    renderStats();
    renderFeed();
    renderAIFeed();
  }, tickRate);
}

window.startSOCDashboard = startSOCDashboard;

function stopSOCDashboard() {
  if (socLoopId)   { clearInterval(socLoopId);          socLoopId   = null; }
  if (mapAnimId)   { cancelAnimationFrame(mapAnimId);   mapAnimId   = null; }
  if (brainAnimId) { cancelAnimationFrame(brainAnimId); brainAnimId = null; }
  if (radarAnimId) { cancelAnimationFrame(radarAnimId); radarAnimId = null; }
}
window.stopSOCDashboard = stopSOCDashboard;

/* ── TICK ── */
function tickState() {
  const m = SOC_STATE.metrics;
  m.threats_blocked += _ri(1, 9);
  m.packets_sec      = _ri(40000, 80000);
  m.ai_confidence    = _rf(92, 99.5);
  m.active_incidents = Math.max(1, m.active_incidents + _ri(-1, 2));

  if (Math.random() > 0.65) {
    const f = makeFeedItem();
    SOC_STATE.feed.unshift(f);
    SOC_STATE.feed = SOC_STATE.feed.slice(0, 40);
    addMapAttack(f);
  }

  SOC_STATE.soar.unshift(makeSoarItem());
  SOC_STATE.soar = SOC_STATE.soar.slice(0, 20);
}

/* ════════════════════════════════════
   STAT CARDS
════════════════════════════════════ */
function renderStats() {
  const m = SOC_STATE.metrics;
  setText('v-blocked',  m.threats_blocked.toLocaleString());
  setText('v-incidents', m.active_incidents);
  setText('v-pps',       m.packets_sec.toLocaleString());
  setText('v-conf',      m.ai_confidence.toFixed(1) + '%');
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* ════════════════════════════════════
   THREAT FEED
════════════════════════════════════ */
function renderFeed() {
  const el = document.getElementById('feed-main');
  if (!el) return;
  el.innerHTML = SOC_STATE.feed.slice(0, 14).map(f => `
    <div class="feed-row">
      <span class="fr-time">${f.ts}</span>
      <span><span class="fr-type">${f.type}</span><br>
            <span class="fr-ip">${f.src_ip}</span></span>
      <span class="fr-country">${f.country}</span>
      <span class="sev-pill ${f.severity}">${f.severity}</span>
    </div>`).join('');
}

function renderAIFeed() {
  const el = document.getElementById('feed-ai');
  if (!el) return;
  el.innerHTML = SOC_STATE.feed.slice(0, 10).map(f => `
    <div class="ai-feed-row">
      <span class="af-time">${f.ts}</span>
      <span class="af-action">AI → <b>${f.type}</b></span>
      <span class="sev-pill ${f.severity}">${f.severity}</span>
    </div>`).join('');
}

/* ════════════════════════════════════
   MINI PREVIEW (carousel block)
════════════════════════════════════ */
function initMiniCanvases() {
  renderMiniStats();
  renderMiniFeed();
  /* Only init mini map on non-low-end */
  if (!IS_LOW_END) initMiniMap();
}
window.initMiniCanvases = initMiniCanvases;

function renderMiniStats() {
  const el = document.getElementById('mini-soc-stats');
  if (!el) return;
  const m = SOC_STATE.metrics;
  el.innerHTML = `
    <div class="mini-stat">
      <div class="mini-stat-lbl">BLOCKED</div>
      <div class="mini-stat-val">${(m.threats_blocked / 1000).toFixed(1)}K</div>
    </div>
    <div class="mini-stat">
      <div class="mini-stat-lbl">INCIDENTS</div>
      <div class="mini-stat-val rv">${m.active_incidents}</div>
    </div>
    <div class="mini-stat">
      <div class="mini-stat-lbl">PPS</div>
      <div class="mini-stat-val cv">${(m.packets_sec / 1000).toFixed(0)}K</div>
    </div>
    <div class="mini-stat">
      <div class="mini-stat-lbl">AI CONF</div>
      <div class="mini-stat-val pv">${m.ai_confidence.toFixed(0)}%</div>
    </div>`;
}

function renderMiniFeed() {
  const el = document.getElementById('mini-feed');
  if (!el) return;
  el.innerHTML = SOC_STATE.feed.slice(0, 7).map(f => `
    <div class="mini-feed-row">
      <span class="mfr-type">${f.type.split('.')[0]}</span>
      <span class="mini-feed-sev mfs-${f.severity.toLowerCase()}">${f.severity[0]}</span>
    </div>`).join('');
}

/* ── MINI MAP ── */
function initMiniMap() {
  const c = document.getElementById('mini-map');
  if (!c) return;

  function setSize() {
    c.width  = c.offsetWidth  || 220;
    c.height = c.offsetHeight || 90;
  }
  setSize();

  const x = c.getContext('2d');
  const w = c.width, h = c.height;

  /* pre-draw continent dots once */
  const offscreen = document.createElement('canvas');
  offscreen.width = w; offscreen.height = h;
  const ox = offscreen.getContext('2d');
  ox.fillStyle = 'rgba(0,255,170,.09)';
  for (let i = 0; i < w; i += 6) for (let j = 0; j < h; j += 6) {
    const lat = 90 - (j / h) * 180, lng = (i / w) * 360 - 180;
    const land = (lat > -55 && lat < 70) && (
      (lng > -130 && lng < -60 && lat > 15) ||
      (lng > -80 && lng < -35 && lat < 15 && lat > -55) ||
      (lng > -10 && lng < 40 && lat > 35) ||
      (lng > -20 && lng < 50 && lat < 35 && lat > -35) ||
      (lng > 40 && lng < 150 && lat > 10) ||
      (lng > 110 && lng < 155 && lat < -10 && lat > -40));
    if (land && Math.random() > 0.55) ox.fillRect(i, j, 1, 1);
  }

  let miniAtks = SOC_STATE.feed.slice(0, 4).map(f => ({
    src: ll(f.lat, f.lng, w, h),
    dst: ll(20, 30, w, h),
    sev: f.severity, t: Math.random() * 25, life: 80
  }));

  let frameCount = 0;
  function draw() {
    frameCount++;
    /* Skip every other frame on mobile */
    if (IS_MOBILE && frameCount % 2 !== 0) {
      requestAnimationFrame(draw);
      return;
    }

    x.fillStyle = 'rgba(3,6,11,.35)';
    x.fillRect(0, 0, w, h);
    x.drawImage(offscreen, 0, 0);

    miniAtks.forEach(a => {
      a.t++;
      const col = a.sev === 'CRITICAL' ? '#ff3860' : a.sev === 'HIGH' ? '#ff9f1c' : '#00ff9d';
      const p = Math.min(1, a.t / 25);
      const cy = Math.min(a.src.y, a.dst.y) - 20;
      const cx = (a.src.x + a.dst.x) / 2;
      x.strokeStyle = col; x.lineWidth = 0.8;
      x.beginPath();
      x.moveTo(a.src.x, a.src.y);
      const ex = a.src.x + (a.dst.x - a.src.x) * p;
      const ey = (1-p)*(1-p)*a.src.y + 2*(1-p)*p*cy + p*p*a.dst.y;
      x.quadraticCurveTo(cx, cy, ex, ey);
      x.stroke();
      if (p >= 1) a.life--;
    });
    miniAtks = miniAtks.filter(a => a.life > 0);
    if (Math.random() > 0.97 && SOC_STATE.feed.length) {
      const f = _rip(SOC_STATE.feed.slice(0, 10));
      miniAtks.push({ src: ll(f.lat, f.lng, w, h), dst: ll(20, 30, w, h), sev: f.severity, t: 0, life: 80 });
    }
    requestAnimationFrame(draw);
  }
  draw();
}

function ll(lat, lng, w, h) {
  return { x: (lng + 180) / 360 * w, y: (90 - lat) / 180 * h };
}

/* ════════════════════════════════════
   WORLD MAP (expanded)
   - Offscreen canvas for continent dots
   - Frame skip on mobile
════════════════════════════════════ */
let mapOffscreen = null;

function buildMapOffscreen(w, h) {
  const oc = document.createElement('canvas');
  oc.width = w; oc.height = h;
  const ox = oc.getContext('2d');
  ox.fillStyle = 'rgba(0,255,170,.11)';
  /* Larger step on mobile = fewer dots = faster */
  const step = IS_MOBILE ? 10 : 7;
  for (let i = 0; i < w; i += step) for (let j = 0; j < h; j += step) {
    const lat = 90 - (j / h) * 180, lng = (i / w) * 360 - 180;
    const land = (lat > -55 && lat < 70) && (
      (lng > -130 && lng < -60 && lat > 15) ||
      (lng > -80 && lng < -35 && lat < 15 && lat > -55) ||
      (lng > -10 && lng < 40 && lat > 35) ||
      (lng > -20 && lng < 50 && lat < 35 && lat > -35) ||
      (lng > 40 && lng < 150 && lat > 10) ||
      (lng > 110 && lng < 155 && lat < -10 && lat > -40));
    if (land && Math.random() > 0.5) ox.fillRect(i, j, IS_MOBILE ? 1.5 : 1.5, IS_MOBILE ? 1.5 : 1.5);
  }
  return oc;
}

function initWorldMap() {
  const c = document.getElementById('worldmap');
  if (!c) return;
  const rect = c.getBoundingClientRect();
  c.width  = rect.width  || c.offsetWidth  || 600;
  c.height = rect.height || c.offsetHeight || 320;
  const x = c.getContext('2d');
  const w = c.width, h = c.height;

  mapOffscreen = buildMapOffscreen(w, h);

  /* Fewer initial attacks on mobile */
  const seed = IS_MOBILE ? 5 : 10;
  attacks = SOC_STATE.feed.slice(0, seed).map(f => ({
    src: ll(f.lat, f.lng, w, h),
    dst: ll(25, 32, w, h),
    sev: f.severity, t: Math.random() * 30, life: IS_MOBILE ? 80 : 130
  }));

  let frameCount = 0;

  function draw() {
    frameCount++;
    /* Skip frames on mobile */
    if (IS_MOBILE && frameCount % 2 !== 0) {
      mapAnimId = requestAnimationFrame(draw);
      return;
    }

    x.fillStyle = 'rgba(3,6,11,.22)';
    x.fillRect(0, 0, w, h);

    /* draw pre-rendered continents */
    x.drawImage(mapOffscreen, 0, 0);

    attacks.forEach(a => {
      a.t++;
      const col = a.sev === 'CRITICAL' ? '#ff3860' : a.sev === 'HIGH' ? '#ff9f1c' : a.sev === 'MEDIUM' ? '#ffd166' : '#23ffb0';
      const p = Math.min(1, a.t / 35);
      const cy = Math.min(a.src.y, a.dst.y) - 70;
      const cx = (a.src.x + a.dst.x) / 2;
      x.strokeStyle = col; x.lineWidth = 1.2;
      setShadow(x, 8, col);
      x.beginPath(); x.moveTo(a.src.x, a.src.y);
      const ex = a.src.x + (a.dst.x - a.src.x) * p;
      const ey = (1-p)*(1-p)*a.src.y + 2*(1-p)*p*cy + p*p*a.dst.y;
      x.quadraticCurveTo(cx, cy, ex, ey);
      x.stroke();
      clearShadow(x);
      /* src dot */
      x.beginPath(); x.arc(a.src.x, a.src.y, 3, 0, Math.PI * 2);
      x.fillStyle = col;
      setShadow(x, 12, col);
      x.fill();
      clearShadow(x);
      if (p >= 1) {
        x.beginPath(); x.arc(a.dst.x, a.dst.y, 3, 0, Math.PI * 2);
        x.fillStyle = '#00e5ff';
        setShadow(x, 12, '#00e5ff');
        x.fill();
        clearShadow(x);
        a.life--;
      }
    });
    attacks = attacks.filter(a => a.life > 0);
    mapAnimId = requestAnimationFrame(draw);
  }
  draw();
}

function addMapAttack(f) {
  const c = document.getElementById('worldmap');
  if (!c) return;
  const w = c.width || 600, h = c.height || 320;
  if (attacks.length > (IS_MOBILE ? 15 : 40)) attacks.shift();
  attacks.push({
    src: ll(f.lat, f.lng, w, h),
    dst: ll(25, 32, w, h),
    sev: f.severity, t: 0, life: IS_MOBILE ? 80 : 130
  });
}

/* ════════════════════════════════════
   NEURAL BRAIN — fewer nodes on mobile
════════════════════════════════════ */
function initBrain() {
  const c = document.getElementById('brain-canvas');
  if (!c) return;
  const rect = c.getBoundingClientRect();
  c.width  = rect.width  || 400;
  c.height = rect.height || 220;
  const x  = c.getContext('2d');
  /* Fewer nodes on mobile */
  const nodeCount = IS_MOBILE ? 16 : 30;
  const linkDist  = IS_MOBILE ? 90 : 110;
  const N = Array.from({ length: nodeCount }, () => ({
    x: Math.random() * c.width,
    y: Math.random() * c.height,
    vx: (Math.random() - 0.5) * 0.5,
    vy: (Math.random() - 0.5) * 0.5,
    pulse: Math.random() * Math.PI * 2,
  }));

  let frameCount = 0;
  function draw() {
    frameCount++;
    if (IS_MOBILE && frameCount % 2 !== 0) {
      brainAnimId = requestAnimationFrame(draw);
      return;
    }
    const w = c.width, h = c.height;
    x.clearRect(0, 0, w, h);
    N.forEach(n => {
      n.x += n.vx; n.y += n.vy; n.pulse += 0.04;
      if (n.x < 0 || n.x > w) n.vx *= -1;
      if (n.y < 0 || n.y > h) n.vy *= -1;
    });
    /* edges */
    for (let i = 0; i < N.length; i++) {
      for (let j = i + 1; j < N.length; j++) {
        const d = Math.hypot(N[i].x - N[j].x, N[i].y - N[j].y);
        if (d < linkDist) {
          x.strokeStyle = `rgba(0,255,157,${(1 - d / linkDist) * 0.6})`;
          x.lineWidth = 0.8;
          if (!IS_MOBILE) { x.shadowBlur = 4; x.shadowColor = '#00ff9d'; }
          x.beginPath(); x.moveTo(N[i].x, N[i].y); x.lineTo(N[j].x, N[j].y); x.stroke();
          if (!IS_MOBILE) x.shadowBlur = 0;
        }
      }
    }
    /* nodes */
    N.forEach(n => {
      const r = 2 + Math.sin(n.pulse) * 1.2;
      x.beginPath(); x.arc(n.x, n.y, r, 0, Math.PI * 2);
      x.fillStyle = '#00ff9d';
      setShadow(x, 14, '#00ff9d');
      x.fill();
      clearShadow(x);
    });
    brainAnimId = requestAnimationFrame(draw);
  }
  draw();
}

/* ════════════════════════════════════
   RADAR — throttled on mobile
════════════════════════════════════ */
function initRadar() {
  const c = document.getElementById('radar-canvas');
  if (!c) return;
  const rect = c.getBoundingClientRect();
  c.width  = rect.width  || 400;
  c.height = rect.height || 220;
  const x  = c.getContext('2d');
  let angle = 0;
  const blips = Array.from({ length: IS_MOBILE ? 6 : 10 }, () => ({
    an: Math.random() * Math.PI * 2,
    r:  Math.random() * 0.85,
    bright: Math.random(),
  }));

  let frameCount = 0;
  function draw() {
    frameCount++;
    if (IS_MOBILE && frameCount % 2 !== 0) {
      radarAnimId = requestAnimationFrame(draw);
      return;
    }
    const w = c.width, h = c.height;
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 12;
    x.fillStyle = 'rgba(3,6,11,.2)'; x.fillRect(0, 0, w, h);
    /* rings */
    x.strokeStyle = 'rgba(0,255,170,.2)'; x.lineWidth = 1;
    for (let i = 1; i <= 4; i++) {
      x.beginPath(); x.arc(cx, cy, R * i / 4, 0, Math.PI * 2); x.stroke();
    }
    /* crosshairs */
    x.beginPath();
    x.moveTo(cx - R, cy); x.lineTo(cx + R, cy);
    x.moveTo(cx, cy - R); x.lineTo(cx, cy + R);
    x.stroke();
    /* sweep */
    x.save(); x.translate(cx, cy); x.rotate(angle);
    const g = x.createConicGradient ? x.createConicGradient(0, 0, 0) : null;
    if (g) {
      g.addColorStop(0, 'rgba(0,255,157,.4)'); g.addColorStop(.15, 'rgba(0,255,157,.08)');
      g.addColorStop(.16, 'transparent'); g.addColorStop(1, 'transparent');
      x.fillStyle = g;
    } else { x.fillStyle = 'rgba(0,255,157,.12)'; }
    x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, R, 0, Math.PI * 2); x.closePath(); x.fill();
    x.strokeStyle = '#00ff9d'; x.lineWidth = 1.5;
    setShadow(x, 8, '#00ff9d');
    x.beginPath(); x.moveTo(0, 0); x.lineTo(R, 0); x.stroke();
    clearShadow(x);
    x.restore();
    /* blips */
    blips.forEach(b => {
      b.bright = Math.max(0, b.bright - 0.008);
      const da = ((b.an - angle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      if (da < 0.12) b.bright = 1;
      if (b.bright > 0.05) {
        const px = cx + Math.cos(b.an) * b.r * R, py = cy + Math.sin(b.an) * b.r * R;
        x.beginPath(); x.arc(px, py, 3 + b.bright * 2, 0, Math.PI * 2);
        x.fillStyle = `rgba(0,255,157,${b.bright})`;
        setShadow(x, 12, '#00ff9d');
        x.fill();
        clearShadow(x);
      }
    });
    /* center */
    x.beginPath(); x.arc(cx, cy, 4, 0, Math.PI * 2);
    x.fillStyle = '#00ff9d';
    setShadow(x, 16, '#00ff9d');
    x.fill();
    clearShadow(x);
    /* Slower sweep on mobile */
    angle += IS_MOBILE ? 0.028 : 0.022;
    radarAnimId = requestAnimationFrame(draw);
  }
  draw();
}

/* ── MINI CANVASES for placeholder blocks 1 & 2 ── */
(function initPlaceholderCanvases() {
  function miniPulse(id, col) {
    const c = document.getElementById(id);
    if (!c) return;
    const rect = c.getBoundingClientRect();
    c.width  = Math.max(rect.width, 60);
    c.height = Math.max(rect.height, 40);
    const x = c.getContext('2d');
    let t = 0;
    let fc = 0;
    function draw() {
      fc++;
      if (IS_MOBILE && fc % 3 !== 0) { requestAnimationFrame(draw); return; }
      const w = c.width, h = c.height;
      x.clearRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2;
      for (let i = 0; i < 4; i++) {
        const r = (Math.sin(t * 0.04 - i * 0.8) + 1) * 0.5;
        x.strokeStyle = col; x.lineWidth = 0.8;
        x.globalAlpha = r * 0.4;
        x.beginPath(); x.arc(cx, cy, 10 + i * 8 + r * 6, 0, Math.PI * 2); x.stroke();
      }
      x.globalAlpha = 1; t++;
      requestAnimationFrame(draw);
    }
    draw();
  }
  setTimeout(() => {
    miniPulse('mini-pipe',  '#b66bff');
    miniPulse('mini-intel', '#00e5ff');
  }, 500);
})();