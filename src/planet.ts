
import * as THREE from 'three';

import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';
import { _SRGBAFormat } from 'three';

export class Planet extends THREE.Scene {

    private readonly objLoader = new OBJLoader();
    private readonly mtlLoader = new MTLLoader();

    private obj!: THREE.Object3D;

    constructor() {
        super();

        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(0, 4, 2);
        this.add(light);

        this.init();
    }

    private async init() {
        const mtl = await this.mtlLoader.loadAsync('assets/tree_small.mtl');
        mtl.preload();

        this.obj = await this.createObject(mtl);
        this.obj.position.set(-1, 1, 0);

        const obj2 = await this.createObject(mtl);
        obj2.position.set(1, -1, 0);

        this.add(this.obj);

        const geometry = new THREE.BufferGeometry()
        const vertices = new Float32Array([
            0, 0, 0,
            1, 0, 0,            
            0, 1, 0,
        ]);

        const normals = new Float32Array([
            0, 0, 1,
            0, 0, 1,
            0, 0, 1,
        ]);

        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
        const material = new THREE.MeshPhongMaterial({ color: 0xff0000 });
        const mesh = new THREE.Mesh(geometry, material);

        this.add(mesh);

        this.dispatchEvent({ type: "ready" });
    }

    private async createObject(material: MTLLoader.MaterialCreator) {
        this.objLoader.setMaterials(material);
        return this.objLoader.loadAsync('assets/tree_small.obj');
    }

    public update() {
        this.obj.rotateY(1);
    }
}
