// src/threejs/loadModels.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();

// ── Batch reveal: collect models, fade them all in together ───────
let totalModels  = 0;
let loadedModels = 0;
const pendingModels = [];

function onAllLoaded() {
  // Smooth fade-in over 600ms once every model is ready
  const STEPS    = 30;
  const INTERVAL = 20; // ms
  let   step     = 0;
  const timer = setInterval(() => {
    step++;
    const t = Math.min(1, step / STEPS);
    const opacity = t * t * (3 - 2 * t); // smoothstep
    pendingModels.forEach(m => {
      m.traverse(child => {
        if (child.isMesh) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach(mat => { if (mat) mat.opacity = opacity; });
        }
      });
    });
    if (step >= STEPS) {
      clearInterval(timer);
      // Remove transparency flag after fade - restores correct render order
      pendingModels.forEach(m => {
        m.traverse(child => {
          if (child.isMesh) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach(mat => { if (mat) mat.transparent = false; });
          }
        });
      });
      pendingModels.length = 0;
    }
  }, INTERVAL);
}

// External callback — set by desktopScene to notify the intro
let _onAllLoadedCb = null;
export function setOnAllLoaded(cb) { _onAllLoadedCb = cb; }

function checkAllLoaded() {
  if (loadedModels >= totalModels && pendingModels.length > 0) {
    onAllLoaded();
    _onAllLoadedCb?.();
  }
}

// ── Material fix: prevent pitch-black models ─────────────────────
function fixMaterials(model) {
  model.traverse(child => {
    if (!child.isMesh) return;
    child.castShadow    = true;
    child.receiveShadow = true;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach(m => {
      if (!m) return;
      if (m.isMeshStandardMaterial || m.isMeshPhysicalMaterial) {
        // Nudge near-black albedos so they catch scene lights
        if (m.color && m.color.r < 0.05 && m.color.g < 0.05 && m.color.b < 0.05) {
          m.color.setScalar(0.08);
        }
      }
    });
  });
}

// ── Core loader ──────────────────────────────────────────────────
function loadModel(scene, path, { x=0, y=0, z=0, sx=1, sy=1, sz=1, ry=0 } = {}) {
  totalModels++;

  loader.load(
    path,
    (gltf) => {
      const model = gltf.scene;
      model.position.set(x, y, z);
      model.scale.set(sx, sy, sz);
      model.rotation.y = ry;
      fixMaterials(model);

      // Start invisible - reveal with all others at once
      model.traverse(child => {
        if (child.isMesh) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach(mat => { if (mat) { mat.transparent = true; mat.opacity = 0; } });
        }
      });

      scene.add(model);
      pendingModels.push(model);
      loadedModels++;
      checkAllLoaded();
    },
    undefined,
    (err) => {
      console.error(`Failed to load ${path}:`, err);
      loadedModels++;
      checkAllLoaded();
    }
  );
}

export function loadDesk(scene)           { loadModel(scene, '/models/cyberroom_2.glb',                     { x:-100,  y:-690,  z:0,     sx:350,  sy:350,  sz:350               }); }
export function loadRoom(scene)           { loadModel(scene, '/models/abandoned_room_interior_style_5.glb', { x:1200,  y:-900,  z:1900,  sx:10,   sy:10,   sz:10                }); }
export function loadSofa(scene)           { loadModel(scene, '/models/sofa.glb',                            { x:-520,  y:-680,  z:1380,  sx:580,  sy:580,  sz:580,  ry:Math.PI       }); }
export function loadFloorLamp(scene)      { loadModel(scene, '/models/floor_lamp.glb',                      { x:420,   y:-400,  z:180,   sx:480,  sy:480,  sz:480,  ry:Math.PI       }); }
export function loadRetroTV(scene)        { loadModel(scene, '/models/retro_tv.glb',                        { x:3400,  y:-300,  z:-1800, sx:1260, sy:1260, sz:1260, ry:Math.PI*-0.3  }); }
export function loadPlant(scene)          { loadModel(scene, '/models/rhyzome_plant.glb',                   { x:-560,  y:-680,  z:-200,  sx:640,  sy:640,  sz:640               }); }
export function loadVendingMachine(scene) { loadModel(scene, '/models/vending_machine.glb',                 { x:950,   y:0,     z:1200,  sx:500,  sy:500,  sz:500,  ry:Math.PI*0.2   }); }
export function loadCycleKnight(scene)    { loadModel(scene, '/models/cyber_knight_super_cycle.glb',        { x:-1680, y:-510,  z:-2000, sx:290,  sy:290,  sz:290,  ry:-Math.PI*0.1  }); }
export function loadFloatingIsland(scene) { loadModel(scene, '/models/basic_floating_island.glb',           { x:3000,  y:-1500, z:-2200, sx:170,  sy:170,  sz:170,  ry:Math.PI*0.7   }); }