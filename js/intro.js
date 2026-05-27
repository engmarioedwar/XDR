/* ═══════════════════════════════════════════════════════════
   CYVEX XDR  —  intro.js
═══════════════════════════════════════════════════════════ */

(function () {
  const overlay   = document.getElementById('intro-overlay');
  const logoEl    = document.getElementById('intro-logo');
  const subEl     = document.getElementById('intro-logo-sub');
  const matrixC   = document.getElementById('intro-matrix-canvas');
  const tunCanvas = document.getElementById('intro-canvas');

  let skipCalled = false;
  let phaseTimer, blockTimer;

  /* ════════════════════════════════════
     THREE.JS
  ════════════════════════════════════ */
  let renderer, scene, camera, animId;
  let camZ = 80;
  let tunnelSpeed = 0.50;
  const MAX_SPEED = 4.5;  const RINGS = 120, PTS = 32, RADIUS = 14, LENGTH = 1400;

  /* البلوكات الـ 3 */
  const BLOCK_DATA = [
    { label: 'SOC OVERVIEW',  sub: 'Real-Time Threat Defense',  hex: '#00ff9d', side:  1 },
    { label: 'AI PIPELINE',   sub: 'Neural Correlation Engine', hex: '#b66bff', side: -1 },
    { label: 'THREAT INTEL',  sub: 'Global Intelligence Feed',  hex: '#00e5ff', side:  1 },
  ];

  let blockMeshes   = [];
  let blockTargetOp = [0, 0, 0];  // target opacity لكل بلوك
  let activeBlock   = -1;         // اللي شايف دلوقتي

  function initThree() {
    if (!window.THREE) { phase_matrix(); return; }

    renderer = new THREE.WebGLRenderer({ canvas: tunCanvas, antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    scene  = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 3000);
    camera.position.z = camZ;

    buildTunnel();
    buildBlocks();

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    loop();
  }

  function buildTunnel() {
    /* حلقات أفقية */
    const rp = [];
    for (let r = 0; r < RINGS; r++) {
      const z = camZ - (r / RINGS) * LENGTH;
      for (let p = 0; p <= PTS; p++) {
        const a = (p / PTS) * Math.PI * 2;
        rp.push(Math.cos(a)*RADIUS, Math.sin(a)*RADIUS, z);
      }
    }
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3));
    scene.add(new THREE.LineSegments(rg,
      new THREE.LineBasicMaterial({ color:0x00ff9d, opacity:0.32, transparent:true })));

    /* خطوط طولية */
    const vp = [];
    for (let p = 0; p < PTS; p++) {
      const a = (p/PTS)*Math.PI*2;
      const cx=Math.cos(a)*RADIUS, cy=Math.sin(a)*RADIUS;
      vp.push(cx,cy,camZ, cx,cy,camZ-LENGTH);
    }
    const vg = new THREE.BufferGeometry();
    vg.setAttribute('position', new THREE.Float32BufferAttribute(vp, 3));
    scene.add(new THREE.LineSegments(vg,
      new THREE.LineBasicMaterial({ color:0x00e5ff, opacity:0.14, transparent:true })));

    /* particles */
    const pp = [];
    for (let i=0;i<400;i++) pp.push(
      (Math.random()-.5)*RADIUS*1.8,
      (Math.random()-.5)*RADIUS*1.8,
      camZ - Math.random()*LENGTH
    );
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3));
    scene.add(new THREE.Points(pg,
      new THREE.PointsMaterial({ color:0x00ff9d, size:0.2, transparent:true, opacity:0.6 })));
  }

  function buildBlocks() {
    BLOCK_DATA.forEach((d, i) => {
      const mat = new THREE.MeshBasicMaterial({
        map: makeTexture(d), transparent:true, opacity:0,
        side: THREE.DoubleSide, depthWrite:false, depthTest:false
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(11, 7), mat);
      mesh.visible = false;
      blockMeshes.push(mesh);
      scene.add(mesh);
    });
  }

  /* ── وضع البلوك أمام الكاميرا على جدار النفق ── */
  function placeBlock(mesh, side) {
    const AHEAD = 18;          // أقرب للكاميرا = أوضح وأكبر
    const wallAngle = side > 0 ? 0.15 : Math.PI - 0.15;
    const wallDist  = RADIUS - 1.8;

    mesh.position.set(
      Math.cos(wallAngle) * wallDist,
      0.5,
      camera.position.z - AHEAD
    );
    /* يبص ناحية مركز النفق مع ميل بسيط */
    mesh.rotation.y = side > 0 ? -0.22 : Math.PI + 0.22;
  }

  /* ════════════════════════════════════
     MAIN LOOP
  ════════════════════════════════════ */
  function loop() {
    animId = requestAnimationFrame(loop);

    /* حرك الكاميرا */
    camera.position.z -= tunnelSpeed;
    tunnelSpeed = Math.min(tunnelSpeed + 0.012, MAX_SPEED);
    camera.rotation.z += 0.003;

    /* update البلوكات */
    blockMeshes.forEach((mesh, i) => {
      const target = blockTargetOp[i];
      const cur    = mesh.material.opacity;

      if (target > 0) {
        /* حدّث موضعه دايماً وهو ظاهر عشان يفضل على الجدار */
        placeBlock(mesh, BLOCK_DATA[i].side);
        mesh.visible = true;
      }

      /* smooth lerp */
      const newOp = cur + (target - cur) * 0.09;
      mesh.material.opacity = Math.abs(newOp) < 0.005 ? 0 : newOp;
      if (mesh.material.opacity < 0.01 && target === 0) mesh.visible = false;
    });

    renderer.render(scene, camera);
  }

  /* ════════════════════════════════════
     BLOCK SEQUENCE (يبدأ بعد 2.8ث)
  ════════════════════════════════════ */
  function runBlockSequence(onDone) {
    let idx = 0;

    function showNext() {
      if (skipCalled) { onDone(); return; }
      if (idx >= BLOCK_DATA.length) {
        /* دائرة فاضية 1.5ث بس — مش 3ث ← مش عاوز وقت طويل في الظلام */
        blockTimer = setTimeout(onDone, 1500);
        return;
      }

      /* أظهر البلوك */
      blockTargetOp[idx] = 1;

      /* بعد 1.5ث اخفيه وروح للتالي */
      blockTimer = setTimeout(() => {
        blockTargetOp[idx] = 0;
        const prev = idx;
        idx++;
        /* انتظر الـ fade يخلص (400ms) وروح للتالي */
        blockTimer = setTimeout(showNext, 450);
      }, 1500);
    }

    showNext();
  }

  /* ════════════════════════════════════
     TEXTURE (Canvas 2D)
  ════════════════════════════════════ */
  function makeTexture(d) {
    const W=640, H=400;
    const cv = document.createElement('canvas');
    cv.width=W; cv.height=H;
    const ctx = cv.getContext('2d');

    /* خلفية */
    ctx.fillStyle='rgba(4,10,20,0.86)';
    rrect(ctx,0,0,W,H,16); ctx.fill();

    /* border */
    ctx.shadowColor=d.hex; ctx.shadowBlur=20;
    ctx.strokeStyle=d.hex+'77'; ctx.lineWidth=1.8;
    rrect(ctx,2,2,W-4,H-4,14); ctx.stroke();
    ctx.shadowBlur=0;

    /* top line */
    const g=ctx.createLinearGradient(0,0,W,0);
    g.addColorStop(0,'transparent'); g.addColorStop(.5,d.hex+'cc'); g.addColorStop(1,'transparent');
    ctx.fillStyle=g; ctx.fillRect(0,0,W,2);

    /* corners */
    const bs=22;
    ctx.strokeStyle=d.hex; ctx.lineWidth=2.5;
    ctx.shadowColor=d.hex; ctx.shadowBlur=12;
    [[10,10,1,1],[W-10,10,-1,1],[10,H-10,1,-1],[W-10,H-10,-1,-1]].forEach(([x,y,dx,dy])=>{
      ctx.beginPath();
      ctx.moveTo(x+dx*bs,y); ctx.lineTo(x,y); ctx.lineTo(x,y+dy*bs);
      ctx.stroke();
    });
    ctx.shadowBlur=0;

    /* module */
    ctx.fillStyle=d.hex+'55';
    ctx.font='600 13px "JetBrains Mono",monospace';
    ctx.fillText('[ MODULE 0'+(BLOCK_DATA.indexOf(d)+1)+' ]',28,50);

    /* label */
    ctx.fillStyle=d.hex;
    ctx.shadowColor=d.hex; ctx.shadowBlur=24;
    ctx.font='800 40px "Orbitron",sans-serif';
    ctx.fillText(d.label,28,114);
    ctx.shadowBlur=0;

    /* divider */
    const dg=ctx.createLinearGradient(0,0,W,0);
    dg.addColorStop(0,d.hex+'88'); dg.addColorStop(1,'transparent');
    ctx.fillStyle=dg; ctx.fillRect(28,128,W-56,1);

    /* sub */
    ctx.fillStyle='#7aa4c0';
    ctx.font='500 17px "JetBrains Mono",monospace';
    ctx.fillText(d.sub,28,164);

    return new THREE.CanvasTexture(cv);
  }

  function rrect(ctx,x,y,w,h,r){
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
    ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y);
    ctx.closePath();
  }

  /* ════════════════════════════════════
     MATRIX RAIN
  ════════════════════════════════════ */
  let matCtx, matCols, matDrops, matAnimId;
  function initMatrix() {
    matrixC.width=window.innerWidth; matrixC.height=window.innerHeight;
    matCtx=matrixC.getContext('2d');
    matCols=Math.floor(matrixC.width/15);
    matDrops=Array.from({length:matCols},()=>Math.random()*-60);
    drawMatrix();
  }
  function drawMatrix() {
    matAnimId=requestAnimationFrame(drawMatrix);
    matCtx.fillStyle='rgba(0,0,0,.15)'; matCtx.fillRect(0,0,matrixC.width,matrixC.height);
    matCtx.font='15px "JetBrains Mono",monospace';
    for(let i=0;i<matCols;i++){
      const c=Math.random()>.5?'1':'0', y=matDrops[i]*15;
      matCtx.fillStyle=matDrops[i]<2?'rgba(255,255,255,.9)':'rgba(0,255,157,.8)';
      matCtx.fillText(c,i*15,y);
      if(y>matrixC.height&&Math.random()>.97)matDrops[i]=0;
      matDrops[i]+=0.8;
    }
  }

  /* ════════════════════════════════════
     TYPING
  ════════════════════════════════════ */
  const SUBTITLE='AI-POWERED CYBER DEFENSE';
  function typeSubtitle(){
    let i=0; subEl.textContent='';
    const iv=setInterval(()=>{
      if(skipCalled){clearInterval(iv);subEl.textContent=SUBTITLE;return;}
      subEl.textContent+=SUBTITLE[i++];
      if(i>=SUBTITLE.length)clearInterval(iv);
    },55);
  }

  /* ════════════════════════════════════
     PHASES
  ════════════════════════════════════ */
  function phase_tunnel() {
    initThree();
    /* ابدأ البلوكات بعد 600ms بس — مع بداية النفق */
    phaseTimer = setTimeout(() => {
      if (!skipCalled) runBlockSequence(phase_matrix);
    }, 600);
  }

  function phase_matrix() {
    if (skipCalled) return;
    /* fade النفق فوراً — مش وقت في الظلام */
    tunCanvas.style.transition = 'opacity .4s ease';
    tunCanvas.style.opacity = '0';
    matrixC.classList.add('visible');
    initMatrix();
    phaseTimer = setTimeout(phase_logo, 900);
  }

  function phase_logo() {
    if (skipCalled) return;
    logoEl.classList.add('visible');
    typeSubtitle();
    phaseTimer = setTimeout(phase_fadeout, 1200 + 600);
  }

  function phase_fadeout() {
    if (skipCalled) return;
    overlay.classList.add('fade-out');
    setTimeout(() => { cleanup(); showMain(); }, 900);
  }

  function cleanup() {
    if (animId)    cancelAnimationFrame(animId);
    if (matAnimId) cancelAnimationFrame(matAnimId);
    if (renderer)  renderer.dispose();
    overlay.style.display = 'none';
  }

  window.skipIntro = function () {
    if (skipCalled) return;
    skipCalled = true;
    clearTimeout(phaseTimer); clearTimeout(blockTimer);
    overlay.classList.add('fade-out');
    setTimeout(() => { cleanup(); showMain(); }, 400);
  };

  function showMain() {
    const main = document.getElementById('main-page');
    if (main) main.classList.add('visible');
    if (window.initCarousel)     initCarousel();
    if (window.initMiniCanvases) initMiniCanvases();
  }

  phase_tunnel();
})();