// src/threejs/scene.js
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export function createScene() {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
  renderer.toneMapping       = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  // ── FIX: deep navy instead of near-black so models don't look dark ──
  scene.background = new THREE.Color(0x1a2a4a);
  renderer.setClearColor(0x1a2a4a, 1);
  scene.fog = new THREE.Fog(0x1a2a4a, 2500, 6000);

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 6000);
  const lookAtTarget      = new THREE.Vector3(0, -31, 0);
  const overviewPosition   = new THREE.Vector3(-400, 180, 720);
  const monitorPosition    = new THREE.Vector3(-2.6, -30, 85);
  const backLeftPosition   = new THREE.Vector3(-900, 450, -800);
  const backRightPosition  = new THREE.Vector3( 900, 450, -800);
  const frontRightPosition = new THREE.Vector3( 900, 500,  900);

  const currentTargetPos = new THREE.Vector3().copy(overviewPosition);
  const targetPos        = new THREE.Vector3().copy(overviewPosition);
  camera.position.copy(overviewPosition);
  camera.lookAt(lookAtTarget);

  // ── FIX: boosted lighting so all models render with proper colour ──
  scene.add(new THREE.AmbientLight(0xc8d8ff, 2.2));   // strong sky-blue fill

  const keyLight = new THREE.DirectionalLight(0xfff4e0, 3.5);
  keyLight.position.set(200, 600, 500);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.far = 3000;
  scene.add(keyLight);

  // Second key from opposite side — no fully-black shadow faces
  const keyLight2 = new THREE.DirectionalLight(0xe0f0ff, 2.2);
  keyLight2.position.set(-300, 400, 400);
  scene.add(keyLight2);

  const fillLight = new THREE.DirectionalLight(0x6688ff, 1.4);
  fillLight.position.set(-400, 200, -300);
  scene.add(fillLight);

  // Rim light — separates models from background
  const rimLight = new THREE.DirectionalLight(0xffffff, 1.0);
  rimLight.position.set(0, 300, -800);
  scene.add(rimLight);

  // Warm desk glow
  const deskGlow = new THREE.PointLight(0xffaa44, 2.0, 1200);
  deskGlow.position.set(100, -300, 300);
  scene.add(deskGlow);

  // Cool floor bounce
  const floorBounce = new THREE.PointLight(0x4488ff, 1.8, 2000);
  floorBounce.position.set(0, -600, 100);
  scene.add(floorBounce);

  // Wide fill coverage
  const wideLeft  = new THREE.PointLight(0xaaccff, 1.2, 3500);
  wideLeft.position.set(-2000, 800, 500);
  scene.add(wideLeft);

  const wideRight = new THREE.PointLight(0xffeedd, 1.2, 3500);
  wideRight.position.set(2000, 800, 500);
  scene.add(wideRight);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom    = true;
  controls.zoomSpeed     = 1.2;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.copy(lookAtTarget);
  controls.update();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Monitor click hitbox
  const hitGeo = new THREE.PlaneGeometry(200, 140);
  const hitMat = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide });
  const monitorHitbox = new THREE.Mesh(hitGeo, hitMat);
  monitorHitbox.position.set(-2.6, -50, 5);
  monitorHitbox.name = 'monitor-hitbox';
  scene.add(monitorHitbox);

  const raycaster = new THREE.Raycaster();
  const mouse     = new THREE.Vector2();
  let onMonitorClick = null;

  renderer.domElement.addEventListener('click', e => {
    mouse.x =  (e.clientX / window.innerWidth)  * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    if (raycaster.intersectObject(monitorHitbox).length > 0 && onMonitorClick) onMonitorClick();
  });

  renderer.domElement.addEventListener('mousemove', e => {
    mouse.x =  (e.clientX / window.innerWidth)  * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    renderer.domElement.style.cursor =
      raycaster.intersectObject(monitorHitbox).length > 0 ? 'pointer' : 'default';
  });

  function setMonitorClickHandler(fn) { onMonitorClick = fn; }
  function goToOverview()       { targetPos.copy(overviewPosition);    }
  function goToMonitorView()    { targetPos.copy(monitorPosition);     }
  function goToBackLeftView()   { targetPos.copy(backLeftPosition);    }
  function goToBackRightView()  { targetPos.copy(backRightPosition);   }
  function goToFrontRightView() { targetPos.copy(frontRightPosition);  }

  function updateCamera(delta) {
    const alpha = 1 - Math.pow(0.004, delta);
    currentTargetPos.lerp(targetPos, alpha);
    camera.position.copy(currentTargetPos);
    camera.lookAt(lookAtTarget);
    controls.target.copy(lookAtTarget);
    controls.update();
  }

  return {
    scene, camera, renderer, controls,
    goToOverview, goToMonitorView, goToBackLeftView, goToBackRightView, goToFrontRightView,
    setMonitorClickHandler, updateCamera,
    monitorPosition, overviewPosition,
  };
}