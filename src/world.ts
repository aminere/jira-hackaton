

import { Terrain } from './terrain';

import { Sky } from "three/examples/jsm/objects/Sky";

import { CameraControls } from './camera-controls';
import { Player } from './player';

import { BoxGeometry, Color, DirectionalLight, Line3, MathUtils, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, Plane, Scene, SphereGeometry, Vector3 } from "three";
import { GUI } from "dat.gui";

import { IContext, ISeed } from './types';
import { SeedTree } from './seed-tree';
import { Collision } from './collision';
import { Utils } from './utils';
import { WaterPit } from './water-pit';
import { HUD } from './hud';

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import type { Cell } from './cell';

type Action = "flower" | "bush" | "tree" | "water" | "none";

interface IState {
    seedCount: number;
    coins: number;
    action: Action;
    keys: Map<string, boolean>;
}

export class World extends Scene {

    private static config = {
        radius: 20,
        cellResolution: 10,
    };

    private player!: Player;
    private cameraControls!: CameraControls;
    private seedTrees: SeedTree[] = [];
    private context: IContext;
    private cursor: string | null = null;
    private hud: HUD;
    private terrain: Terrain;    
    private selectedCell: Cell | null = null; 

    private flowers: Object3D[] = [];

    private state: IState = {
        seedCount: 0,
        coins: 0,
        action: "none",
        keys: new Map<string, boolean>()
    };

    private static planes = [
        new Plane(new Vector3(0, -1, 0), World.config.radius),
        new Plane(new Vector3(1, 0, 0), World.config.radius),
        new Plane(new Vector3(0, 1, 0), World.config.radius),
        new Plane(new Vector3(-1, 0, 0), World.config.radius),
        new Plane(new Vector3(0, 0, 1), World.config.radius),
        new Plane(new Vector3(0, 0, -1), World.config.radius)
    ];

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

        // const waterPit = new WaterPit(context);
        // waterPit.position.set(0, radius, 0)
        //     .addScaledVector(this.player.forward, 15)
        //     .addScaledVector(this.player.right, -10);
        // Utils.castOnSphere(waterPit, radius);
        // this.add(waterPit);

        this.load();

        context.domElement.addEventListener('click', this.onClick.bind(this));
        context.domElement.addEventListener('contextmenu', this.onRightClick.bind(this));
        context.domElement.addEventListener("pointermove", this.onPointerMove.bind(this));

        window.addEventListener("resize", this.onResize.bind(this));
        window.addEventListener('keydown', this.onKeyDown.bind(this));
        window.addEventListener('keyup', this.onKeyUp.bind(this))

        const hudCanvas = document.getElementById("hud") as HTMLCanvasElement;
        hudCanvas.width = context.domElement.clientWidth;
        hudCanvas.height = context.domElement.clientHeight;
        this.hud = new HUD(hudCanvas, context);
        // this.hud.addMarker(tree, "Seed Tree");

