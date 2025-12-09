// src/threejs/scene.js
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export function createScene() {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xAAAAAA);

  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    5000
  );

  // Center of main monitor
  const lookAtTarget = new THREE.Vector3(0, -50, 0);

  // Camera presets
  const overviewPosition   = new THREE.Vector3(-800, 500, 1000);   // front / desk
  const monitorPosition    = new THREE.Vector3(-2.6, -50, 100);    // close to monitor
  const backLeftPosition   = new THREE.Vector3(-900, 450, -800);   // back-left
  const backRightPosition  = new THREE.Vector3( 900, 450, -800);   // back-right
  const frontRightPosition = new THREE.Vector3( 900, 500, 900);    // new: front-right

  // For smooth movement
  const currentTargetPos = new THREE.Vector3().copy(overviewPosition);
  const targetPos        = new THREE.Vector3().copy(overviewPosition);

  // Start in overview
  camera.position.copy(overviewPosition);
  camera.lookAt(lookAtTarget);

  const ambient = new THREE.AmbientLight(0xffffff, 2);
  scene.add(ambient);

  const dirLight = new THREE.DirectionalLight(0xffffff, 2);
  dirLight.position.set(0, 50, 80);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(1024, 1024);
  scene.add(dirLight);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = true;
  controls.zoomSpeed = 1.2;
  controls.target.copy(lookAtTarget);
  controls.update();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  function goToOverview() {
    targetPos.copy(overviewPosition);
  }

  function goToMonitorView() {
    targetPos.copy(monitorPosition);
  }

  function goToBackLeftView() {
    targetPos.copy(backLeftPosition);
  }

  function goToBackRightView() {
    targetPos.copy(backRightPosition);
  }

  function goToFrontRightView() {
    targetPos.copy(frontRightPosition);
  }

  function updateCamera(delta) {
    const lerpAlpha = 0.08;
    currentTargetPos.lerp(targetPos, lerpAlpha);
    camera.position.copy(currentTargetPos);
    camera.lookAt(lookAtTarget);
    controls.target.copy(lookAtTarget);
    controls.update();
  }

  return {
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
    overviewPosition,
    backLeftPosition,
    backRightPosition,
    frontRightPosition
  };
}
