
import { Object3D, MeshBasicMaterial, Mesh, BoxGeometry } from "three";
import { PlayerControls } from "./player-controls";

export class Player extends Object3D {
    private readonly controls!: PlayerControls;

    constructor() {
        super();
        const geometry = new BoxGeometry(1, 1, 1);
        const material = new MeshBasicMaterial({ color: 0xff0000 });
        const mesh = new Mesh(geometry, material);
        this.add(mesh);
    }

    public update(deltaTime: number) {
    }
}
