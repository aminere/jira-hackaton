
import * as THREE from 'three';

import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';
import { Terrain } from './terrain';

export class Planet extends THREE.Scene {

    private readonly objLoader = new OBJLoader();
    private readonly mtlLoader = new MTLLoader();

    private obj!: THREE.Object3D;

    constructor() {
        super();

        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(0, 5, 0);
        this.add(light);

        this.load();
    }

    private async load() {
        // const mtl = await this.mtlLoader.loadAsync('assets/tree_small.mtl');
        // mtl.preload();
        // this.obj = await this.createObject(mtl);
        // this.obj.position.set(-1, 1, 0);
        // const obj2 = await this.createObject(mtl);
        // obj2.position.set(1, -1, 0);
        // this.add(this.obj);
        // this.add(obj2);
        await new Promise(resolve => setTimeout(resolve, 1));
        this.add(new Terrain({
            cellSize: 1,
            resolution: 50
        }));
        this.dispatchEvent({ type: "ready" });
    }

    private async createObject(material: MTLLoader.MaterialCreator) {
        this.objLoader.setMaterials(material);
        return this.objLoader.loadAsync('assets/tree_small.obj');
    }

    public update() {
        // this.obj.rotateY(1);
    }
}
