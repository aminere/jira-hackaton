
import * as THREE from 'three';

import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';
import { Terrain } from './terrain';
import { PerlinNoise } from './perlin-noise';

import { Sky } from "three/examples/jsm/objects/Sky";
import { Water } from "three/examples/jsm/objects/Water";

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
        // const resolution = 64;        
        // const pixels = new Uint8Array(resolution * resolution * 4);
        // const stride = resolution * 4;
        // for ( let y = 0; y < resolution; y ++ ) {
        //     for ( let x = 0; x < resolution; x ++ ) {
        //         const index = y * stride + x * 4;
        //         const noise = PerlinNoise.get2DNoise(x, y, 6);
        //         const color = new THREE.Color(noise, noise, noise);
        //         const r = Math.floor( color.r * 255 );
        //         const g = Math.floor( color.g * 255 );
        //         const b = Math.floor( color.b * 255 );
        //         pixels[ index ] = r;
        //         pixels[ index + 1] = g;
        //         pixels[ index + 2] = b;
        //         pixels[ index + 3] = 255;
        //     }
        // }
        // const texture = new THREE.DataTexture(pixels, resolution, resolution, THREE.RGBAFormat);
        // texture.minFilter = THREE.LinearFilter;
        // texture.magFilter = THREE.LinearFilter;
        // texture.needsUpdate = true;
        // const geometry = new THREE.BoxGeometry( 1, 1, 1 );
        // const material = new THREE.MeshBasicMaterial( {
        //     color: 0xffffff,
        //     // map: new THREE.TextureLoader().load('assets/noise.png'),
        //     map: texture
        // } );
        // const cube = new THREE.Mesh( geometry, material );
        // this.add( cube );

        // const waterGeometry = new THREE.PlaneGeometry(16, 16);        
        // const water = new THREE.Mesh(
        //     waterGeometry,
        //     new THREE.MeshBasicMaterial({
        //         color: 0xffffff
        //     })
        // );
        // this.add(water);
        // water.rotateX(-Math.PI / 2);
        // water.position.y = .3;

        await new Promise(resolve => setTimeout(resolve, 1));

        const terrain = new Terrain({
            cellSize: .5,
            resolution: 32
        });

        const gui = new GUI();
        const matFolder = gui.addFolder('Material');
        matFolder.add(terrain.material, 'wireframe');
        matFolder.open();     
        
        const sky = new Sky();
		sky.scale.setScalar( 450000 );
        this.add(sky);
        const effectController = {
            turbidity: 10,
            rayleigh: 3,
            mieCoefficient: 0.005,
            mieDirectionalG: 0.7,
            elevation: 90,
            azimuth: 180,
            exposure: 0.5
        };
        const uniforms = sky.material.uniforms;
        // uniforms['turbidity'].value = effectController.turbidity;
        // uniforms['rayleigh'].value = effectController.rayleigh;
        // uniforms['mieCoefficient'].value = effectController.mieCoefficient;
        // uniforms['mieDirectionalG'].value = effectController.mieDirectionalG;
        // const phi = THREE.MathUtils.degToRad(90 - effectController.elevation);
        // const theta = THREE.MathUtils.degToRad(effectController.azimuth);
        const sun = new THREE.Vector3();
        sun.setFromSphericalCoords(1, Math.PI / 3, 0);
        uniforms['sunPosition'].value.copy(sun);

        const waterGeometry = new THREE.PlaneGeometry( 100, 100 );
        const water = new Water(
            waterGeometry,
            {
                textureWidth: 512,
                textureHeight: 512,
                waterNormals: new THREE.TextureLoader().load( 'assets/waternormals.jpg', function ( texture ) {

                    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

                } ),
                sunDirection: new THREE.Vector3(),
                sunColor: 0xffffff,
                waterColor: 0x001e0f,
                distortionScale: 3.7,
                fog: false
            }
        );
        water.rotation.x = - Math.PI / 2;
        water.position.y = .3;
        this.add( water );
        water.material.uniforms[ 'sunDirection' ].value.copy( sun ).normalize();

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
