
import { Object3D, MeshBasicMaterial, Mesh, BoxGeometry, SphereGeometry } from "three";
import { PlayerControls } from "./player-controls";

export class Player extends Object3D {
    private readonly controls!: PlayerControls;

    constructor() {
        super();
        const geometry = new BoxGeometry(1, 1, 1);
        const material = new MeshBasicMaterial({ color: 0xff0000 });
        const mesh = new Mesh(geometry, material);
        mesh.scale.z = 2;
        
        const head = new SphereGeometry(1);
        const headMaterial = new MeshBasicMaterial({ color: 0x00ff00 });
        const headMesh = new Mesh(head, headMaterial);
        headMesh.position.z = -1;

        this.add(mesh);
        this.add(headMesh);
    }

    public update(deltaTime: number) {
    }
}
