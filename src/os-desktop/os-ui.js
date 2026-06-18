// ═══════════════════════════════════════════════════════════════════
//  os-ui.js  — Full XP Experience
//  Features:
//   • Multi-window drag/resize/z-order
//   • XP sounds (startup, click, error, close, minimize)
//   • Real boot sequence (XP logo → progress bar → Welcome → chime)
//   • Screensaver (matrix rain after 30s idle)
//   • Notepad with typewriter intro
//   • CMD hacking terminal (fake nmap / Wireshark output)
//   • Minesweeper (playable)
//   • Random error dialog (30–60s after login)
//   • CRT scanline overlay
// ═══════════════════════════════════════════════════════════════════

const APP_META = {
  about:    { label: 'About Me',          icon: '/icons/cv_logo.png'       },
  certs:    { label: 'Certs & Education', icon: '/icons/cert.png'          },
  projects: { label: 'Projects',          icon: '/icons/proj.png'          },
  github:   { label: 'GitHub',            icon: '/icons/github-logo.png'   },
  linkedin: { label: 'LinkedIn',          icon: '/icons/linkedin_logo.png' },
  contact:  { label: 'Contact Me',        icon: '/icons/contact_me.png'    },
  notepad:  { label: 'Notepad',           icon: '/icons/notepad.png'       },
  cmd:      { label: 'Command Prompt',    icon: '/icons/cmd.png'           },
  mines:    { label: 'Minesweeper',       icon: '/icons/mines.png'         },
};

const SPAWN_OFFSETS = [
  {top:18,left:80},{top:30,left:110},{top:22,left:95},
  {top:26,left:120},{top:14,left:105},{top:32,left:90},
];
let spawnIdx = 0;
let zCounter = 10;
function nextZ() { return ++zCounter; }

// ── Sound engine (Web Audio API — no files needed) ─────────────────
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let actx = null;

function getACtx() {
  if (!actx) actx = new AudioCtx();
  return actx;
}

function playTone(freq, duration, type='sine', gain=0.18, delay=0) {
  try {
    const ctx = getACtx();
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, ctx.currentTime + delay);
    g.gain.linearRampToValueAtTime(gain, ctx.currentTime + delay + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration + 0.05);
  } catch(e) {}
}

function soundClick()    { playTone(1200, 0.04, 'square', 0.08); }
function soundClose()    { playTone(400, 0.12, 'sine', 0.12); playTone(300, 0.1, 'sine', 0.08, 0.1); }
function soundMinimize() { playTone(900, 0.06, 'sine', 0.1); playTone(700, 0.06, 'sine', 0.1, 0.06); }
function soundError()    {
  playTone(494, 0.15, 'square', 0.15);
  playTone(494, 0.15, 'square', 0.15, 0.18);
}
function soundStartup()  {
  // Approximate XP startup chime — rising arpeggio
  const notes = [523, 659, 784, 1047, 1319];
  notes.forEach((f, i) => playTone(f, 0.4, 'sine', 0.14, i * 0.18));
  playTone(1568, 0.7, 'sine', 0.16, notes.length * 0.18);
}
function soundWelcome()  {
  [784, 988, 1175, 1568].forEach((f, i) => playTone(f, 0.25, 'sine', 0.13, i * 0.14));
}

