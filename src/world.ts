
import * as THREE from "three";

import { Terrain } from './terrain';

import { Sky } from "three/examples/jsm/objects/Sky";
import { Water } from "three/examples/jsm/objects/Water";

import { PlayerControls } from './player-controls';
import { CameraControls } from './camera-controls';
import { Player } from './player';

import { GUI } from 'dat.gui';
import { Vector3 } from "three";

export class World extends THREE.Scene {

    private player!: Player;
    private playerControls!: PlayerControls;
    private cameraControls!: CameraControls;

    constructor(camera: THREE.Camera, domElement: HTMLElement) {
        super();

        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(0, 5, 0);
        this.add(light);

        const player = new Player();
        player.position.set(0, 1, 0);
        this.add(player);

        this.cameraControls = new CameraControls({ camera, target: player, domElement });
        camera.position.set(0, 2, 10);

        this.playerControls = new PlayerControls({
            target: player,
            domElement,
            getCameraForward: () => this.cameraControls.forward
        });

        this.load();
    }

    private async load() {

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
        sky.scale.setScalar(450000);
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

        const waterGeometry = new THREE.PlaneGeometry(100, 100);
        const water = new Water(
            waterGeometry,
            {
                textureWidth: 512,
                textureHeight: 512,
                waterNormals: new THREE.TextureLoader().load('assets/waternormals.jpg', function (texture) {

                    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

                }),
                sunDirection: new THREE.Vector3(),
                sunColor: 0xffffff,
                waterColor: 0x001e0f,
                distortionScale: 3.7,
                fog: false
            }
        );
        water.rotation.x = - Math.PI / 2;
        water.position.y = .3;
        // this.add( water );
        water.material.uniforms['sunDirection'].value.copy(sun).normalize();

        this.add(terrain);
        this.dispatchEvent({ type: "ready" });
    }

    public update(deltaTime: number) {        
        this.cameraControls.update(deltaTime);
        this.playerControls.update(deltaTime);
    }
}
