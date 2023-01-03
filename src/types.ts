import { GUI } from "dat.gui";
import type { Camera, Object3D } from "three";

export interface IContext {
    camera: Camera;
    domElement: HTMLElement;
    gui: GUI;
}

export interface ISeed {
    angle: number;
    object: Object3D;
    jiraTaskId: string;
}
