import { Mesh, Object3D, Vector3 } from "three";

export class Cell extends Object3D {
    public content: Object3D | null = null;
    public mesh: Mesh;
    public worldPos: Vector3;

    constructor(mesh: Mesh, worldPos: Vector3) {
        super();
        this.add(mesh);
        this.mesh = mesh;
        this.worldPos = worldPos;
    }
}
