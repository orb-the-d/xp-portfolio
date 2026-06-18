// src/intro.js
// Terminal boot intro — plays once while 3D models load behind it
// Flow: typing lines → ACCESS GRANTED → glitch → reveal

export function initIntro() {
  const overlay = document.getElementById('intro-overlay');
  if (!overlay) return { onModelsReady: () => {} };

  const termOutput = document.getElementById('intro-term-output');
  const grantedEl  = document.getElementById('intro-granted');
  const canvas     = document.getElementById('intro-glitch-canvas');

  // ── Terminal lines ────────────────────────────────────────────
  const LINES = [
    { text: 'BIOS v2.04  —  POST OK',                      delay: 0,    fast: true  },
    { text: 'Initializing secure environment...',           delay: 300,  fast: false },
    { text: 'Loading kernel modules         [  OK  ]',      delay: 900,  fast: false },
    { text: 'Mounting encrypted filesystem  [  OK  ]',      delay: 1500, fast: false },
    { text: 'Starting network services      [  OK  ]',      delay: 2100, fast: false },
    { text: 'Verifying visitor credentials...',             delay: 2700, fast: false },
    { text: '> Scanning threat vectors      [  OK  ]',      delay: 3200, fast: false },
    { text: '> No intrusions detected',                     delay: 3700, fast: false },
  ];

  const TYPEWRITER_SPEED = 22; // ms per character

  let finished   = false;  // true when glitch finishes
  let modelsReady = false; // true when 3D models all loaded
  let glitchStarted = false;

  // ── Type one line, call cb when done ─────────────────────────
  function typeLine(text, fast, cb) {
    const row = document.createElement('div');
    row.className = 'iterm-row';
    termOutput.appendChild(row);
    termOutput.scrollTop = termOutput.scrollHeight;

    if (fast) { row.textContent = text; cb?.(); return; }

    let i = 0;
    const cursor = document.createElement('span');
    cursor.className = 'iterm-cursor';
    cursor.textContent = '█';
    row.appendChild(cursor);

    const iv = setInterval(() => {
      row.textContent = text.slice(0, i);
      row.appendChild(cursor);
      i++;
      if (i > text.length) {
        clearInterval(iv);
        row.textContent = text;
        cb?.();
      }
    }, TYPEWRITER_SPEED);
  }

  // ── Type all lines sequentially ───────────────────────────────
  function runTerminal(cb) {
    let idx = 0;
    function next() {
      if (idx >= LINES.length) { cb(); return; }
      const { text, delay, fast } = LINES[idx++];
      setTimeout(() => typeLine(text, fast, next), idx === 1 ? 0 : delay - (LINES[idx - 2]?.delay ?? 0));
    }
    // Simpler: just stagger with absolute timeouts
    LINES.forEach(({ text, delay, fast }, i) => {
      setTimeout(() => {
        typeLine(text, fast, i === LINES.length - 1 ? cb : null);
      }, delay);
    });
  }

  // ── ACCESS GRANTED flash ──────────────────────────────────────
  function showGranted(cb) {
    termOutput.style.opacity = '0';
    grantedEl.style.display  = 'flex';

    // Flicker on
    let flickers = 0;
    const flicker = setInterval(() => {
      grantedEl.style.opacity = flickers % 2 === 0 ? '1' : '0';
      flickers++;
      if (flickers >= 6) {
        clearInterval(flicker);
        grantedEl.style.opacity = '1';
        setTimeout(cb, 600);
      }
    }, 80);
  }

  // ── Glitch + shatter transition ───────────────────────────────
  function startGlitch() {
    if (glitchStarted) return;
    glitchStarted = true;

    const W = overlay.offsetWidth;
    const H = overlay.offsetHeight;
    canvas.width  = W;
    canvas.height = H;
    canvas.style.display = 'block';
    grantedEl.style.display = 'none';

    const ctx = canvas.getContext('2d');

    // Phase 1: RGB split glitch (0.8s)
    let phase1 = 0;
    const glitchLines = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);

      // Random horizontal tear strips
      const strips = 18;
      for (let s = 0; s < strips; s++) {
        const y  = Math.random() * H;
        const h  = 2 + Math.random() * 22;
        const dx = (Math.random() - 0.5) * 60;

        // Red channel
        ctx.fillStyle = 'rgba(255,0,0,0.7)';
        ctx.fillRect(dx, y, W, h);

        // Green channel offset
        ctx.fillStyle = 'rgba(0,255,70,0.5)';
        ctx.fillRect(-dx * 0.6, y + 1, W, h);

        // Bright white strip occasionally
        if (Math.random() > 0.7) {
          ctx.fillStyle = 'rgba(255,255,255,0.85)';
          ctx.fillRect(0, y, W, 2);
        }
      }

      // Green scan lines
      ctx.fillStyle = 'rgba(0,255,70,0.04)';
      for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 2);

      // "ACCESS GRANTED" ghost text during glitch
      ctx.font = 'bold 48px monospace';
      ctx.fillStyle = `rgba(0,255,70,${0.3 + Math.random() * 0.4})`;
      ctx.textAlign = 'center';
      const offX = (Math.random() - 0.5) * 20;
      const offY = (Math.random() - 0.5) * 14;
      ctx.fillText('ACCESS GRANTED', W / 2 + offX, H / 2 + offY);

      phase1++;
      if (phase1 < 30) {
        requestAnimationFrame(glitchLines);
      } else {
        startShatter();
      }
    };
    requestAnimationFrame(glitchLines);
  }

  // Phase 2: shatter — overlay shrinks/splits away
  function startShatter() {
    canvas.style.display = 'none';

    // Add shatter class for CSS animation
    overlay.classList.add('intro-shatter');

    overlay.addEventListener('animationend', () => {
      overlay.remove();
      finished = true;
    }, { once: true });
  }

  // ── Coordination: wait for BOTH terminal AND models ───────────
  // The glitch plays as soon as both are ready
  function tryReveal() {
    if (modelsReady && !glitchStarted) startGlitch();
  }

  // Called by desktopScene when all GLBs are loaded
  function onModelsReady() {
    modelsReady = true;
    tryReveal();
  }

  // ── Start the sequence ────────────────────────────────────────
  runTerminal(() => {
    // Terminal done — show ACCESS GRANTED, then wait for models
    showGranted(() => {
      // Terminal + granted phase done — reveal as soon as models ready
      tryReveal();
    });
  });

  return { onModelsReady };
}
