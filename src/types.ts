import { GUI } from "dat.gui";
import type { Camera, Object3D } from "three";
import type { UI } from "./ui";

export interface IContext {
    camera: Camera;
    domElement: HTMLElement;
    debugUI: GUI;
}

export interface ISeed {
    angle: number;
    object: Object3D;
    jiraTaskId: string;
}
