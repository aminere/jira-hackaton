import { Material, Mesh, Object3D, Vector3 } from "three";

export class Cell extends Object3D {
    public content: Object3D | null = null;
    public mesh: Mesh;
    public worldPos: Vector3;
    public coords: Vector3;
    public checked: { [key: string]: boolean; } = {};

    public static from(other: Cell) {
        return new Cell(other.mesh, other.worldPos, other.coords);
    }

    constructor(mesh: Mesh, worldPos: Vector3, coords: Vector3) {
        super();
        this.add(mesh);
        this.mesh = mesh;
        this.worldPos = worldPos;
        this.coords = coords;
    }    
}
