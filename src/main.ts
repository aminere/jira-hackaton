
import * as THREE from 'three';
import { Planet } from './planet';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById('app') as HTMLCanvasElement,
});

const width = window.innerWidth;
const height = window.innerHeight;
renderer.setSize(width, height);

renderer.setPixelRatio(window.devicePixelRatio);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.5;

const camera = new THREE.PerspectiveCamera(60, width / height, .1, 100 );
camera.position.set(0, 2, -5);

const controls = new OrbitControls( camera, renderer.domElement );

const scene = new Planet();
const clock = new THREE.Clock();

function tick() {
  const deltaTime = clock.getDelta();
  
  scene.update();

  renderer.render(scene, camera);

  requestAnimationFrame(tick);
}

scene.addEventListener("ready", tick);

