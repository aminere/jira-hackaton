

import { Terrain } from './terrain';

import { Sky } from "three/examples/jsm/objects/Sky";

import { CameraControls } from './camera-controls';
import { Player } from './player';

import { DirectionalLight, MathUtils, Mesh, MeshPhongMaterial, MeshStandardMaterial, Object3D, PlaneGeometry, Scene, SphereGeometry, Vector3 } from "three";
import { GUI } from "dat.gui";

import { IContext } from './types';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { SeedTree } from './seed-tree';

export class World extends Scene {

    private player!: Player;
    private cameraControls!: CameraControls;

    constructor(context: IContext) {
        super();

        const radius = 20;

        this.player = new Player({
            context,
            position: new Vector3(0, radius, 0),
            resetCameraYaw: (a: Vector3, b: Vector3, c: Vector3) => this.cameraControls.resetYaw(a, b, c)
        });
        this.add(this.player);
        
        const light = new DirectionalLight(0xffffff, 1);        
        light.castShadow = true;
        light.shadow.mapSize.width = 512; // default
        light.shadow.mapSize.height = 512; // default
        light.shadow.camera.near = 0.5; // default
        light.shadow.camera.far = 50; // default
        const shadowRange = 20;        
        light.shadow.camera.left = -shadowRange;
        light.shadow.camera.right = shadowRange;
        light.shadow.camera.top = shadowRange;
        light.shadow.camera.bottom = -shadowRange;
        // light.target.position.set(0, radius, 0);
        // light.position.set(0, radius + 10, 0);
        // this.add(light);
        // this.add(light.target);
        light.target.position.set(0, 0, 0);
        light.position.set(0, 10, 0);
        this.player.root.add(light);
        this.player.root.add(light.target);

        this.cameraControls = new CameraControls({ context, target: this.player });
        
        // context.camera.position.set(2, 5, -10);
        // const orbit = new OrbitControls(context.camera, context.domElement);
        // orbit.enabled = false;        

        const terrain = new Terrain({ radius });
        terrain.receiveShadow = true;
        this.add(terrain);

        this.addSky(this.player, context.gui);

        const tree = new SeedTree();
        tree.position.set(0, radius, 0);
        tree.castShadow = true;
        this.add(tree);

        const sphere = new Mesh(new SphereGeometry(0.5), new MeshStandardMaterial({ color: 0xff0000 }));
        sphere.position.set(0, radius + 4, 0);
        sphere.castShadow = true;
        // this.add(sphere);

        const plane = new Mesh(new PlaneGeometry(6, 6), new MeshPhongMaterial({ color: 0xffffff }));
        plane.position.set(0, radius, 0);
        plane.rotateX(-Math.PI / 2);
        plane.receiveShadow = true;
        plane.traverse(c => c.receiveShadow = true);
        // this.add(plane);

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
        // skyFolder.open();
    }

    private async load() {
        await new Promise(resolve => setTimeout(resolve, 1));        
        

        this.dispatchEvent({ type: "ready" });
    }

    public update(deltaTime: number) {
        this.cameraControls.update(deltaTime);
        this.player.update(deltaTime);
    }
}
