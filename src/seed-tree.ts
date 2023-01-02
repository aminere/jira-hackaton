
import { Object3D } from "three";

import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';

export class SeedTree extends Object3D {

    constructor() {
        super();

        this.load();
    }

    public spawnSeed() {

    }

    public update() {
        // update seeds        
    }

    private async load() {        
        const materials = await new MTLLoader().loadAsync("assets/tree_small.mtl");
        materials.preload();
        const objLoader = new OBJLoader().setMaterials(materials);
        const obj = await objLoader.loadAsync("assets/tree_small.obj") as Object3D;
        obj.scale.setScalar(5);
        obj.traverse(child => child.castShadow = true);
        this.add(obj);
    }
}

