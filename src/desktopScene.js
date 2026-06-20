// src/desktopScene.js


import { createScene } from './threejs/scene.js';
import {
  loadDesk,
  loadRoom,
  loadSofa,
  loadFloorLamp,
  //loadRetroTV,
  loadPlant,
  loadVendingMachine,
  loadCycleKnight,
  loadFloatingIsland,
  setOnAllLoaded,
} from './threejs/loadModels.js';
import { initOS } from './os-desktop/os-ui.js';
import { initOnboarding } from './onboarding.js';
import { initIntro } from './intro.js';








const {
  scene, camera, renderer, controls,
  goToOverview, goToMonitorView,
  goToBackLeftView, goToBackRightView, goToFrontRightView,
  setMonitorClickHandler, updateCamera,
  monitorPosition, overviewPosition,
} = createScene();

// ── Start intro immediately (models load behind it) ──────────────
const intro = initIntro();

// ── Load all scene objects ────────────────────────────────────────
loadDesk(scene);           // main desk + PC setup (original)
//loadRoom(scene);           // room walls / interior backdrop
loadSofa(scene);           // sofa, left of desk
loadFloorLamp(scene);      // floor lamp, behind sofa
//loadRetroTV(scene);        // retro TV on left wall
loadPlant(scene);          // rhyzome plant, right corner
loadVendingMachine(scene); // vending machine, back-right wall
loadCycleKnight(scene);    // cyber motorcycle, right foreground
loadFloatingIsland(scene); // floating island high in background

const os = initOS();
initOnboarding(); // show guided tour on first visit

// Tell loadModels to notify intro when all GLBs are done
setOnAllLoaded(() => intro.onModelsReady());

let desiredView = 'overview';
let osVisible   = false;
let bootTimeout = null;
let deskViewIdx = 0;

const navHint   = document.getElementById('nav-hint');
const hintEnter = document.getElementById('hint-enter');

function applyDeskView() {
  const views = [goToOverview, goToBackLeftView, goToBackRightView, goToFrontRightView];
  views[deskViewIdx]?.();
}

function goToMonitorAndBoot() {
  if (desiredView === 'monitor') return;
  desiredView = 'monitor';
  goToMonitorView();
  osVisible = false;
  navHint?.classList.add('hidden');
  if (bootTimeout) { clearTimeout(bootTimeout); bootTimeout = null; }
}

function goToOverviewView() {
  desiredView = 'overview';
  deskViewIdx = 0;
  applyDeskView();
  os.hideOS();
  osVisible = false;
  if (bootTimeout) { clearTimeout(bootTimeout); bootTimeout = null; }
  navHint?.classList.remove('hidden');
}

setMonitorClickHandler(() => {
  if (desiredView !== 'overview') return;
  goToMonitorAndBoot();
});

hintEnter?.addEventListener('click', goToMonitorAndBoot);

window.addEventListener('keydown', e => {
  if (e.key === 'ArrowUp')                              goToMonitorAndBoot();
  if (e.key === 'ArrowDown')                            goToOverviewView();
  if (e.key === 'Escape' && desiredView === 'monitor')  goToOverviewView();
  if (desiredView === 'overview') {
    if (e.key === 'ArrowLeft')  { deskViewIdx = (deskViewIdx + 1) % 4; applyDeskView(); }
    if (e.key === 'ArrowRight') { deskViewIdx = (deskViewIdx + 3) % 4; applyDeskView(); }
  }
});

let lastTime = performance.now();

function animate() {
  requestAnimationFrame(animate);
  const now   = performance.now();
  const delta = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  updateCamera(delta);

  if (desiredView === 'monitor') {
    const dist = camera.position.distanceTo(monitorPosition);
    if (!osVisible && dist < 5 && !bootTimeout) {
      bootTimeout = setTimeout(() => {
        os.startBootSequence();
        osVisible = true;
        bootTimeout = null;
      }, 400);
    }
  } else {
    if (osVisible && camera.position.distanceTo(overviewPosition) < 5) {
      os.hideOS();
      osVisible = false;
    }
  }

  renderer.render(scene, camera);
}

animate();