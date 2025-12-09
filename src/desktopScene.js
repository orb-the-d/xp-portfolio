// src/desktopScene.js
import { createScene } from './threejs/scene.js';
import { loadDesk } from './threejs/loadModels.js';
import { initOS } from './os-desktop/os-ui.js';

const {
  scene,
  camera,
  renderer,
  controls,
  goToOverview,
  goToMonitorView,
  goToBackLeftView,
  goToBackRightView,
  goToFrontRightView,
  updateCamera,
  monitorPosition,
  overviewPosition
} = createScene();

loadDesk(scene);

const os = initOS(); // { openApp, showOSInstant, startBootSequence, hideOS }

let desiredView = 'overview'; // 'overview' | 'monitor'
let osVisible   = false;
let bootTimeout = null;

// 0 = front, 1 = back-left, 2 = back-right, 3 = front-right
let deskViewIndex = 0;

function applyDeskView() {
  switch (deskViewIndex) {
    case 0:
      goToOverview();
      break;
    case 1:
      goToBackLeftView();
      break;
    case 2:
      goToBackRightView();
      break;
    case 3:
      goToFrontRightView();
      break;
  }
}

// go to monitor + boot (used ONLY by keyboard ↑ now)
function goToMonitorAndBoot() {
  desiredView = 'monitor';
  goToMonitorView();
  osVisible = false;
  if (bootTimeout) {
    clearTimeout(bootTimeout);
    bootTimeout = null;
  }
}

window.addEventListener('keydown', (e) => {
  // UP ARROW: go to monitor + boot
  if (e.key === 'ArrowUp') {
    goToMonitorAndBoot();
  }

  // DOWN ARROW: back to front desk view
  if (e.key === 'ArrowDown') {
    desiredView = 'overview';
    deskViewIndex = 0;
    applyDeskView();
    os.hideOS();
    osVisible = false;
    if (bootTimeout) {
      clearTimeout(bootTimeout);
      bootTimeout = null;
    }
  }

  // Left/right arrows: cycle desk views when in overview mode
  if (desiredView === 'overview') {
    if (e.key === 'ArrowLeft') {
      // front -> back-left -> back-right -> front-right -> front
      if (deskViewIndex === 0) deskViewIndex = 1;
      else if (deskViewIndex === 1) deskViewIndex = 2;
      else if (deskViewIndex === 2) deskViewIndex = 3;
      else if (deskViewIndex === 3) deskViewIndex = 0;
      applyDeskView();
    }

    if (e.key === 'ArrowRight') {
      // reverse: front -> front-right -> back-right -> back-left -> front
      if (deskViewIndex === 0) deskViewIndex = 3;
      else if (deskViewIndex === 3) deskViewIndex = 2;
      else if (deskViewIndex === 2) deskViewIndex = 1;
      else if (deskViewIndex === 1) deskViewIndex = 0;
      applyDeskView();
    }
  }
});

// IMPORTANT: remove Start button boot behavior
// Leave os-ui.js to handle Start click only for opening the Start menu.
// So we no longer add any click listener here for #xp-start-button.

let lastTime = performance.now();

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const delta = (now - lastTime) / 1000;
  lastTime = now;

  updateCamera(delta);

  if (desiredView === 'monitor') {
    const dist = camera.position.distanceTo(monitorPosition);
    if (!osVisible && dist < 5 && !bootTimeout) {
      bootTimeout = setTimeout(() => {
        os.startBootSequence();
        osVisible = true;
        bootTimeout = null;
      }, 500);
    }
  } else {
    const dist = camera.position.distanceTo(overviewPosition);
    if (osVisible && dist < 5) {
      os.hideOS();
      osVisible = false;
    }
  }

  controls.update();
  renderer.render(scene, camera);
}
animate();
