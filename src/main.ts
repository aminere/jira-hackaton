
import * as THREE from 'three';
import { World } from './world';
import { GUI } from 'dat.gui';
import { Loaders } from './loaders';
import { UI } from './ui';

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
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

Loaders.init();
const camera = new THREE.PerspectiveCamera(80, width / height, .1, 100);
const debugUI = new GUI();
const clock = new THREE.Clock();

const world = new World({ camera, domElement: renderer.domElement, debugUI });

function tick() {
  const deltaTime = clock.getDelta();  
  world.update(deltaTime);
  renderer.render(world, camera);
  requestAnimationFrame(tick);
}

world.addEventListener("ready", tick);

