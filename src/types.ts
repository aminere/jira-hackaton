import { GUI } from "dat.gui";
import { Camera } from "three";

export interface IContext {
    camera: Camera;
    domElement: HTMLElement;
    gui: GUI;
}
