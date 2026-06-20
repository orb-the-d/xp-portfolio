// src/threejs/loadModels.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// ── Loader setup ──────────────────────────────────────────────────
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);

// ── Google Drive CDN URLs ─────────────────────────────────────────
// confirm=t bypasses the virus-scan redirect for large files
function gdrive(id) {
  return `https://drive.google.com/uc?export=download&confirm=t&id=${id}`;
}

const MODELS = {
  cyberroom:    gdrive('1yY7okBhoqDOWqH8VFJxS1pBuW5W-uN1W'),
  cycle_knight: gdrive('1g2u6EBiPrQPZay_JAJ6uPkaSm5M3X6P9'),
  sofa:         gdrive('1rsMyM2pphUMKUkiQlnKeefbdmi0RAkPX'),
  island:       gdrive('1qjROxoX1bruKLVwEC2rzATEPFp5PHlY0'),
  plant:        gdrive('1Xr5rh3ib8LWswMu8WwJDxkVocriqwlrH'),
  vending:      gdrive('1PrSTIYp8NvqwXgfQi2u9kkGFMfKzJwuu'),
  floor_lamp:   gdrive('1GisE9-xnt3_lIrQH-kq4RkCqziipgc47'),
};

// ── Loading progress tracker ──────────────────────────────────────
let totalModels  = 0;
let loadedModels = 0;
const pendingModels = [];

function updateLoadingBar() {
  const bar  = document.getElementById('loading-bar-fill');
  const pct  = document.getElementById('loading-percent');
  const wrap = document.getElementById('loading-overlay');
  if (!bar) return;
  const progress = totalModels > 0 ? loadedModels / totalModels : 0;
  bar.style.width = (progress * 100).toFixed(0) + '%';
  if (pct) pct.textContent = (progress * 100).toFixed(0) + '%';

  if (progress >= 1 && pendingModels.length > 0) {
    revealAll();
    if (wrap) {
      wrap.style.opacity = '0';
      setTimeout(() => { wrap.style.display = 'none'; }, 600);
    }
  }
}

function revealAll() {
  const FADE_MS = 800, STEPS = 40;
  let step = 0;
  const timer = setInterval(() => {
    step++;
    const t = step / STEPS;
    const opacity = Math.min(1, t * t * (3 - 2 * t));
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
      pendingModels.forEach(m => {
        m.traverse(child => {
          if (child.isMesh) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach(mat => {
              if (mat && mat.opacity >= 1) mat.transparent = false;
            });
          }
        });
      });
      pendingModels.length = 0;
    }
  }, FADE_MS / STEPS);
}

// ── Material fix: prevent pitch-black models ──────────────────────
function fixMaterials(model) {
  model.traverse(child => {
    if (!child.isMesh) return;
    child.castShadow    = true;
    child.receiveShadow = true;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach(m => {
      if (!m) return;
      // Convert MeshBasicMaterial → MeshStandardMaterial so it reacts to lights
      if (m.isMeshBasicMaterial) {
        child.material = new THREE.MeshStandardMaterial({
          color:     m.color,
          map:       m.map,
          roughness: 0.8,
          metalness: 0.1,
        });
        return;
      }
      if (m.isMeshStandardMaterial || m.isMeshPhysicalMaterial) {
        m.envMapIntensity = 0.6;
        // Lift near-black colors so they're visible under lighting
        if (m.color && m.color.r < 0.05 && m.color.g < 0.05 && m.color.b < 0.05) {
          m.color.setScalar(0.08);
        }
      }
    });
  });
}

// ── Core loader ───────────────────────────────────────────────────
function loadModel(scene, url, { x=0, y=0, z=0, sx=1, sy=1, sz=1, ry=0 } = {}) {
  totalModels++;
  updateLoadingBar();

  loader.load(
    url,
    (gltf) => {
      const model = gltf.scene;
      model.position.set(x, y, z);
      model.scale.set(sx, sy, sz);
      model.rotation.y = ry;
      fixMaterials(model);

      // Start invisible — fade in with all others once everything is loaded
      model.traverse(child => {
        if (child.isMesh) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach(mat => { if (mat) { mat.transparent = true; mat.opacity = 0; } });
        }
      });

      scene.add(model);
      pendingModels.push(model);
      loadedModels++;
      updateLoadingBar();
    },
    undefined,
    (err) => {
      console.error(`Failed to load: ${url}`, err);
      loadedModels++;   // still count it so progress bar completes
      updateLoadingBar();
    }
  );
}

// ── Exports ───────────────────────────────────────────────────────
export function loadDesk(scene) {
  loadModel(scene, MODELS.cyberroom, {
    x: -100, y: -690, z: 0,
    sx: 350, sy: 350, sz: 350,
  });
}

export function loadSofa(scene) {
  loadModel(scene, MODELS.sofa, {
    x: -520, y: -680, z: 1380,
    sx: 580, sy: 580, sz: 580,
    ry: Math.PI * 1.0,
  });
}

export function loadFloorLamp(scene) {
  loadModel(scene, MODELS.floor_lamp, {
    x: 420, y: -400, z: 180,
    sx: 480, sy: 480, sz: 480,
    ry: Math.PI * 1.0,
  });
}



export function loadPlant(scene) {
  loadModel(scene, MODELS.plant, {
    x: -560, y: -680, z: -200,
    sx: 640, sy: 640, sz: 640,
  });
}

export function loadVendingMachine(scene) {
  loadModel(scene, MODELS.vending, {
    x: 950, y: 0, z: 1200,
    sx: 500, sy: 500, sz: 500,
    ry: Math.PI * 0.2,
  });
}

export function loadFloatingIsland(scene) {
  loadModel(scene, MODELS.island, {
    x: 3000, y: -1500, z: -2200,
    sx: 170, sy: 170, sz: 170,
    ry: Math.PI * 0.7,
  });
}


export function loadCycleKnight(scene) {
  loadModel(scene, MODELS.cycle_knight, {
    x: -1680, y: -510, z: -2000,
    sx: 290, sy: 290, sz: 290,
    ry: -Math.PI * 0.1,
  });
}