import { GUI } from "dat.gui";
import type { Camera, Object3D, Vector3 } from "three";

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

export interface ITask {
    id: string;
    key: string;
    summary: string;
    status: string;

    type: string; 
    coords: Vector3;
}
