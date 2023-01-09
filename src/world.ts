

import { Terrain } from './terrain';

import { Sky } from "three/examples/jsm/objects/Sky";

import { CameraControls } from './camera-controls';
import { Player } from './player';

import { DirectionalLight, Line3, MathUtils, Mesh, MeshStandardMaterial, Object3D, Plane, Scene, SphereGeometry, Vector3 } from "three";
import { GUI } from "dat.gui";

import { IContext, ISeed } from './types';
import { SeedTree } from './seed-tree';
import { Collision } from './collision';
import { Utils } from './utils';
import { WaterPit } from './water-pit';
import { UI } from './ui';

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

export class World extends Scene {

    private player!: Player;
    private cameraControls!: CameraControls;
    private seedTrees: SeedTree[] = [];
    private context: IContext;
    private seed: ISeed | null = null;
    private waterPit: WaterPit;
    private hasWater = false;
    private ui: UI;
    private terrain: Terrain;

    private static config = {
        radius: 20,
        cellResolution: 16,
    };

    constructor(context: IContext) {
        super();
        this.context = context;

        const { radius, cellResolution } = World.config;
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

        // const light2 = new DirectionalLight(0xffffff, 1); 
        // light2.position.set(-radius, -radius, -radius);
        // this.add(light2);

        if (true) {
            this.cameraControls = new CameraControls({ context, target: this.player });
        } else {
            context.camera.position.set(0, radius + 10, -5);
            new OrbitControls(context.camera, context.domElement);
        }

        const terrain = new Terrain({ radius, cellResolution });
        terrain.receiveShadow = true;
        this.add(terrain);
        this.terrain = terrain;

        this.addSky(this.player, context.debugUI);

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

        const uiCanvas = document.getElementById("ui") as HTMLCanvasElement;
        uiCanvas.width = context.domElement.clientWidth;
        uiCanvas.height = context.domElement.clientHeight;
        this.ui = new UI(uiCanvas, context);
        this.ui.addMarker(tree, "Seed Tree");
    }

    public dispose() {
        this.context.domElement.removeEventListener('click', this.onClick);
        this.context.domElement.removeEventListener('contextmenu', this.onRightClick);
        this.player.dispose();
    }

    private onClick(event: MouseEvent) {
        const [screenRay] = Utils.pool.ray;
        Utils.getScreenRay(event.clientX, event.clientY, this.context, screenRay);

        const { radius, cellResolution } = World.config;

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

            if (this.cameraControls) {
                this.player.moveTo(raycast.intersection1.clone());
            }

            // const debug = new Mesh(new SphereGeometry(1), new MeshStandardMaterial({ color: 0xff0000 }));
            // debug.position.copy(raycast.intersection1);
            // this.add(debug);

            const planes = [
                new Plane(new Vector3(0, -1, 0), World.config.radius),
                new Plane(new Vector3(1, 0, 0), World.config.radius),
                new Plane(new Vector3(0, 1, 0), World.config.radius),
                new Plane(new Vector3(-1, 0, 0), World.config.radius),
                new Plane(new Vector3(0, 0, 1), World.config.radius),
                new Plane(new Vector3(0, 0, -1), World.config.radius)
            ];

            const direction = raycast.intersection1.clone().normalize();
            const boxRadius = Math.sqrt(radius * radius + radius * radius) * 2;
            const planeIntersection = new Vector3();
            const line = new Line3();
            
            const cellSize = radius * 2 / cellResolution;
            for (let i = 0; i < planes.length; i++) {
                if (planes[i].intersectLine(line.set(Utils.vec3.zero, direction.clone().multiplyScalar(boxRadius)), planeIntersection)) {                    
                    if (Math.abs(planeIntersection.x) > radius
                        || Math.abs(planeIntersection.y) > radius
                        || Math.abs(planeIntersection.z) > radius) {
                        continue;
                    }
                    // const debug2 = new Mesh(new SphereGeometry(1), new MeshStandardMaterial({ color: 0x0000ff }));
                    // debug2.position.copy(planeIntersection);
                    // this.add(debug2);

                    // get cell coords
                    const x = -planeIntersection.x + radius; // convert from [radius, -radius] to [0, radius * 2]
                    const y = -planeIntersection.z + radius; // convert from [radius, -radius] to [0, radius * 2]
                    const cellX = Math.floor(x / cellSize);
                    const cellY = Math.floor(y / cellSize);

                    // const cell = this.terrain.getCell(i, cellX, cellY);
                    // console.log(cell.children.length);
                    console.log(`plane ${i}, cell ${cellX}, ${cellY}`);
                    break;
                }
            }
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
        if (this.cameraControls) {
            this.cameraControls.update(deltaTime);
        }
        this.player.update(deltaTime);
        this.seedTrees.forEach(t => t.update(deltaTime));
        this.ui.update(deltaTime);
    }
}
