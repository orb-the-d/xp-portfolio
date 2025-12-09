// src/os-desktop/os-ui.js

const APPS = [
  'resume',
  'github',
  'linkedin',
  'projects',
  'certs',
  'contact'
];

const APP_META = {
  resume:  { label: 'CV',              icon: '/icons/cv_logo.png' },
  github:  { label: 'GitHub',          icon: '/icons/github-logo.png' },
  linkedin:{ label: 'LinkedIn',        icon: '/icons/linkedin_logo.png' },
  projects:{ label: 'Projects',        icon: '/icons/proj.png' },
  certs:   { label: 'Certs & Studies', icon: '/icons/cert.png' },
  contact: { label: 'Contact',         icon: '/icons/contact_me.png' }
};

function getWindowId(appId) {
  return `app-${appId}`;
}

export function initOS() {
  const osScreen     = document.getElementById('os-screen');
  const bootScreen   = document.getElementById('os-boot-screen');
  const loginScreen  = document.getElementById('xp-login-screen');
  const loginAccount = document.getElementById('xp-login-account');
  const appWindows   = document.querySelectorAll('.app-window');
  const desktopIcons = document.querySelectorAll('.xp-icon[data-app]');
  const closeButtons = document.querySelectorAll('.win-btn-close[data-close]');
  const minButtons   = document.querySelectorAll('.win-btn-min[data-minimize]');
  const maxButtons   = document.querySelectorAll('.win-btn-max[data-maximize]');
  const startButton  = document.getElementById('xp-start-button');
  const startMenu    = document.getElementById('xp-start-menu');
  const startApps    = document.querySelectorAll('.xp-start-app[data-app]');
  const logoffBtn    = document.querySelector('.xp-logoff');
  const shutdownBtn  = document.querySelector('.xp-shutdown');
  const taskbarArea  = document.getElementById('xp-taskbar-area');

  let isBooting = false;

  /* Taskbar */

  function clearTaskbar() {
    if (!taskbarArea) return;
    taskbarArea.innerHTML = '';
  }

  function setTaskbarApp(appId) {
    if (!taskbarArea) return;
    clearTaskbar();
    const meta = APP_META[appId];
    if (!meta) return;

    const btn = document.createElement('button');
    btn.className = 'taskbar-app';
    btn.dataset.app = appId;
    btn.setAttribute('aria-label', meta.label);

    const img = document.createElement('img');
    img.src = meta.icon;
    img.alt = '';

    const span = document.createElement('span');
    span.textContent = meta.label;

    btn.appendChild(img);
    btn.appendChild(span);

    btn.addEventListener('click', () => {
      openApp(appId);
    });

    taskbarArea.appendChild(btn);
  }

  /* Windows */

  function hideAllWindows() {
    appWindows.forEach((w) => {
      w.classList.remove('visible');
      w.style.display = 'none';
      w.dataset.state = 'normal';
    });
    clearTaskbar();
  }

  function showWindow(id) {
    const win = document.getElementById(getWindowId(id));
    if (!win) return;
    win.style.display = 'block';
    // trigger transition
    void win.offsetWidth;
    win.classList.add('visible');
    win.dataset.state = 'normal';
    win.style.inset = '20px 24px 32px 24px';
  }

  function closeWindow(id) {
    const win = document.getElementById(getWindowId(id));
    if (!win) return;
    win.classList.remove('visible');
    setTimeout(() => {
      win.style.display = 'none';
      clearTaskbar();
    }, 160);
  }

  function minimizeWindow(id) {
    const win = document.getElementById(getWindowId(id));
    if (!win) return;
    win.classList.remove('visible');
    setTimeout(() => {
      win.style.display = 'none';
    }, 160);
  }

  function maximizeOrRestoreWindow(id) {
    const win = document.getElementById(getWindowId(id));
    if (!win) return;
    const state = win.dataset.state || 'normal';

    if (state === 'normal') {
      win.style.inset = '0px 0px 0px 0px';
      win.dataset.state = 'max';
    } else {
      win.style.inset = '20px 24px 32px 24px';
      win.dataset.state = 'normal';
    }
  }

  /* Start menu */

  function closeStartMenu() {
    if (!startMenu) return;
    startMenu.classList.remove('open');
    if (startButton) {
      startButton.setAttribute('aria-expanded', 'false');
    }
  }

  function openStartMenu() {
    if (!startMenu) return;
    startMenu.classList.add('open');
    if (startButton) {
      startButton.setAttribute('aria-expanded', 'true');
    }
  }

  function toggleStartMenu() {
    if (!startMenu) return;
    if (startMenu.classList.contains('open')) {
      closeStartMenu();
    } else {
      openStartMenu();
    }
  }

  /* Desktop icon selection */

  function clearIconSelection() {
    desktopIcons.forEach((icon) => icon.classList.remove('selected'));
  }

  function selectIcon(icon) {
    clearIconSelection();
    icon.classList.add('selected');
  }

  /* App open/OS state */

  function openApp(id) {
    hideAllWindows();
    showWindow(id);
    setTaskbarApp(id);
    closeStartMenu();
  }

  function showOSInstant() {
    if (!osScreen) return;
    osScreen.style.display = 'block';
    if (bootScreen) bootScreen.style.display = 'none';
  }

  function startBootSequence() {
    if (!osScreen || isBooting) return;
    isBooting = true;
    osScreen.style.display = 'block';

    if (bootScreen) bootScreen.style.display = 'block';
    if (loginScreen) loginScreen.style.display = 'none';

    hideAllWindows();
    closeStartMenu();

    setTimeout(() => {
      if (!osScreen) return;
      if (bootScreen) bootScreen.style.display = 'none';
      if (loginScreen) loginScreen.style.display = 'block';
      isBooting = false;
    }, 1500);
  }

  function hideOS() {
    if (!osScreen) return;
    osScreen.style.display = 'none';
    isBooting = false;
    hideAllWindows();
    closeStartMenu();
    if (loginScreen) loginScreen.style.display = 'none';
  }

  function performLogoff() {
    hideAllWindows();
    closeStartMenu();
    if (loginScreen) loginScreen.style.display = 'block';
  }

  function performShutdown() {
    hideAllWindows();
    closeStartMenu();
    startBootSequence();
  }

  /* Initial state */

  hideAllWindows();
  hideOS();

  /* Login */

  if (loginAccount && loginScreen) {
    const loginAction = () => {
      loginScreen.style.display = 'none';
    };

    loginAccount.addEventListener('click', loginAction);
    loginAccount.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        loginAction();
      }
    });
  }

  /* Desktop icons */

  desktopIcons.forEach((icon) => {
    const appId = icon.dataset.app;

    icon.addEventListener('click', () => {
      selectIcon(icon);
    });

    icon.addEventListener('dblclick', () => {
      selectIcon(icon);
      openApp(appId);
    });

    icon.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        selectIcon(icon);
        openApp(appId);
      }
    });
  });

  /* Caption buttons */

  closeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.close;
      closeWindow(id);
      clearIconSelection();
    });
  });

  minButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.minimize;
      minimizeWindow(id);
    });
  });

  maxButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.maximize;
      maximizeOrRestoreWindow(id);
    });
  });

  /* Start button */

  if (startButton && startMenu) {
    startButton.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleStartMenu();
    });

    startButton.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleStartMenu();
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const firstItem = startMenu.querySelector('.xp-start-app');
        if (firstItem) firstItem.focus();
      }
    });
  }

  /* Start menu apps */

  startApps.forEach((item, index) => {
    const appId = item.dataset.app;

    item.addEventListener('click', () => {
      openApp(appId);
    });

    item.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = startApps[index + 1] || startApps[0];
        next.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = startApps[index - 1] || startApps[startApps.length - 1];
        prev.focus();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        openApp(appId);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeStartMenu();
        if (startButton) startButton.focus();
      }
    });
  });

  /* Logoff / Shutdown */

  if (shutdownBtn) {
    shutdownBtn.addEventListener('click', () => {
      performShutdown();
      clearIconSelection();
    });
  }

  if (logoffBtn && loginScreen) {
    logoffBtn.addEventListener('click', () => {
      performLogoff();
      clearIconSelection();
    });
  }

  /* Click outside closes start menu */

  document.addEventListener('click', (e) => {
    if (!startMenu) return;
    if (!startMenu.contains(e.target) && e.target !== startButton) {
      closeStartMenu();
    }
  });

  return { openApp, showOSInstant, startBootSequence, hideOS };
}