export function initOS() {
  const osScreen    = document.getElementById('os-screen');
  const bootScreen  = document.getElementById('os-boot-screen');
  const loginScreen = document.getElementById('xp-login-screen');
  const loginAcct   = document.getElementById('xp-login-account');
  const startBtn    = document.getElementById('xp-start-button');
  const startMenu   = document.getElementById('xp-start-menu');
  const taskbarArea = document.getElementById('xp-taskbar-area');
  const clockEl     = document.getElementById('xp-clock');
  const ctxMenu     = document.getElementById('xp-context-menu');
  const dragOverlay = document.getElementById('drag-overlay');
  const desktop     = document.getElementById('xp-desktop');
  const crtOverlay  = document.getElementById('crt-overlay');
  const screensaver = document.getElementById('xp-screensaver');
  const ssCanvas    = document.getElementById('ss-canvas');

  const appWindows  = document.querySelectorAll('.app-window');
  const deskIcons   = document.querySelectorAll('.xp-icon[data-app]');

  let isBooting = false;
  let idleTimer  = null;
  let ssActive   = false;
  let errorShown = false;

  const winState = {};
  Object.keys(APP_META).forEach(id => { winState[id] = { open:false, minimized:false }; });

  // ── Clock ──────────────────────────────────────────────────────
  function updateClock() {
    if (!clockEl) return;
    const now = new Date();
    const t = clockEl.querySelector('.clock-time');
    const d = clockEl.querySelector('.clock-date');
    if (t) t.textContent = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    if (d) d.textContent = now.toLocaleDateString('en-GB',{day:'2-digit',month:'short'});
  }
  updateClock();
  setInterval(updateClock, 10000);

  // ── Taskbar ────────────────────────────────────────────────────
  function refreshTaskbar() {
    if (!taskbarArea) return;
    taskbarArea.innerHTML = '';
    Object.keys(APP_META).forEach(id => {
      const s = winState[id];
      if (!s.open) return;
      const m   = APP_META[id];
      const btn = document.createElement('button');
      btn.className = 'taskbar-app' + (s.minimized ? '' : ' active');
      btn.innerHTML = `<img src="${m.icon}" alt="" onerror="this.style.display='none'"><span>${m.label}</span>`;
      btn.addEventListener('click', () => s.minimized ? restoreWindow(id) : focusWindow(id));
      taskbarArea.appendChild(btn);
    });
  }

  // ── Window helpers ─────────────────────────────────────────────
  function getWin(id)   { return document.getElementById('app-' + id); }

  function focusWindow(id) {
    const win = getWin(id);
    if (!win) return;
    appWindows.forEach(w => w.classList.remove('focused'));
    win.style.zIndex = nextZ();
    win.classList.add('focused');
    refreshTaskbar();
  }

  function openApp(id) {
    soundClick();
    const s   = winState[id];
    const win = getWin(id);
    if (!win) return;
    if (s.open && !s.minimized) { focusWindow(id); closeStartMenu(); return; }
    if (s.minimized)            { restoreWindow(id); closeStartMenu(); return; }

    const off = SPAWN_OFFSETS[spawnIdx++ % SPAWN_OFFSETS.length];
    win.style.top    = off.top  + 'px';
    win.style.left   = off.left + 'px';
    win.style.width  = win.dataset.w || win.style.width  || '420px';
    win.style.height = win.dataset.h || win.style.height || '265px';
    win.dataset.state = 'normal';

    void win.offsetWidth;
    win.classList.add('visible');
    win.style.zIndex = nextZ();
    appWindows.forEach(w => { if (w !== win) w.classList.remove('focused'); });
    win.classList.add('focused');
    s.open = true; s.minimized = false;

    // Boot app-specific content
    if (id === 'notepad') startNotepadTypewriter();
    if (id === 'cmd')     startHackingTerminal();
    if (id === 'mines')   initMinesweeper();

    refreshTaskbar(); closeStartMenu(); clearIconSel();
  }

  function closeWindow(id) {
    soundClose();
    const win = getWin(id);
    if (!win) return;
    win.classList.remove('visible');
    win.classList.add('minimizing');
    setTimeout(() => win.classList.remove('minimizing', 'visible', 'focused'), 200);
    winState[id].open = false; winState[id].minimized = false;
    refreshTaskbar();
  }

  function minimizeWindow(id) {
    soundMinimize();
    const win = getWin(id);
    if (!win) return;
    win.classList.remove('visible');
    win.classList.add('minimizing');
    setTimeout(() => win.classList.remove('minimizing'), 200);
    winState[id].minimized = true;
    refreshTaskbar();
  }

  function restoreWindow(id) {
    const win = getWin(id);
    if (!win) return;
    win.classList.remove('minimizing');
    void win.offsetWidth;
    win.classList.add('visible');
    win.style.zIndex = nextZ();
    appWindows.forEach(w => w.classList.remove('focused'));
    win.classList.add('focused');
    winState[id].minimized = false;
    refreshTaskbar();
  }

  function maximizeOrRestore(id) {
    const win = getWin(id);
    if (!win) return;
    const dw = desktop.clientWidth, dh = desktop.clientHeight;
    if (win.dataset.state !== 'max') {
      winState[id].prevRect = { top:win.style.top, left:win.style.left, width:win.style.width, height:win.style.height };
      Object.assign(win.style, { top:'0px', left:'0px', width:dw+'px', height:dh+'px' });
      win.dataset.state = 'max';
    } else {
      if (winState[id].prevRect) Object.assign(win.style, winState[id].prevRect);
      win.dataset.state = 'normal';
    }
  }

  function hideAllWindows() {
    appWindows.forEach(w => w.classList.remove('visible','minimizing','focused'));
    Object.keys(winState).forEach(id => { winState[id].open=false; winState[id].minimized=false; });
    refreshTaskbar();
  }

  // ── Drag ───────────────────────────────────────────────────────
  function initDrag(win, bar) {
    let dr=false, sx,sy,sl,st;
    bar.addEventListener('mousedown', e => {
      if (e.target.closest('.win-titlebar-buttons,.win-menubar')) return;
      dr=true; sx=e.clientX; sy=e.clientY;
      sl=parseInt(win.style.left)||0; st=parseInt(win.style.top)||0;
      dragOverlay?.classList.add('active');
      focusWindow(win.id.replace('app-',''));
      e.preventDefault();
    });
    document.addEventListener('mousemove', e => {
      if (!dr) return;
      const maxL=desktop.clientWidth-40, maxT=desktop.clientHeight-20;
      win.style.left = Math.max(-win.clientWidth+40, Math.min(maxL, sl+(e.clientX-sx)))+'px';
      win.style.top  = Math.max(0, Math.min(maxT, st+(e.clientY-sy)))+'px';
    });
    document.addEventListener('mouseup', () => { if(dr){dr=false;dragOverlay?.classList.remove('active');} });
  }

  // ── Resize ─────────────────────────────────────────────────────
  function initResize(win, handle) {
    let rs=false, sx,sy,sw,sh;
    handle.addEventListener('mousedown', e => {
      rs=true; sx=e.clientX; sy=e.clientY; sw=win.clientWidth; sh=win.clientHeight;
      dragOverlay?.classList.add('active'); dragOverlay.style.cursor='nwse-resize';
      e.preventDefault(); e.stopPropagation();
    });
    document.addEventListener('mousemove', e => {
      if (!rs) return;
      win.style.width  = Math.max(220, sw+(e.clientX-sx))+'px';
      win.style.height = Math.max(140, sh+(e.clientY-sy))+'px';
    });
    document.addEventListener('mouseup', () => {
      if(rs){rs=false;dragOverlay?.classList.remove('active');dragOverlay.style.cursor='';}
    });
  }

  // ── Wire windows ───────────────────────────────────────────────
  appWindows.forEach(win => {
    const id  = win.id.replace('app-','');
    const bar = win.querySelector('.win-titlebar');
    const rh  = win.querySelector('.win-resize');
    if (bar) initDrag(win, bar);
    if (rh)  initResize(win, rh);
    win.addEventListener('mousedown', () => focusWindow(id));
    win.querySelector('.win-btn-close')?.addEventListener('click', () => closeWindow(id));
    win.querySelector('.win-btn-min')  ?.addEventListener('click', () => minimizeWindow(id));
    win.querySelector('.win-btn-max')  ?.addEventListener('click', () => maximizeOrRestore(id));
    bar?.addEventListener('dblclick', e => { if(!e.target.closest('.win-titlebar-buttons')) maximizeOrRestore(id); });
  });

  // ── Icons ──────────────────────────────────────────────────────
  function clearIconSel() { deskIcons.forEach(i=>i.classList.remove('selected')); }
  deskIcons.forEach(icon => {
    const id = icon.dataset.app;
    icon.addEventListener('click',    ()=>{ clearIconSel(); icon.classList.add('selected'); });
    icon.addEventListener('dblclick', ()=>{ clearIconSel(); icon.classList.add('selected'); openApp(id); });
    icon.addEventListener('keydown',  e=>{ if(e.key==='Enter'){e.preventDefault();openApp(id);} });
  });

  // ── Start menu ─────────────────────────────────────────────────
  const openStartMenu  = () => { startMenu?.classList.add('open');    startBtn?.setAttribute('aria-expanded','true');  };
  const closeStartMenu = () => { startMenu?.classList.remove('open'); startBtn?.setAttribute('aria-expanded','false'); };
  startBtn?.addEventListener('click', e=>{ e.stopPropagation(); startMenu?.classList.contains('open')?closeStartMenu():openStartMenu(); });
  document.querySelectorAll('.xp-start-app[data-app]').forEach(i=>i.addEventListener('click',()=>openApp(i.dataset.app)));
  document.querySelectorAll('.xp-section-link[data-app]').forEach(i=>i.addEventListener('click',()=>openApp(i.dataset.app)));

  // ── Context menu ───────────────────────────────────────────────
  desktop?.addEventListener('contextmenu', e=>{
    if (e.target.closest('.app-window,.xp-icon')) return;
    e.preventDefault();
    const r=desktop.getBoundingClientRect();
    if (ctxMenu) {
      ctxMenu.style.left = Math.min(e.clientX-r.left, desktop.clientWidth-160)+'px';
      ctxMenu.style.top  = Math.min(e.clientY-r.top,  desktop.clientHeight-100)+'px';
      ctxMenu.classList.add('open');
    }
  });
  document.querySelectorAll('.ctx-item').forEach(i=>i.addEventListener('click',()=>ctxMenu?.classList.remove('open')));

  // ── Logoff / shutdown ──────────────────────────────────────────
  document.querySelector('.xp-shutdown')?.addEventListener('click',()=>{ clearIconSel(); performShutdown(); });
  document.querySelector('.xp-logoff')  ?.addEventListener('click',()=>{ clearIconSel(); performLogoff();   });

  // ── Global click to close menus ────────────────────────────────
  document.addEventListener('click', e=>{
    if (startMenu && !startMenu.contains(e.target) && e.target!==startBtn) closeStartMenu();
    if (ctxMenu   && !ctxMenu.contains(e.target))   ctxMenu.classList.remove('open');
  });

  // ── Login ──────────────────────────────────────────────────────
  function doLogin() {
    if (loginScreen) loginScreen.style.display='none';
    soundWelcome();
    resetIdleTimer();
    // Random error dialog after 35–65s
    setTimeout(showErrorDialog, 35000 + Math.random()*30000);
  }
  loginAcct?.addEventListener('click',   doLogin);
  loginAcct?.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '){e.preventDefault();doLogin();} });

  // ── Boot sequence ──────────────────────────────────────────────
  function startBootSequence() {
    if (!osScreen || isBooting) return;
    isBooting = true;
    osScreen.style.display = 'block';
    hideAllWindows(); closeStartMenu();

    // Phase 1: black boot with XP bar (2.5s)
    if (bootScreen) { bootScreen.style.display='flex'; bootScreen.dataset.phase='boot'; }
    if (loginScreen) loginScreen.style.display='none';

    setTimeout(() => {
      // Phase 2: XP "Welcome" screen — dark-blue gradient with user icon + name
      if (bootScreen) {
        bootScreen.innerHTML = `
          <div style="position:absolute;inset:0;display:flex;flex-direction:column;overflow:hidden;
                      font-family:'Trebuchet MS',Tahoma,sans-serif;">
            <!-- top dark-blue bar -->
            <div style="height:36px;flex-shrink:0;background:linear-gradient(180deg,#1c3fa8,#1a3a9e);
                        border-bottom:2px solid #0f2280;"></div>
            <!-- centre -->
            <div style="flex:1;background:radial-gradient(ellipse at 20% 40%,rgba(140,170,230,0.45) 0%,transparent 55%),
                        linear-gradient(160deg,#5578c8 0%,#4a6fbe 35%,#3d5eaa 70%,#304da0 100%);
                        display:flex;align-items:center;justify-content:center;gap:32px;">
              <!-- user avatar -->
              <div style="width:72px;height:72px;border-radius:4px;background:linear-gradient(135deg,#5b9bd5,#1a5aaa);
                          display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:bold;
                          color:#fff;border:3px solid rgba(255,255,255,0.65);box-shadow:0 4px 14px rgba(0,0,0,0.5);">DJ</div>
              <div style="display:flex;flex-direction:column;gap:10px;align-items:flex-start;">
                <div style="color:#fff;font-size:26px;font-weight:bold;text-shadow:0 2px 8px rgba(0,0,0,0.5);">Welcome</div>
                <div style="width:200px;height:4px;background:rgba(255,255,255,0.2);border-radius:2px;overflow:hidden;">
                  <div id="welcome-bar" style="height:100%;width:0;background:#fff;border-radius:2px;transition:width 1.2s ease;"></div>
                </div>
              </div>
            </div>
            <!-- bottom bar -->
            <div style="height:46px;flex-shrink:0;background:linear-gradient(180deg,#1a3a9e,#142e8a);
                        border-top:2px solid #0f2070;"></div>
          </div>`;
        setTimeout(()=>{ const b=document.getElementById('welcome-bar'); if(b) b.style.width='100%'; },50);
      }
      soundStartup();
    }, 2500);

    setTimeout(() => {
      if (bootScreen)  bootScreen.style.display = 'none';
      if (loginScreen) { loginScreen.style.display = 'flex'; }
      isBooting = false;
    }, 4200);
  }

  function hideOS() {
    if (!osScreen) return;
    osScreen.style.display = 'none';
    isBooting = false;
    hideAllWindows(); closeStartMenu();
    if (loginScreen) loginScreen.style.display='none';
    stopScreensaver();
  }

  function performLogoff() { hideAllWindows(); closeStartMenu(); if(loginScreen) { loginScreen.style.display='flex'; } }
  function performShutdown() { hideAllWindows(); closeStartMenu(); startBootSequence(); }

  // ── CRT scanline overlay ───────────────────────────────────────
  // Injected via CSS — we just need the element to exist
  if (osScreen && !document.getElementById('crt-overlay')) {
    const crt = document.createElement('div');
    crt.id = 'crt-overlay';
    osScreen.appendChild(crt);
  }

  // ── Screensaver — Matrix rain ──────────────────────────────────
  let ssCtx = null;
  let ssRaf  = null;
  const SS_TIMEOUT = 7000; // 7s idle

  function resetIdleTimer() {
    clearTimeout(idleTimer);
    if (ssActive) stopScreensaver();
    idleTimer = setTimeout(startScreensaver, SS_TIMEOUT);
  }

  ['mousemove','mousedown','keydown','touchstart'].forEach(ev=>{
    document.addEventListener(ev, resetIdleTimer, { passive:true });
  });

  function startScreensaver() {
    if (!screensaver || !ssCanvas) return;
    ssActive = true;
    screensaver.style.display = 'block';
    void screensaver.offsetWidth;
    screensaver.style.opacity = '1';

    const W = ssCanvas.width  = screensaver.clientWidth  || 702;
    const H = ssCanvas.height = screensaver.clientHeight || 368;
    ssCtx = ssCanvas.getContext('2d');

    const cols    = Math.floor(W / 14);
    const drops   = Array(cols).fill(1);
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&アイウエオカキクケコ';

    function drawMatrix() {
      ssCtx.fillStyle = 'rgba(0,0,0,0.05)';
      ssCtx.fillRect(0,0,W,H);
      ssCtx.fillStyle = '#0f0';
      ssCtx.font = '13px monospace';
      drops.forEach((y,i)=>{
        const ch = charset[Math.floor(Math.random()*charset.length)];
        ssCtx.fillStyle = Math.random() > 0.95 ? '#fff' : '#0f0';
        ssCtx.fillText(ch, i*14, y*14);
        if (y*14 > H && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      });
      ssRaf = requestAnimationFrame(drawMatrix);
    }
    drawMatrix();

    screensaver.addEventListener('click', stopScreensaver, { once:true });
    screensaver.addEventListener('keydown', stopScreensaver, { once:true });
  }

  function stopScreensaver() {
    ssActive = false;
    if (ssRaf) { cancelAnimationFrame(ssRaf); ssRaf=null; }
    if (screensaver) { screensaver.style.opacity='0'; setTimeout(()=>{ screensaver.style.display='none'; },400); }
  }

  // ── Error dialog ───────────────────────────────────────────────
  function showErrorDialog() {
    if (errorShown) return;
    errorShown = true;
    soundError();
    const dlg = document.getElementById('xp-error-dialog');
    if (!dlg) return;
    dlg.style.display = 'flex';
    void dlg.offsetWidth;
    dlg.classList.add('visible');
    // Random position on desktop
    dlg.style.top  = (40 + Math.random()*80)+'px';
    dlg.style.left = (80 + Math.random()*120)+'px';
    const bar = dlg.querySelector('.win-titlebar');
    if (bar) initDrag(dlg, bar);
  }

  document.getElementById('xp-error-ok')?.addEventListener('click', ()=>{
    soundClick();
    const dlg = document.getElementById('xp-error-dialog');
    if (dlg) { dlg.classList.remove('visible'); setTimeout(()=>dlg.style.display='none',200); }
  });

  // ── Contact form ───────────────────────────────────────────────
  document.getElementById('cf-send')?.addEventListener('click',()=>{
    soundClick();
    const name  = document.getElementById('cf-name')?.value.trim();
    const email = document.getElementById('cf-email')?.value.trim();
    const msg   = document.getElementById('cf-msg')?.value.trim();
    const status= document.getElementById('cf-status');
    if (!name||!email||!msg) {
      soundError();
      if (status) status.innerHTML='<span class="win-statusbar-panel" style="color:#c00">Please fill all fields</span>';
      return;
    }
    window.open(`mailto:your.email@example.com?subject=Portfolio contact from ${encodeURIComponent(name)}&body=${encodeURIComponent(msg+'\n\nFrom: '+email)}`);
    if (status) status.innerHTML='<span class="win-statusbar-panel" style="color:#060">✓ Opening mail client…</span>';
  });

  // ── Notepad typewriter ─────────────────────────────────────────
  let notepadTyping = false;
  function startNotepadTypewriter() {
    const ta = document.getElementById('notepad-area');
    if (!ta || notepadTyping) return;
    notepadTyping = true;
    ta.value = '';
    const text =
`Hey — welcome to my portfolio.

I'm Djamal, a Computer Science graduate (June 2025)
currently hunting for my first SOC Analyst role.

What I bring:
  [x] CompTIA Security+ (SY0-701)
  [x] Cisco Ethical Hacker
  [x] Hands-on: SIEM, Wireshark, Snort, Python
  [x] Built a full NIDS lab at home
  [x] CTF player — always learning

Goal: join a SOC team, get real incident-response
experience, then pursue a Master's in Cybersecurity
or CS somewhere in Europe.

If you're reading this — let's connect.
  > LinkedIn: linkedin.com/in/YOUR_HANDLE
  > GitHub:   github.com/YOUR_GITHUB
  > Email:    your.email@example.com

-- Djamal`;
    let i = 0;
    function typeNext() {
      if (i < text.length) {
        ta.value += text[i++];
        ta.scrollTop = ta.scrollHeight;
        setTimeout(typeNext, 22 + Math.random()*18);
      } else { notepadTyping = false; }
    }
    setTimeout(typeNext, 400);
  }

  // ── CMD hacking terminal ───────────────────────────────────────
  let cmdRunning = false;
  function startHackingTerminal() {
    const out = document.getElementById('cmd-output');
    if (!out || cmdRunning) return;
    cmdRunning = true;
    out.innerHTML = '';

    const lines = [
      { text:'Microsoft Windows XP [Version 5.1.2600]', delay:0 },
      { text:'(C) Copyright 1985-2001 Microsoft Corp.', delay:120 },
      { text:'', delay:200 },
      { text:'C:\\Users\\Djamal> whoami', delay:400, prompt:true },
      { text:'djamal — SOC Analyst Candidate | CompTIA Sec+ | Cisco EH', delay:700 },
      { text:'', delay:900 },
      { text:'C:\\Users\\Djamal> nmap -sV -O --script vuln 192.168.1.0/24', delay:1100, prompt:true },
      { text:'Starting Nmap 7.94 ( https://nmap.org )', delay:1400 },
      { text:'Nmap scan report for 192.168.1.1', delay:1700 },
      { text:'Host is up (0.0012s latency).', delay:1900 },
      { text:'PORT     STATE  SERVICE   VERSION', delay:2100 },
      { text:'22/tcp   open   ssh       OpenSSH 8.2p1', delay:2300 },
      { text:'80/tcp   open   http      Apache httpd 2.4.41', delay:2500 },
      { text:'443/tcp  open   https     nginx 1.18.0', delay:2700 },
      { text:'3306/tcp open   mysql     MySQL 8.0.28', delay:2900 },
      { text:'[!] VULNERABILITY: CVE-2021-41773 (Apache path traversal)', delay:3200, warn:true },
      { text:'', delay:3400 },
      { text:'C:\\Users\\Djamal> python3 osint_tool.py --target example.com', delay:3600, prompt:true },
      { text:'[*] WHOIS lookup...        ✓', delay:4000 },
      { text:'[*] DNS enumeration...     ✓  (A, MX, TXT records found)', delay:4300 },
      { text:'[*] Shodan scan...         ✓  (2 exposed services)', delay:4700 },
      { text:'[*] HaveIBeenPwned check.. ✓  (0 breaches)', delay:5100 },
      { text:'[+] Report saved to ./reports/example_com_scan.txt', delay:5500 },
      { text:'', delay:5700 },
      { text:'C:\\Users\\Djamal> _', delay:5900, prompt:true, cursor:true },
    ];

    lines.forEach(({text, delay, prompt, warn, cursor}) => {
      setTimeout(()=>{
        const line = document.createElement('div');
        line.className = 'cmd-line' + (prompt?' cmd-prompt':'') + (warn?' cmd-warn':'') + (cursor?' cmd-cursor':'');
        line.textContent = text;
        out.appendChild(line);
        out.scrollTop = out.scrollHeight;
      }, delay);
    });
  }

  // ── Minesweeper ────────────────────────────────────────────────
  function initMinesweeper() {
    const container = document.getElementById('mines-board');
    if (!container || container.dataset.init) return;
    container.dataset.init = '1';

    const ROWS=9, COLS=9, MINES=10;
    let board=[], revealed=[], flagged=[], gameOver=false, firstClick=true;
    const faceBtn = document.getElementById('mines-face');
    const mineCount = document.getElementById('mines-count');
    const timeEl    = document.getElementById('mines-time');
    let timer=null, timeVal=0, flagsLeft=MINES;

    function buildBoard() {
      board    = Array.from({length:ROWS},()=>Array(COLS).fill(0));
      revealed = Array.from({length:ROWS},()=>Array(COLS).fill(false));
      flagged  = Array.from({length:ROWS},()=>Array(COLS).fill(false));
      gameOver = false; firstClick = true; timeVal=0; flagsLeft=MINES;
      clearInterval(timer);
      if(mineCount) mineCount.textContent = String(flagsLeft).padStart(3,'0');
      if(timeEl)    timeEl.textContent    = '000';
      if(faceBtn)   faceBtn.textContent   = '🙂';
      render();
    }

    function placeMines(avoidR, avoidC) {
      let placed=0;
      while(placed<MINES){
        const r=Math.floor(Math.random()*ROWS), c=Math.floor(Math.random()*COLS);
        if(board[r][c]!==-1 && !(r===avoidR&&c===avoidC)){board[r][c]=-1;placed++;}
      }
      for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) {
        if(board[r][c]===-1) continue;
        let n=0;
        for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++){
          const nr=r+dr,nc=c+dc;
          if(nr>=0&&nr<ROWS&&nc>=0&&nc<COLS&&board[nr][nc]===-1) n++;
        }
        board[r][c]=n;
      }
    }

    const NUM_COLORS=['','#0000ff','#008000','#ff0000','#000080','#800000','#008080','#000000','#808080'];

    function render() {
      container.innerHTML='';
      container.style.cssText='display:grid;grid-template-columns:repeat(9,22px);gap:1px;background:#888;padding:2px;border:2px inset #aaa;';
      for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
        const cell=document.createElement('div');
        const isRev=revealed[r][c], isFlag=flagged[r][c];
        cell.style.cssText='width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;font-family:Tahoma,sans-serif;cursor:pointer;box-sizing:border-box;user-select:none;';
        if(isRev){
          cell.style.background='#c0c0c0';
          cell.style.border='1px inset #888';
          if(board[r][c]===-1){ cell.textContent='💣'; cell.style.background='#ff0000'; }
          else if(board[r][c]>0){ cell.textContent=board[r][c]; cell.style.color=NUM_COLORS[board[r][c]]; }
        } else {
          cell.style.background='#c0c0c0';
          cell.style.border='2px outset #fff';
          cell.textContent = isFlag ? '🚩' : '';
        }
        cell.addEventListener('click', ()=>handleClick(r,c));
        cell.addEventListener('contextmenu', e=>{e.preventDefault();handleFlag(r,c);});
        container.appendChild(cell);
      }
    }

    function handleClick(r,c){
      if(gameOver||flagged[r][c]||revealed[r][c]) return;
      if(firstClick){ firstClick=false; placeMines(r,c); startTimer(); }
      if(board[r][c]===-1){ revealAll(); gameOver=true; if(faceBtn) faceBtn.textContent='😵'; clearInterval(timer); return; }
      reveal(r,c); checkWin(); render();
    }

    function reveal(r,c){
      if(r<0||r>=ROWS||c<0||c>=COLS||revealed[r][c]||flagged[r][c]) return;
      revealed[r][c]=true;
      if(board[r][c]===0) for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++) reveal(r+dr,c+dc);
    }

    function handleFlag(r,c){
      if(gameOver||revealed[r][c]) return;
      flagged[r][c]=!flagged[r][c];
      flagsLeft += flagged[r][c]?-1:1;
      if(mineCount) mineCount.textContent=String(Math.max(0,flagsLeft)).padStart(3,'0');
      render();
    }

    function revealAll(){
      for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) if(board[r][c]===-1) revealed[r][c]=true;
      render();
    }

    function checkWin(){
      let safe=0;
      for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) if(revealed[r][c]&&board[r][c]!==-1) safe++;
      if(safe===ROWS*COLS-MINES){ gameOver=true; clearInterval(timer); if(faceBtn) faceBtn.textContent='😎'; }
    }

    function startTimer(){
      timer=setInterval(()=>{ timeVal++; if(timeEl) timeEl.textContent=String(Math.min(999,timeVal)).padStart(3,'0'); },1000);
    }

    faceBtn?.addEventListener('click',()=>buildBoard());
    buildBoard();
  }

  // ── Initial state ──────────────────────────────────────────────
  hideAllWindows();
  hideOS();

  return { openApp, startBootSequence, hideOS };
}