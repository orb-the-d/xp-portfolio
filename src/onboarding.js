// src/onboarding.js
// Guided onboarding tour — shown once per visitor (localStorage flag)

export function initOnboarding() {
  const STORAGE_KEY = 'djamal_portfolio_tour_done';

  const overlay  = document.getElementById('onboarding-overlay');
  if (!overlay) return;

  // ── If tour already completed, remove overlay entirely ─────────
  if (localStorage.getItem(STORAGE_KEY)) {
    overlay.remove();
    return;
  }

  // ── Step helpers ────────────────────────────────────────────────
  function showStep(n) {
    // Hide all steps
    overlay.querySelectorAll('.ob-step').forEach(el => {
      el.style.display = 'none';
    });

    if (n === 0) {
      // Tour done — dismiss overlay
      overlay.style.transition = 'opacity 0.4s';
      overlay.style.opacity    = '0';
      setTimeout(() => overlay.remove(), 420);
      localStorage.setItem(STORAGE_KEY, '1');
      return;
    }

    const step = document.getElementById(`ob-step-${n}`);
    if (!step) return;
    step.style.display = 'flex';

    // Re-trigger fade animation
    step.querySelector('.ob-card')?.classList.remove('ob-anim');
    void step.querySelector('.ob-card')?.offsetWidth; // reflow
    step.querySelector('.ob-card')?.classList.add('ob-anim');

    // If step 6 — start mini matrix canvas
    if (n === 6) startMiniMatrix();
  }

  // ── Wire up buttons ─────────────────────────────────────────────
  document.getElementById('ob-start')?.addEventListener('click', () => { clearTimeout(autoTimer); showStep(2); });
  document.getElementById('ob-skip-all')?.addEventListener('click', () => { clearTimeout(autoTimer); showStep(0); });
  document.getElementById('ob-finish')?.addEventListener('click', () => showStep(0));

  // Generic "Next" buttons carry data-next attribute
  overlay.querySelectorAll('.ob-next').forEach(btn => {
    btn.addEventListener('click', () => {
      const next = parseInt(btn.dataset.next, 10);
      showStep(next);
    });
  });

  // ── Auto-advance step 1 after 6s if user doesn't interact ──────
  let autoTimer = setTimeout(() => showStep(2), 6000);

  document.getElementById('ob-start')?.addEventListener('click',    () => clearTimeout(autoTimer), { once: true });
  document.getElementById('ob-skip-all')?.addEventListener('click', () => clearTimeout(autoTimer), { once: true });

  // ── Show step 1 to start ────────────────────────────────────────
  showStep(1);

  // ── Mini matrix canvas (step 6 preview) ─────────────────────────
  function startMiniMatrix() {
    const canvas = document.getElementById('ob-matrix-canvas');
    if (!canvas) return;

    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width  = rect.width  || 356;
    canvas.height = rect.height || 70;

    const ctx   = canvas.getContext('2d');
    const cols  = Math.floor(canvas.width / 14);
    const drops = Array.from({ length: cols }, () => Math.random() * canvas.height / 14 | 0);
    const chars = 'アイウエオカキクケコ01ABCDEF<>{}[]'.split('');

    let raf;
    function draw() {
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = '11px monospace';

      drops.forEach((y, i) => {
        const ch     = chars[Math.random() * chars.length | 0];
        const x      = i * 14;
        const bright = Math.random() > 0.92;
        ctx.fillStyle = bright ? '#afffcf' : '#00cc55';
        ctx.fillText(ch, x, y * 14);

        if (y * 14 > canvas.height && Math.random() > 0.96) drops[i] = 0;
        else drops[i]++;
      });

      raf = requestAnimationFrame(draw);
    }

    draw();

    // Stop when overlay is removed
    const obs = new MutationObserver(() => {
      if (!document.contains(canvas)) {
        cancelAnimationFrame(raf);
        obs.disconnect();
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }
}