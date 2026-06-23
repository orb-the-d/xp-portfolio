// intro.js — build v5 — 2026-06-23T12:00:09.003615
// src/intro.js
// Pure JS timing — no CSS animation dependency, cannot freeze

export function initIntro() {
  console.log('[INTRO] v4 loaded — killswitch at 7s');
  const overlay = document.getElementById('intro-overlay');
  if (!overlay) { console.log('[INTRO] no overlay found, skipping'); return { onModelsReady: () => {} }; }
  console.log('[INTRO] overlay found, starting sequence');

  // ── NUCLEAR KILLSWITCH — removes overlay after 7s no matter what ──
  const killTimer = setTimeout(() => forceRemove(), 7000);

  function forceRemove() {
    clearTimeout(killTimer);
    overlay.style.cssText = 'display:none!important;opacity:0!important;pointer-events:none!important;visibility:hidden!important;';
    overlay.classList.add('intro-done');
    try { overlay.remove(); } catch(e) {}
  }

  const termOutput = document.getElementById('intro-term-output');
  const grantedEl  = document.getElementById('intro-granted');
  const canvas     = document.getElementById('intro-glitch-canvas');

  // ── Terminal lines ────────────────────────────────────────────
  const LINES = [
    { text: 'BIOS v2.04  —  POST OK',               t: 0    },
    { text: 'Initializing secure environment...',    t: 400  },
    { text: 'Loading kernel modules      [  OK  ]',  t: 900  },
    { text: 'Mounting encrypted volume   [  OK  ]',  t: 1400 },
    { text: 'Starting network services   [  OK  ]',  t: 1900 },
    { text: 'Verifying visitor identity...',          t: 2400 },
    { text: '> Scanning threat vectors   [  OK  ]',  t: 2900 },
    { text: '> No intrusions detected',              t: 3300 },
    { text: '> Identity confirmed',                  t: 3700 },
  ];

  function typeLine(text) {
    const row = document.createElement('div');
    row.className = 'iterm-row';
    termOutput.appendChild(row);
    termOutput.scrollTop = termOutput.scrollHeight;
    let i = 0;
    const cursor = document.createElement('span');
    cursor.className = 'iterm-cursor';
    cursor.textContent = '█';
    const iv = setInterval(() => {
      row.textContent = text.slice(0, i);
      row.appendChild(cursor);
      i++;
      if (i > text.length) { clearInterval(iv); row.textContent = text; }
    }, 20);
  }

  LINES.forEach(({ text, t }) => setTimeout(() => typeLine(text), t));

  // ── ACCESS GRANTED at 4200ms ──────────────────────────────────
  setTimeout(() => {
    termOutput.style.transition = 'opacity 0.3s';
    termOutput.style.opacity = '0';
    setTimeout(() => {
      grantedEl.style.display = 'flex';
      let f = 0;
      const fl = setInterval(() => {
        grantedEl.style.opacity = f % 2 === 0 ? '1' : '0';
        f++;
        if (f >= 6) { clearInterval(fl); grantedEl.style.opacity = '1'; }
      }, 80);
    }, 300);
  }, 4200);

  // ── Glitch at 5200ms ─────────────────────────────────────────
  setTimeout(() => startGlitch(), 5200);

  function startGlitch() {
    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width  = W;
    canvas.height = H;
    canvas.style.display = 'block';
    grantedEl.style.display = 'none';

    const ctx = canvas.getContext('2d');
    let frame = 0;

    function drawGlitch() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);

      for (let s = 0; s < 20; s++) {
        const y  = Math.random() * H;
        const h  = 2 + Math.random() * 24;
        const dx = (Math.random() - 0.5) * 70;
        ctx.fillStyle = 'rgba(255,0,0,0.65)';   ctx.fillRect(dx,        y, W, h);
        ctx.fillStyle = 'rgba(0,255,70,0.45)';  ctx.fillRect(-dx * 0.5, y + 1, W, h);
        if (Math.random() > 0.65) {
          ctx.fillStyle = 'rgba(255,255,255,0.9)';
          ctx.fillRect(0, y, W, 2);
        }
      }
      ctx.fillStyle = 'rgba(0,255,70,0.04)';
      for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 2);

      ctx.font = `bold ${Math.round(W * 0.04)}px monospace`;
      ctx.fillStyle = `rgba(0,255,70,${0.25 + Math.random() * 0.5})`;
      ctx.textAlign = 'center';
      ctx.fillText('ACCESS GRANTED',
        W / 2 + (Math.random() - 0.5) * 24,
        H / 2 + (Math.random() - 0.5) * 16
      );

      frame++;
      if (frame < 28) requestAnimationFrame(drawGlitch);
      else            startFadeOut();
    }
    requestAnimationFrame(drawGlitch);
  }

  // ── Pure JS fade-out — no CSS animation, guaranteed to finish ─
  function startFadeOut() {
    canvas.style.display = 'none';
    overlay.style.transition = 'none';

    let opacity = 1;
    const STEPS    = 20;
    const INTERVAL = 25; // 20 steps × 25ms = 500ms total

    const iv = setInterval(() => {
      opacity -= 1 / STEPS;
      overlay.style.opacity = Math.max(0, opacity).toString();

      if (opacity <= 0) {
        clearInterval(iv);
        // Hard remove — no waiting for any event
        overlay.style.display = 'none';
        overlay.style.pointerEvents = 'none';
        forceRemove();
      }
    }, INTERVAL);
  }

  return { onModelsReady: () => {} };
}