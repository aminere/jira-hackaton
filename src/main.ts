
import * as THREE from 'three';
import { Planet } from './planet';
import CameraControls from 'camera-controls';

const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById('app') as HTMLCanvasElement,
});

const width = window.innerWidth;
const height = window.innerHeight;
renderer.setSize(width, height);

const camera = new THREE.PerspectiveCamera(60, width / height, .1, 500);
camera.position.set(0, 2, -5);

CameraControls.install({ THREE: THREE });
const cameraControls = new CameraControls( camera, renderer.domElement );
const scene = new Planet();
const clock = new THREE.Clock();

function tick() {
  const deltaTime = clock.getDelta();
  cameraControls.update(deltaTime);
  scene.update();

  renderer.render(scene, camera);

  requestAnimationFrame(tick);
}

scene.addEventListener("ready", tick);

