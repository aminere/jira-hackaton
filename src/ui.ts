import { Object3D, Vector3 } from "three";
import { IContext } from "./types";
import { Utils } from "./utils";

interface IMarker {
    target: Object3D;
    name: string;
}

export class UI {

    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private context: IContext;

    private markers: IMarker[] = [];

    constructor(canvas: HTMLCanvasElement, context: IContext) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
        this.ctx.font = "30px arial";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.strokeStyle = "black";
        this.ctx.fillStyle = "white";
        this.context = context;
    }


    public addMarker(target: Object3D, name: string) {
        this.markers.push({ target, name });
    }

    public update(deltaTime: number) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const [worldPos] = Utils.pool.vec3;
        for (const marker of this.markers) {
            const screenPos = new Vector3();
            Utils.getScreenPosition(marker.target.getWorldPosition(worldPos), this.context, screenPos);
            this.ctx.lineWidth = 3;
            this.ctx.strokeText(marker.name, screenPos.x, screenPos.y);
            this.ctx.fillText(marker.name, screenPos.x, screenPos.y);
        }
    }
}

