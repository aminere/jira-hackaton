

import { Terrain } from './terrain';

import { Sky } from "three/examples/jsm/objects/Sky";

import { CameraControls } from './camera-controls';
import { Player } from './player';

import { DirectionalLight, MathUtils, Object3D, Scene, Vector3 } from "three";
import { GUI } from "dat.gui";

import { IContext, ISeed } from './types';
import { SeedTree } from './seed-tree';
import { Collision } from './collision';
import { Utils } from './utils';
import { WaterPit } from './water-pit';

export class World extends Scene {

    private player!: Player;
    private cameraControls!: CameraControls;
    private seedTrees: SeedTree[] = [];
    private context: IContext;
    private seed: ISeed | null = null;
    private waterPit: WaterPit;
    private hasWater = false;

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
        light.shadow.mapSize.width = 1024;
        light.shadow.mapSize.height = 1024;
        light.shadow.camera.near = 0.5;
        light.shadow.camera.far = 30;
        const shadowRange = 15;        
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
        tree.position.set(0, radius, 0).addScaledVector(this.player.forward, 20);
        Utils.castOnSphere(tree, radius);
        this.add(tree);
        this.seedTrees.push(tree);

        const waterPit = new WaterPit(context);
        waterPit.position.set(0, radius, 0)
            .addScaledVector(this.player.forward, 15)
            .addScaledVector(this.player.right, -10);
        Utils.castOnSphere(waterPit, radius);
        this.add(waterPit);
        this.waterPit = waterPit;

        this.load();

        context.domElement.addEventListener('click', this.onClick.bind(this));
        context.domElement.addEventListener('contextmenu', this.onRightClick.bind(this));

    }

    public dispose() {
        this.context.domElement.removeEventListener('click', this.onClick.bind(this));
        this.context.domElement.removeEventListener('contextmenu', this.onRightClick);
        this.player.dispose();
    }

    private onClick(event: MouseEvent) {
        const [screenRay] = Utils.pool.ray;
        Utils.getScreenRay(event.clientX, event.clientY, this.context, screenRay);

        const { radius } = World.config;

        const isCarryingSomething = Boolean(this.seed) || this.hasWater;

        if (!isCarryingSomething) {

            // check seeds
            for (const seedTree of this.seedTrees) {
                const seed = seedTree.rayCast(screenRay);
                if (seed) {
                    this.player.grabSeed(seed);
                    seedTree.removeSeed(seed);
                    this.seed = seed;
                    break;
                }
            }

            if (this.seed) {
                return;
            }

            // check water pit
            if (Collision.rayCastOnSphere(screenRay, this.waterPit.position, 2)) {
                this.player.grabWater(this.waterPit);
                this.hasWater = true;
                return;
            }
        } 

        const raycast = Collision.rayCastOnSphere(screenRay, Utils.vec3.zero, radius);
        if (raycast) {
            this.player.moveTo(raycast.intersection1.clone());
        }
    }
    
    private onRightClick(event: MouseEvent) {
        event.preventDefault();
        if (this.seed) {
            const { radius } = World.config;
            const [screenRay] = Utils.pool.ray;
            Utils.getScreenRay(event.clientX, event.clientY, this.context, screenRay);
            const raycast = Collision.rayCastOnSphere(screenRay, Utils.vec3.zero, radius);
            if (raycast) {
                Utils.setParent(this.seed.object, this);
                this.seed = null;
                return;
            }
        }

        this.player.jump();
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
