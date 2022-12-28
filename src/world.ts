

import { Terrain } from './terrain';

import { Sky } from "three/examples/jsm/objects/Sky";
import { Water } from "three/examples/jsm/objects/Water";

import { PlayerControls } from './player-controls';
import { CameraControls } from './camera-controls';
import { Player } from './player';

import { Camera, DirectionalLight, MathUtils, Object3D, PlaneGeometry, RepeatWrapping, Scene, TextureLoader, Vector3 } from "three";
import { GUI } from "dat.gui";

export class World extends Scene {

    private player!: Player;
    private playerControls!: PlayerControls;
    private cameraControls!: CameraControls;

    constructor(camera: Camera, domElement: HTMLElement, gui: GUI) {
        super();

        const light = new DirectionalLight(0xffffff, 1);
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

        const terrain = new Terrain({
            cellSize: .5,
            resolution: 32
        }); 
        this.add(terrain);

        this.addSky(player, gui);

        this.load();
    }

    private addSky(parent: Object3D, gui: GUI) {
        const sky = new Sky();
        sky.scale.setScalar(10000);
        parent.add(sky);

        const uniforms = sky.material.uniforms;

        const skySettings = {
            turbidity: 0.1,
            rayleigh: 0.194,
            mieCoefficient: 0.003,
            mieDirectionalG: 0.975            
        };

        const sunSettings = {
            elevation: 32,
            azimuth: 180
        };

        const skyFolder = gui.addFolder('Sky');

        function onSkySettingsChanged() {
            Object.entries(skySettings).forEach(([key, value]) => uniforms[key].value = value);
        }

        function onSunSettingsChanged() {
            const phi = MathUtils.degToRad(90 - sunSettings.elevation);
            const theta = MathUtils.degToRad(sunSettings.azimuth);        
            uniforms['sunPosition'].value.setFromSphericalCoords(1, phi, theta);
        }

        onSkySettingsChanged();
        onSunSettingsChanged();

        skyFolder.add(sunSettings, 'elevation', 0, 90, 0.1).onChange(onSunSettingsChanged)
        skyFolder.add(sunSettings, 'azimuth', -180, 180, 0.1).onChange(onSunSettingsChanged)
        skyFolder.add(skySettings, 'turbidity', 0.0, 20.0, 0.1).onChange(onSkySettingsChanged);
        skyFolder.add(skySettings, 'rayleigh', 0.0, 4, 0.001).onChange(onSkySettingsChanged);
        skyFolder.add(skySettings, 'mieCoefficient', 0.0, 0.1, 0.001).onChange(onSkySettingsChanged);
        skyFolder.add(skySettings, 'mieDirectionalG', 0.0, 1, 0.001).onChange(onSkySettingsChanged);
        skyFolder.open();
    }

    private async load() {

        await new Promise(resolve => setTimeout(resolve, 1));                 

        // const waterGeometry = new PlaneGeometry(100, 100);
        // const water = new Water(
        //     waterGeometry,
        //     {
        //         textureWidth: 512,
        //         textureHeight: 512,
        //         waterNormals: new TextureLoader().load('assets/waternormals.jpg', function (texture) {

        //             texture.wrapS = texture.wrapT = RepeatWrapping;

        //         }),
        //         sunDirection: new Vector3(),
        //         sunColor: 0xffffff,
        //         waterColor: 0x001e0f,
        //         distortionScale: 3.7,
        //         fog: false
        //     }
        // );
        // water.rotation.x = - Math.PI / 2;
        // water.position.y = .3;
        // this.add( water );
        // water.material.uniforms['sunDirection'].value.copy(sun).normalize();
        
        this.dispatchEvent({ type: "ready" });
    }

    public update(deltaTime: number) {        
        this.cameraControls.update(deltaTime);
        this.playerControls.update(deltaTime);
    }
}
