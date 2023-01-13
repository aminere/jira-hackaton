
import * as THREE from 'three';
import { World } from './world';
import { GUI } from 'dat.gui';
import { Fonts } from './Fonts';

const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById('app') as HTMLCanvasElement,
});

renderer.setPixelRatio(window.devicePixelRatio);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.5;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

Fonts.preload()
  .then(() => (document.getElementById("ui") as HTMLElement).style.display = "block");
  
const camera = new THREE.PerspectiveCamera(80, 1, .1, 100);
const debugUI = new GUI();
const clock = new THREE.Clock();
debugUI.hide();

const world = new World({ camera, domElement: renderer.domElement, debugUI });

function tick() {
  const deltaTime = clock.getDelta();  
  world.update(deltaTime);
  renderer.render(world, camera);
  requestAnimationFrame(tick);
}

world.addEventListener("ready", tick);

function onResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}
onResize();
window.addEventListener('resize', onResize);
