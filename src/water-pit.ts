import { CylinderGeometry, Mesh, MeshStandardMaterial, Object3D } from "three";
import { Cell } from "./cell";
import { Loaders } from "./loaders";
import { IContext } from "./types";

export class WaterPit extends Object3D {
    private readonly context: IContext;

    public cellsPerNeighbor: Map<WaterPit, Cell[]> = new Map();

    constructor(context: IContext) {
        super();
        this.context = context;
        
        // const m = new Mesh(new CylinderGeometry(1.5, 1.5, 1), new MeshStandardMaterial({ color: 0x0000ff }));
        // m.position.y = .5;
        // this.add(m);

        this.load();
    }

    private async load() {
        const obj = await Loaders.load("assets/water-well.obj", "assets/water-well.mtl");
        obj.scale.setScalar(.6);
        obj.scale.y = 1;
        // obj.traverse(child => child.castShadow = true);
        this.add(obj);
    }
}
