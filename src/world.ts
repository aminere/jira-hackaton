

import { Terrain } from './terrain';

import { Sky } from "three/examples/jsm/objects/Sky";

import { CameraControls } from './camera-controls';
import { Player } from './player';

import { DirectionalLight, MathUtils, Object3D, Ray, Scene, Vector3 } from "three";
import { GUI } from "dat.gui";

import { IContext } from './types';
import { SeedTree } from './seed-tree';
import { Collision } from './collision';

export class World extends Scene {

    private player!: Player;
    private cameraControls!: CameraControls;
    private seedTrees: SeedTree[] = [];
    private context: IContext;

    private static config = {
        radius: 20
    };

    constructor(context: IContext) {
        super();
        this.context = context;

        const { radius } = World.config;
        this.player = new Player({
            context,
            position: new Vector3(0, radius, 0),
            resetCameraYaw: (a: Vector3, b: Vector3, c: Vector3) => this.cameraControls.resetYaw(a, b, c)
        });
        this.add(this.player);
        
        const light = new DirectionalLight(0xffffff, 1);        
        light.castShadow = true;
        light.shadow.mapSize.width = 512;
        light.shadow.mapSize.height = 512;
        light.shadow.camera.near = 0.5;
        light.shadow.camera.far = 50;
        const shadowRange = 20;        
        light.shadow.camera.left = -shadowRange;
        light.shadow.camera.right = shadowRange;
        light.shadow.camera.top = shadowRange;
        light.shadow.camera.bottom = -shadowRange;
        light.target.position.set(0, 0, 0);
        light.position.set(0, 10, 0);
        this.player.root.add(light);
        this.player.root.add(light.target);

        this.cameraControls = new CameraControls({ context, target: this.player });
        
        const terrain = new Terrain({ radius });
        terrain.receiveShadow = true;
        this.add(terrain);

        this.addSky(this.player, context.gui);

        const tree = new SeedTree(context);
        tree.position.set(0, radius, 0);
        this.add(tree);
        this.seedTrees.push(tree);

        this.load();

        context.domElement.addEventListener('click', this.onClick.bind(this));
    }

    public dispose() {
        this.context.domElement.removeEventListener('click', this.onClick.bind(this));
        this.player.dispose();
    }

    private onClick(event: MouseEvent) {
        const rayOrigin = new Vector3().setFromMatrixPosition(this.context.camera.matrixWorld);
        const screenRay = new Ray(
            rayOrigin,
            new Vector3(
                (event.clientX / window.innerWidth) * 2 - 1,
                -(event.clientY / window.innerHeight) * 2 + 1,
                0
            ).unproject(this.context.camera).sub(rayOrigin).normalize()
        );

        const { radius } = World.config;

        let collision = false;

        // check seeds
        for (const seedTree of this.seedTrees) {
            const seed = seedTree.rayCast(screenRay);
            if (seed) {
                console.log(seed.jiraTaskId);
                collision = true;
                this.player.grab(seed);
                break;
            }
        }

        if (collision) {
            return;
        }

        const raycast = Collision.rayCastOnSphere(screenRay, new Vector3(), radius);
        if (raycast) {
            this.player.moveTo(raycast.intersection1.clone());
        }
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
    }

    private async load() {
        await new Promise(resolve => setTimeout(resolve, 1));       
        // TODO async load
        this.dispatchEvent({ type: "ready" });
    }

    public update(deltaTime: number) {
        this.cameraControls.update(deltaTime);
        this.player.update(deltaTime);
        this.seedTrees.forEach(t => t.update(deltaTime));
    }
}
