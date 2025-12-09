// src/threejs/loadModels.js
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export function loadDesk(scene) {
  const loader = new GLTFLoader();

  loader.load(
    '/models/cyberroom_2.glb',
    (gltf) => {
      gltf.scene.scale.set(350, 350, 350);
      gltf.scene.position.set(-100, -690, 0);

      gltf.scene.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      scene.add(gltf.scene);
    },
    undefined,
    (err) => {
      console.error('Desk GLB load error:', err);
    }
  );
}
