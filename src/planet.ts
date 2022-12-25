
import * as THREE from 'three';

import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';
import { Terrain } from './terrain';
import { PerlinNoise } from './perlin-noise';

import { GUI } from 'dat.gui';

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

        // procedural texture
        const resolution = 64;        
        const pixels = new Uint8Array(resolution * resolution * 4);
        const stride = resolution * 4;
        for ( let y = 0; y < resolution; y ++ ) {
            for ( let x = 0; x < resolution; x ++ ) {
                const index = y * stride + x * 4;
                const noise = PerlinNoise.get2DNoise(x, y, 6);
                const color = new THREE.Color(noise, noise, noise);
                const r = Math.floor( color.r * 255 );
                const g = Math.floor( color.g * 255 );
                const b = Math.floor( color.b * 255 );
                pixels[ index ] = r;
                pixels[ index + 1] = g;
                pixels[ index + 2] = b;
                pixels[ index + 3] = 255;
            }
        }

        const texture = new THREE.DataTexture(pixels, resolution, resolution, THREE.RGBAFormat);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.needsUpdate = true;
        const geometry = new THREE.BoxGeometry( 1, 1, 1 );
        const material = new THREE.MeshBasicMaterial( {
            color: 0xffffff,
            // map: new THREE.TextureLoader().load('assets/noise.png'),
            map: texture
        } );
        const cube = new THREE.Mesh( geometry, material );
        this.add( cube );

        await new Promise(resolve => setTimeout(resolve, 1));

        const terrain = new Terrain({
            cellSize: .5,
            resolution: 32
        });

        const gui = new GUI();
        const matFolder = gui.addFolder('Material');
        matFolder.add(terrain.material, 'wireframe');
        matFolder.open();        

        this.add(terrain);
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
