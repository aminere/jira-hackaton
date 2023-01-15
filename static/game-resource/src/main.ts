
import * as THREE from 'three';
import { World } from './world';
import { GUI } from 'dat.gui';
import { Fonts } from './Fonts';
import { Images } from './Images';

// import { invoke, view } from '@forge/bridge';
// import { RESOLVERS } from '../../../src/types';

const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById('game') as HTMLCanvasElement,
});

renderer.setPixelRatio(window.devicePixelRatio);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.5;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

Fonts.preload()
  .then(() => Images.preload([
    "ui/jira-logo.png",    
    "ui/jira-icon.png",
    "ui/refresh.png"
  ]))
  .then(() => (document.getElementById("ui") as HTMLElement).style.display = "flex");

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
  setTimeout(() => {
    const width = document.body.clientWidth;
    const height = document.body.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }, 10);
}

onResize();
window.addEventListener('resize', onResize);

/*async function forgeInit() {
  console.log("forgeInit");
  const context = await view.getContext();
  const product = context.extension.type === 'macro' ? 'confluence' : context.extension.type.split(':')[0];
  console.log({ context });
  console.log({ product });

  // const projects = await invoke(RESOLVERS.GET_PROJECTS, { expand: 'urls' });
  // console.log({ projects});
  // const projectIds = (projects as any).data.values.map((v: any) => v.id);
  // const projectIds = (projects as any).data.values.map((v: any) => v.id);
  // console.log({ projectIds });

  const issues = await invoke(RESOLVERS.GET_ISSUES, { });
  console.log({ issues });
  // status is in issue.fields.status.name
  // "To Do"  "In Progress"
}

forgeInit();*/

