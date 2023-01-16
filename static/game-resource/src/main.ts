
import * as THREE from 'three';
import { World } from './world';
import { GUI } from 'dat.gui';
import { Fonts } from './Fonts';
import { Images } from './Images';
import { Utils } from './utils';

import { invoke, view } from '@forge/bridge';
import { RESOLVERS } from '../../../src/types';
import { ITask } from './types';

const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById('game') as HTMLCanvasElement,
});

renderer.setPixelRatio(window.devicePixelRatio);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.5;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

async function forgeInit() {
  console.log("forgeInit");
  const context = await view.getContext();
  const product = context.extension.type === 'macro' ? 'confluence' : context.extension.type.split(':')[0];
  console.log({ product }); 
}

async function loadIssues() {
  const rawIssues = await invoke(RESOLVERS.GET_ISSUES, { }) as any;
  /*const rawIssues = { data: { issues: [
    {
      id: "ID-0",
      key: "KEY-0",
      fields: {
        summary: "This is a test summary, if it's too long it will show ellipsis",
        status: { name: "In Progress" }
      },      
      coords: Utils.vec3.zero,
      type: "tree"
    },
    {
      id: "ID-1",
      key: "KEY-1",
      fields: {
        summary: "This is a test summary, if it's too long it will show ellipsis",
        status: { name: "In Progress" }
      },
      coords: Utils.vec3.zero,
      type: "tree"
    },
  ] } };*/
  const issues = rawIssues.data.issues.map((rawIssue: any) => {    
    return {  
      id: rawIssue.id,    
      key: rawIssue.key,
      summary: rawIssue.fields.summary,
      status: rawIssue.fields.status.name,
      coords: Utils.vec3.zero,
      type: "tree"
    } as ITask;
  }) as ITask[];

  return issues;
}

async function loadIssue(issueId: string) {
  const response = await invoke(RESOLVERS.GET_ISSUE, { issueId }) as any;
  const [rawIssue] = response.data.issues;
  return {
    id: rawIssue.id,
    key: rawIssue.key,
    summary: rawIssue.fields.summary,
    status: rawIssue.fields.status.name,
    coords: Utils.vec3.zero,
    type: "tree"
  } as ITask;
  /*console.log(issue);
  return new Promise<ITask>((resolve) => {
    setTimeout(() => {
      resolve({
        id: issueId,    
        key: "test",
        summary: "test",
        status: "test",
        coords: Utils.vec3.zero,
        type: "tree"
      } as ITask);
    }, 5000);
  });*/
}

Fonts.preload()
  .then(() => Images.preload([
    "ui/jira-logo.png",    
    "ui/jira-icon.png",
    "ui/refresh.png",
    "ui/close.svg",
    "ui/tree.svg",
    "ui/flower.svg",
  ]))
  .then(() => forgeInit())
  .then(() => (document.getElementById("ui") as HTMLElement).classList.remove("hidden"));

const camera = new THREE.PerspectiveCamera(70, 1, .1, 100);
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

world.addEventListener("loadIssues", () => {
  loadIssues()
    .then(issues => {
      world.dispatchEvent({
        type: "issuesLoaded", message: JSON.stringify(issues)
      });
    });
});

world.addEventListener("loadIssue", (event) => {
  console.log("loadIssue", event.message);
  const issueId = event.message;
  loadIssue(issueId)
    .then(issue => {
      world.dispatchEvent({
        type: "issueLoaded", message: JSON.stringify(issue)
      });
    });
});

/*
async function forgeInit() {
  console.log("forgeInit");
  const context = await view.getContext();
  const product = context.extension.type === 'macro' ? 'confluence' : context.extension.type.split(':')[0];
  console.log({ product });

  const issues = await invoke(RESOLVERS.GET_ISSUES, { });
  console.log({ issues });

  const issue = await invoke(RESOLVERS.GET_ISSUE, { issueId: "10001" });
  console.log(issue);

  // status is in issue.fields.status.name
  // "To Do"  "In Progress"
}

forgeInit();*/

