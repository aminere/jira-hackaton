
import * as THREE from 'three';
import { World } from './world';

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

const world = new World(camera, renderer.domElement);
const clock = new THREE.Clock();

function tick() {
  const deltaTime = clock.getDelta();
  
  world.update(deltaTime);

  renderer.render(world, camera);

  requestAnimationFrame(tick);
}

world.addEventListener("ready", tick);