        const buildFlower = document.getElementById("buildFlower") as HTMLButtonElement;
        buildFlower.onclick = this.buildFlower.bind(this);
        const buildBush = document.getElementById("buildBush") as HTMLButtonElement;
        buildBush.onclick = this.buildBush.bind(this);
        const buildTree = document.getElementById("buildTree") as HTMLButtonElement;
        buildTree.onclick = this.buildTree.bind(this);
        const buildWater = document.getElementById("buildWater") as HTMLButtonElement;
        buildWater.onclick = this.buildWater.bind(this);
    }

    private buildFlower() {        
        if (this.state.seedCount < 1) {
             // TODO: show message
             console.log("not enough seeds");
             return;            
        }
        this.enterBuildMode("flower");       
    }
    private buildBush() {    
        console.log("todo");
    }
    private buildTree() {   
        console.log("todo");     
    }
    private buildWater() {  
        console.log("todo");      
    }

    public dispose() {
        this.context.domElement.removeEventListener('click', this.onClick);
        this.context.domElement.removeEventListener('contextmenu', this.onRightClick);
        this.context.domElement.removeEventListener('pointermove', this.onPointerMove);
        window.removeEventListener("resize", this.onResize);
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('keyup', this.onKeyUp);
    }

    private onClick(event: MouseEvent) {
        const [screenRay] = Utils.pool.ray;
        Utils.getScreenRay(event.clientX, event.clientY, this.context, screenRay);

        const { radius } = World.config;

        // check seeds
        for (const seedTree of this.seedTrees) {
            const seed = seedTree.rayCast(screenRay);
            if (seed) {
                seedTree.removeSeed(seed);
                this.state.seedCount++;
                this.updateUI();
                return;
            }
        }

        const raycast = Collision.rayCastOnSphere(screenRay, Utils.vec3.zero, radius);
        if (raycast) {
            if (this.selectedCell) {
                if (!this.selectedCell.content) {
                    const [normal] = Utils.pool.vec3;
                    normal.copy(this.selectedCell.worldPos).normalize();                
                    const flower = new Object3D();
                    flower.position.copy(this.selectedCell.worldPos);
                    Utils.castOnSphere(flower, radius);
                    const flowerMesh = new Mesh(new BoxGeometry(.5, 2, .5), new MeshBasicMaterial({ color: 0x00ff00 }));
                    flowerMesh.position.y = 1;
                    flower.add(flowerMesh);
                    this.selectedCell.content = flower;
                    this.add(flower);
                    this.flowers.push(flower);                    
                    this.state.seedCount--;
                    this.updateUI();
                    this.exitBuildMode();
                }                
            } else {
                if (this.cameraControls) {
                    this.player.moveTo(raycast.intersection1.clone());
                }
            }
        }
    }    

    private enterBuildMode(action: Action) {
        this.state.action = action;
        this.cameraControls.freezeYaw = true;
    }

    private exitBuildMode() {
        if (this.selectedCell) {
            this.selectedCell.visible = false;
            this.selectedCell = null;
        }
        this.cameraControls.freezeYaw = false;        
        this.state.action = "none";
    }

    private updateCursor() {
        if (this.cursor === "grab") {
            this.cursor = null;
            this.context.domElement.style.cursor = "default";
        }
    }

    private onPointerMove(event: PointerEvent) {
        const [screenRay] = Utils.pool.ray;
        Utils.getScreenRay(event.clientX, event.clientY, this.context, screenRay);

        if (this.state.action === "none") {
            // check seeds
            for (const seedTree of this.seedTrees) {
                const seed = seedTree.rayCast(screenRay);
                if (seed) {
                    if (this.cursor !== "grab") {
                        this.cursor = "grab";
                        this.context.domElement.style.cursor = this.cursor;
                    }
                    return;
                }
            }
            this.updateCursor();
            return;
        }        

        this.updateCursor();
        Utils.getScreenRay(event.clientX, event.clientY, this.context, screenRay);
        const { radius, cellResolution } = World.config;
        const raycast = Collision.rayCastOnSphere(screenRay, Utils.vec3.zero, radius);
        if (raycast) {
            const direction = raycast.intersection1.clone().normalize();
            const boxRadius = Math.sqrt(radius * radius + radius * radius) * 2;
            const planeIntersection = new Vector3();
            const line = new Line3();            
            const cellSize = radius * 2 / cellResolution;
            const { planes } = World;
            for (let i = 0; i < planes.length; i++) {
                if (planes[i].intersectLine(line.set(Utils.vec3.zero, direction.clone().multiplyScalar(boxRadius)), planeIntersection)) {                    
                    if (Math.abs(planeIntersection.x) > radius
                        || Math.abs(planeIntersection.y) > radius
                        || Math.abs(planeIntersection.z) > radius) {
                        continue;
                    }                    

                    // get cell coords
                    const [x, y] = (() => {
                        if (i === 0) {
                            const x = -planeIntersection.x + radius; // convert from [radius, -radius] to [0, radius * 2]
                            const y = -planeIntersection.z + radius; // convert from [radius, -radius] to [0, radius * 2]
                            return [x, y];
                        } else if (i === 1) {
                            const x = planeIntersection.z + radius; // convert from [-radius, radius] to [0, radius * 2]
                            const y = -planeIntersection.y + radius; // convert from [radius, -radius] to [0, radius * 2]
                            return [x, y];
                        } else if (i === 2) {
                            const x = -planeIntersection.x + radius; // convert from [radius, -radius] to [0, radius * 2]
                            const y = planeIntersection.z + radius; // convert from [-radius, radius] to [0, radius * 2]
                            return [x, y];
                        } else if (i === 3) {
                            const x = -planeIntersection.z + radius; // convert from [radius, -radius] to [0, radius * 2]
                            const y = -planeIntersection.y + radius; // convert from [radius, -radius] to [0, radius * 2]
                            return [x, y];
                        } else if (i === 4) {
                            const x = -planeIntersection.x + radius; // convert from [radius, -radius] to [0, radius * 2]
                            const y = -planeIntersection.y + radius; // convert from [radius, -radius] to [0, radius * 2]
                            return [x, y];
                        } else {
                            const x = planeIntersection.x + radius; // convert from [-radius, radius] to [0, radius * 2]
                            const y = -planeIntersection.y + radius; // convert from [radius, -radius] to [0, radius * 2]
                            return [x, y];                    
                        }
                    })();
                    const cellX = Math.floor(x / cellSize);
                    const cellY = Math.floor(y / cellSize);                    
                    const cell = this.terrain.getCell(i, cellX, cellY);
                    if (this.selectedCell) {
                        this.selectedCell.visible = false;
                    }
                    cell.visible = true;
                    this.selectedCell = cell;
                    const color = cell.content ? 0xff0000 : 0x00ff00;
                    (cell.mesh.material as MeshBasicMaterial).color = new Color(color);
                    break;
                }
            }
        }
    }
    
    private updateUI() {
        (document.getElementById("seedCount") as HTMLElement).innerText = `x ${this.state.seedCount}`;
    }

    private onRightClick(event: MouseEvent) {
        event.preventDefault();
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

    private onResize() {
        setTimeout(() => this.hud.setSize(this.context.domElement.clientWidth, this.context.domElement.clientHeight), 10);        
    }

    public update(deltaTime: number) {
        if (this.cameraControls) {
            this.cameraControls.update(deltaTime);
        }

        if (this.state.keys.get("Space")) {
            this.player.jump();
        }

        this.player.update(deltaTime);
        this.seedTrees.forEach(t => t.update(deltaTime));
        this.hud.update(deltaTime);
    }

    private onKeyDown(event: KeyboardEvent) {  
        this.state.keys.set(event.code, true);
    }

    private onKeyUp(event: KeyboardEvent) {
        this.state.keys.set(event.code, false);
        
        if (event.code === "Escape") {
            this.exitBuildMode();
        }
    } 
}
