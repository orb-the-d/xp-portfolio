// src/intro.js
// Terminal boot intro — fixed 5s duration, no dependency on model loading

export function initIntro() {
  const overlay   = document.getElementById('intro-overlay');
  if (!overlay) return { onModelsReady: () => {} };

  const termOutput = document.getElementById('intro-term-output');
  const grantedEl  = document.getElementById('intro-granted');
  const canvas     = document.getElementById('intro-glitch-canvas');

  let glitchStarted = false;

  // ── Terminal lines with absolute timestamps ───────────────────
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

  // ── Type a single line ────────────────────────────────────────
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
      if (i > text.length) {
        clearInterval(iv);
        row.textContent = text;
      }
    }, 20);
  }

  // ── Schedule all lines ────────────────────────────────────────
  LINES.forEach(({ text, t }) => setTimeout(() => typeLine(text), t));

  // ── ACCESS GRANTED at t=4200 ──────────────────────────────────
  setTimeout(() => {
    termOutput.style.transition = 'opacity 0.3s';
    termOutput.style.opacity = '0';

    setTimeout(() => {
      grantedEl.style.display = 'flex';
      let flickers = 0;
      const flicker = setInterval(() => {
        grantedEl.style.opacity = flickers % 2 === 0 ? '1' : '0';
        flickers++;
        if (flickers >= 6) {
          clearInterval(flicker);
          grantedEl.style.opacity = '1';
        }
      }, 80);
    }, 300);
  }, 4200);

  // ── Glitch + shatter at t=5200 — NO model dependency ─────────
  setTimeout(() => startGlitch(), 5200);

  // ── Glitch phase ─────────────────────────────────────────────
  function startGlitch() {
    if (glitchStarted) return;
    glitchStarted = true;

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

      // Horizontal RGB tear strips
      for (let s = 0; s < 20; s++) {
        const y  = Math.random() * H;
        const h  = 2 + Math.random() * 24;
        const dx = (Math.random() - 0.5) * 70;
        ctx.fillStyle = 'rgba(255,0,0,0.65)';
        ctx.fillRect(dx, y, W, h);
        ctx.fillStyle = 'rgba(0,255,70,0.45)';
        ctx.fillRect(-dx * 0.5, y + 1, W, h);
        if (Math.random() > 0.65) {
          ctx.fillStyle = 'rgba(255,255,255,0.9)';
          ctx.fillRect(0, y, W, 2);
        }
      }

      // Scanlines
      ctx.fillStyle = 'rgba(0,255,70,0.04)';
      for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 2);

      // Ghost ACCESS GRANTED text
      ctx.font = `bold ${Math.round(W * 0.04)}px monospace`;
      ctx.fillStyle = `rgba(0,255,70,${0.25 + Math.random() * 0.5})`;
      ctx.textAlign = 'center';
      ctx.fillText('ACCESS GRANTED',
        W / 2 + (Math.random() - 0.5) * 24,
        H / 2 + (Math.random() - 0.5) * 16
      );

      frame++;
      if (frame < 28) requestAnimationFrame(drawGlitch);
      else            startShatter();
    }

    requestAnimationFrame(drawGlitch);
  }

  // ── Shatter ───────────────────────────────────────────────────
  function startShatter() {
    canvas.style.display = 'none';
    overlay.classList.add('intro-shatter');
    overlay.addEventListener('animationend', () => overlay.remove(), { once: true });
  }

  // ── onModelsReady: kept for API compatibility but not required ─
  function onModelsReady() {
    // models ready early? do nothing — timing is fixed
  }

  return { onModelsReady };
}