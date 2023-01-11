import { CylinderGeometry, Mesh, MeshStandardMaterial, Object3D } from "three";
import { Cell } from "./cell";
import { IContext } from "./types";

export class WaterPit extends Object3D {
    private readonly context: IContext;

    public cellsPerNeighbor: Map<WaterPit, Cell[]> = new Map();

    constructor(context: IContext) {
        super();
        this.context = context;
        
        const m = new Mesh(new CylinderGeometry(1.5, 1.5, 1), new MeshStandardMaterial({ color: 0x0000ff }));
        m.position.y = .5;
        this.add(m);
    }
}
