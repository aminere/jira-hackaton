

import { Terrain } from './terrain';

import { Sky } from "three/examples/jsm/objects/Sky";

import { CameraControls } from './camera-controls';
import { Player } from './player';

import { BoxGeometry, DirectionalLight, Line3, MathUtils, Mesh, MeshBasicMaterial, Object3D, Plane, Scene, Vector3 } from "three";
import { GUI } from "dat.gui";

import { IContext } from './types';
import { SeedTree } from './seed-tree';
import { Collision } from './collision';
import { Utils } from './utils';
import { WaterPit } from './water-pit';
import { HUD } from './hud';

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import type { Cell } from './cell';

type Action = "flower" | "bush" | "tree" | "water" | "none";

type SerializedWorld = Array<{ type: string; coords: Vector3 }>;

interface IState {
    seedCount: number;
    coins: number;
    action: Action;
    keys: Map<string, boolean>;
}

export class World extends Scene {

    private static config = {
        radius: 30,
        cellResolution: 12,
    };

    private player!: Player;
    private cameraControls!: CameraControls;
    private trees: SeedTree[] = [];
    private waterPits: WaterPit[] = [];
    private context: IContext;
    private cursor: string | null = null;
    private hud: HUD;
    private terrain: Terrain;    
    private selectedCell: Cell | null = null; 

    private flowers: Object3D[] = [];
    private bushes: Object3D[] = [];
    private flowerCells: Cell[] = [];
    private bushCells: Cell[] = [];
    private waterCells: Cell[] = [];
    private treeCells: Cell[] = [];

    private serializedWorld: SerializedWorld = [];
    private saveToLocalStorage = true;

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

        this.serializedWorld = []; /*JSON.parse(localStorage.getItem("map") ?? `[
            { "type": "tree", "coords": { "x": 0, "y": 5, "z": 4 } },
            { "type": "water", "coords": { "x": 0, "y": 8, "z": 4 } }
        ]`) as SerializedWorld;*/

        this.saveToLocalStorage = false;
        this.serializedWorld.forEach(({ type, coords }) => {
            switch (type) {
                case "tree": this.buildTree(this.terrain.getCell(coords)); break;
                case "water": this.buildWater(this.terrain.getCell(coords)); break;
            }
        });
        this.saveToLocalStorage = true;

        // cellResolution = 12
        // this.buildTree(this.terrain.getCell(new Vector3(0, cellResolution / 2 - 1, 4)));
        // this.buildWater(this.terrain.getCell(new Vector3(0, cellResolution / 2 + 2, 4)))
        // this.buildTree(this.terrain.getCell(new Vector3(0, cellResolution - 1, 4)));

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

        // const buildFlower = document.getElementById("buildFlower") as HTMLButtonElement;
        // buildFlower.onclick = () => this.enterBuildMode("flower");
        // const buildBush = document.getElementById("buildBush") as HTMLButtonElement;
        // buildBush.onclick = () => this.enterBuildMode("bush");
        // const buildTree = document.getElementById("buildTree") as HTMLButtonElement;
        // buildTree.onclick = () => this.enterBuildMode("tree");
        // const buildWater = document.getElementById("buildWater") as HTMLButtonElement;
        // buildWater.onclick =() => this.enterBuildMode("water");
    }

    private castOnSphere(object: Object3D) {
        const { radius } = World.config;
        Utils.castOnSphere(object, radius);
    }

    private buildFlower(cell: Cell) { 
        const flower = new Object3D();        
        flower.position.copy(cell.worldPos);
        this.castOnSphere(flower);
        const flowerMesh = new Mesh(new BoxGeometry(.5, 2, .5), new MeshBasicMaterial({ color: 0x00ff00 }));
        flowerMesh.position.y = 1;
        flower.add(flowerMesh);
        cell.content = flower;
        this.add(flower);
        this.flowers.push(flower);                    
        this.state.seedCount--;
        cell.mesh.material = Terrain.materials.invalid;        
    }

    private buildBush(cell: Cell) {
        const bush = new Object3D();        
        bush.position.copy(cell.worldPos);
        this.castOnSphere(bush);
        const bushMesh = new Mesh(new BoxGeometry(.5, 2, .5), new MeshBasicMaterial({ color: 0x0000ff }));
        bushMesh.position.y = 1;
        bush.add(bushMesh);
        cell.content = bush;
        this.add(bush);
        this.bushes.push(bush);                    
        this.state.seedCount--;
        cell.mesh.material = Terrain.materials.invalid;
    }

    private buildTree(cell: Cell) {
        const tree = new SeedTree();
        tree.position.copy(cell.worldPos);
        this.castOnSphere(tree);
        cell.content = tree;
        this.add(tree);
        this.trees.push(tree);
        this.updateFlowerCells(cell); // flowers at a radius from trees

        if (cell.parentPits) {
            // disable other cells that are in the area so that trees are not too close to each other
            const [pit1, pit2] = cell.parentPits as [WaterPit, WaterPit];
            pit1.cellsPerNeighbor.get(pit2)?.forEach(c => {
                c.valid["tree"] = false;
            });
        }

        if (this.saveToLocalStorage) {
            this.serializedWorld.push({ type: "tree", coords: cell.coords });
            localStorage.setItem("map", JSON.stringify(this.serializedWorld));
        }
    }

    private buildWater(cell: Cell) {
        const waterPit = new WaterPit();
        waterPit.position.copy(cell.worldPos);
        this.castOnSphere(waterPit);
        cell.content = waterPit;
        this.add(waterPit);
        
        if (this.waterPits.length === 0) {
            // init water cells
            this.waterCells = [];
            this.terrain.faces.forEach(face => {
                face.children.forEach(c => {
                    const _cell = c as Cell;
                    _cell.valid["water"] = !Boolean(_cell.content);
                    this.waterCells.push(_cell);
                });
            });
        }

        this.waterPits.push(waterPit);        

        this.updateBushCells(cell); // bushes at a radius from water
        this.updateWaterCells(cell); // water cells at a radius from each other
        this.updateTreeCells(cell); // trees in between water cells

        if (this.saveToLocalStorage) {
            this.serializedWorld.push({ type: "water", coords: cell.coords });
            localStorage.setItem("map", JSON.stringify(this.serializedWorld));
        }
    }
    
    private updateFlowerCells(newTree: Cell) {
        const flowerRadius = 10;
        const { radius, cellResolution } = World.config;
        const cellSize = radius * 2 / cellResolution;
        
        const cells: Cell[] = [];

        const [normal, right, forward, startPos, currentPos, cellCoords, planeIntersection, lineEnd] = Utils.pool.vec3;
        normal.copy(newTree.worldPos).normalize();
        Utils.getBasisFromNormal(normal, right, forward);
        startPos.copy(newTree.worldPos)
            .addScaledVector(right, flowerRadius)
            .addScaledVector(forward, flowerRadius);             
        
        currentPos.copy(startPos);
        const stepSize = cellSize / 2;
        const steps = Math.round((flowerRadius * 2) / stepSize);
        const cellPos = new Vector3();
        const { valid, invalid } = Terrain.materials;
        for (let i = 0; i <= steps; i++) {
            for (let j = 0; j <= steps; j++) {

                cellPos.copy(currentPos).normalize().multiplyScalar(radius);

                if (this.getCellCoordsFromSpherePos(cellPos, cellCoords, planeIntersection, lineEnd)) {
                    const cell = this.terrain.getCell(cellCoords);
                    const checked = cell.checked["flower"];
                    if (!checked) {
                        cells.push(cell);
                        cell.mesh.material = cell.content ? invalid : valid;
                        cell.checked["flower"] = true;
                        cell.valid["flower"] = !Boolean(cell.content);
                    }
                }

                currentPos.addScaledVector(right, -stepSize);
            }
            currentPos.copy(startPos).addScaledVector(forward, -stepSize * (i + 1));
        }

        this.flowerCells = [...this.flowerCells, ...cells];
    }

    private updateBushCells(newWater: Cell) {
        const bushRadius = 8;
        const { radius, cellResolution } = World.config;
        const cellSize = radius * 2 / cellResolution;
        
        const cells: Cell[] = [];

        const [normal, right, forward, startPos, currentPos, cellCoords, planeIntersection, lineEnd] = Utils.pool.vec3;
        normal.copy(newWater.worldPos).normalize();
        Utils.getBasisFromNormal(normal, right, forward);
        startPos.copy(newWater.worldPos)
            .addScaledVector(right, bushRadius)
            .addScaledVector(forward, bushRadius);             
        
        currentPos.copy(startPos);
        const stepSize = cellSize / 2;
        const steps = Math.round((bushRadius * 2) / stepSize);
        const cellPos = new Vector3();
        const { valid, invalid } = Terrain.materials;
        for (let i = 0; i <= steps; i++) {
            for (let j = 0; j <= steps; j++) {

                cellPos.copy(currentPos).normalize().multiplyScalar(radius);

                if (this.getCellCoordsFromSpherePos(cellPos, cellCoords, planeIntersection, lineEnd)) {
                    const cell = this.terrain.getCell(cellCoords);
                    const checked = cell.checked["bush"];
                    if (!checked) {
                        cells.push(cell);
                        cell.mesh.material = cell.content ? invalid : valid;
                        cell.checked["bush"] = true;
                        cell.valid["bush"] = !Boolean(cell.content);
                    }
                }

                currentPos.addScaledVector(right, -stepSize);
            }
            currentPos.copy(startPos).addScaledVector(forward, -stepSize * (i + 1));
        }

        this.bushCells = [...this.bushCells, ...cells];
    }

    private updateWaterCells(newWater: Cell) {
        const waterRadius = 8;
        const { radius, cellResolution } = World.config;
        const cellSize = radius * 2 / cellResolution;        

        const [normal, right, forward, startPos, currentPos, cellCoords, planeIntersection, lineEnd] = Utils.pool.vec3;
        normal.copy(newWater.worldPos).normalize();
        Utils.getBasisFromNormal(normal, right, forward);
        startPos.copy(newWater.worldPos)
            .addScaledVector(right, waterRadius)
            .addScaledVector(forward, waterRadius);
        
        currentPos.copy(startPos);
        const stepSize = cellSize / 2;
        const steps = Math.round((waterRadius * 2) / stepSize);
        const cellPos = new Vector3();
        for (let i = 0; i <= steps; i++) {
            for (let j = 0; j <= steps; j++) {

                cellPos.copy(currentPos).normalize().multiplyScalar(radius);

                if (this.getCellCoordsFromSpherePos(cellPos, cellCoords, planeIntersection, lineEnd)) {
                    const cell = this.terrain.getCell(cellCoords);
                    const checked = cell.checked["water"];
                    if (!checked) {                        
                        cell.checked["water"] = true;
                        cell.valid["water"] = false;
                    }
                }

                currentPos.addScaledVector(right, -stepSize);
            }
            currentPos.copy(startPos).addScaledVector(forward, -stepSize * (i + 1));
        }
    }

    private updateTreeCells(newWater: Cell) {
        if (this.waterPits.length < 2) {
            return; // trees require at least 2 water pits
        }

        const { radius, cellResolution } = World.config;
        const cellSize = radius * 2 / cellResolution;
        const maxAngleBetweenNeighbors = 30;
        const waterRadius = 2;

        const [pit1Pos, pit2Pos, average, normal, right, forward, startPos, currentPos, cellCoords, planeIntersection, lineEnd] = Utils.pool.vec3;
        const newPit = newWater.content as WaterPit;
        const cellPos = new Vector3(); 
        const cells: Cell[] = [];       
        const { valid, invalid } = Terrain.materials;
        this.waterPits.forEach(pit => {
            if (pit === newPit) {
                return;
            }
            
            const angle = Math.acos(pit1Pos.copy(pit.position).normalize().dot(pit2Pos.copy(newPit.position).normalize())) * MathUtils.RAD2DEG;
            if (angle < maxAngleBetweenNeighbors) {
                normal.lerpVectors(pit1Pos, pit2Pos, 0.5).normalize();
                average.copy(normal).multiplyScalar(radius);               

                Utils.getBasisFromNormal(normal, right, forward);
                startPos.copy(average)
                    .addScaledVector(right, waterRadius)
                    .addScaledVector(forward, waterRadius);
                
                currentPos.copy(startPos);
                const stepSize = cellSize / 2;
                const steps = Math.round((waterRadius * 2) / stepSize);
                for (let i = 0; i <= steps; i++) {
                    for (let j = 0; j <= steps; j++) {
        
                        cellPos.copy(currentPos).normalize().multiplyScalar(radius);
        
                        if (this.getCellCoordsFromSpherePos(cellPos, cellCoords, planeIntersection, lineEnd)) {
                            const cell = this.terrain.getCell(cellCoords);
                            const checked = cell.checked["tree"];
                            if (!checked) {        
                                cells.push(cell);
                                cell.mesh.material = cell.content ? invalid : valid;                
                                cell.checked["tree"] = true;
                                cell.valid["tree"] = true;

                                // update cell per pit info
                                cell.parentPits = [pit, newPit];
                                if (!pit.cellsPerNeighbor.has(newPit)) {
                                    pit.cellsPerNeighbor.set(newPit, [cell]);
                                } else {
                                    pit.cellsPerNeighbor.get(newPit)?.push(cell);
                                }
                                if (!newPit.cellsPerNeighbor.has(pit)) {
                                    newPit.cellsPerNeighbor.set(pit, [cell]);
                                } else {
                                    newPit.cellsPerNeighbor.get(pit)?.push(cell);
                                }
                            }
                        }
        
                        currentPos.addScaledVector(right, -stepSize);
                    }
                    currentPos.copy(startPos).addScaledVector(forward, -stepSize * (i + 1));
                }
            }
        });

        this.treeCells = [...this.treeCells, ...cells];
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
        for (const seedTree of this.trees) {
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
                const canPlant = !this.selectedCell.content && this.selectedCell.valid[this.state.action];
                if (canPlant) {
                    switch (this.state.action) {
                        case "flower":
                            this.buildFlower(this.selectedCell);
                            break;
                        case "bush":
                            this.buildBush(this.selectedCell);
                            break;
                        case "tree":
                            this.buildTree(this.selectedCell);
                            break;
                        case "water":
                            this.buildWater(this.selectedCell);
                            break;
                    }
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

        this.exitBuildMode();

        // const checkSeeds = () => {
        //     if (this.state.seedCount < 1) {
        //         // TODO: show message
        //         console.log("not enough seeds");
        //         return false;
        //    }
        //    return true;
        // };

        // const checkCoins = (count: number) => {
        //     if (this.state.coins < count) {
        //         // TODO: show message
        //         console.log("not enough coins");
        //         return false;
        //    }
        //    return true;
        // };

        switch (action) {
            case "flower":
                // if (!checkSeeds()) {
                //     return;
                // }

                this.flowerCells.forEach(cell => {
                    cell.visible = !Boolean(cell.content);
                    if (cell.visible) {
                        cell.mesh.material = Terrain.materials.valid;
                    }                    
                });

                break;
            case "bush":
                // if (!checkSeeds()) {
                //     return;
                // }
                // if (!checkCoins(1)) {
                //     return;
                // }
                this.bushCells.forEach(cell => {
                    cell.visible = !Boolean(cell.content);
                    if (cell.visible) {
                        cell.mesh.material = Terrain.materials.valid;
                    }
                });
                break;
            case "tree":
                // if (!checkSeeds()) {
                //     return;
                // }
                // if (!checkCoins(2)) {
                //     return;
                // }
                this.treeCells.forEach(cell => {
                    cell.visible = !Boolean(cell.content) && cell.valid["tree"];
                    if (cell.visible) {
                        cell.mesh.material = Terrain.materials.valid;
                    }
                });
                break;
            case "water":
                // if (!checkCoins(3)) {
                //     return;
                // }

                this.waterCells.forEach(cell => {
                    cell.visible = !Boolean(cell.content) && cell.valid["water"];
                    if (cell.visible) {
                        cell.mesh.material = Terrain.materials.valid;
                    }                    
                });
                break;
        }        

        this.state.action = action;
        this.cameraControls.freezeYaw = true;
    }

    private exitBuildMode() {
        if (this.selectedCell) {
            this.selectedCell.visible = false;
            this.selectedCell = null;
        }
        this.cameraControls.freezeYaw = false;
        switch (this.state.action) {
            case "flower":
                this.flowerCells.forEach(cell => cell.visible = false);
                break;
            case "bush":
                this.bushCells.forEach(cell => cell.visible = false);
                break;
            case "water":
                this.waterCells.forEach(cell => cell.visible = false);
                break;
            case "tree":
                this.treeCells.forEach(cell => cell.visible = false);
                break;
        }
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
            for (const seedTree of this.trees) {
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
        const { radius } = World.config;
        const raycast = Collision.rayCastOnSphere(screenRay, Utils.vec3.zero, radius);
        if (raycast) {
            const [cellCoords, planeIntersection, lineEnd] = Utils.pool.vec3;
            if (this.getCellCoordsFromSpherePos(raycast.intersection1, cellCoords, planeIntersection, lineEnd)) {
                const cell = this.terrain.getCell(cellCoords);
                if (cell !== this.selectedCell) {
                    const { valid, invalid, selected } = Terrain.materials;
                    if (this.selectedCell) {
                        if (this.selectedCell.valid[this.state.action] && !Boolean(this.selectedCell.content)) {
                            this.selectedCell.visible = true;
                            this.selectedCell.mesh.material = valid;
                        } else {
                            this.selectedCell.visible = false;
                            this.selectedCell.mesh.material = invalid;
                        }
                    }
                    
                    cell.visible = !Boolean(cell.content);                                
                    if (cell.valid[this.state.action]) {
                        cell.mesh.material = selected;
                    } else {
                        cell.mesh.material = invalid;
                    }

                    this.selectedCell = cell;
                }
            }
        }
    }

    private getCellCoordsFromSpherePos(spherePos: Vector3, cellCoords: Vector3, planeIntersection: Vector3, lineEnd: Vector3) {
        const { radius, cellResolution } = World.config;
        const boxRadius = Math.sqrt(radius * radius + radius * radius) * 2;
        lineEnd.copy(spherePos).normalize().multiplyScalar(boxRadius);
        const line = new Line3();
        const cellSize = radius * 2 / cellResolution;
        const { planes } = World;
        const epsilon = 0.0001;
        for (let i = 0; i < planes.length; i++) {
            if (planes[i].intersectLine(line.set(Utils.vec3.zero, lineEnd), planeIntersection)) {                    
                if (Math.abs(planeIntersection.x) > radius + epsilon
                    || Math.abs(planeIntersection.y) > radius + epsilon
                    || Math.abs(planeIntersection.z) > radius + epsilon) {
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
                cellCoords.set(i, cellX, cellY);
                return true;
            }
        }
        return false;
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
        sky.rotateX(Math.PI / 2);
        parent.add(sky);

        const uniforms = sky.material.uniforms;

        const skySettings = {
            turbidity: 1,
            rayleigh: 0.106,
            mieCoefficient: 0.002,
            mieDirectionalG: 0.975            
        };

        const sunSettings = {
            elevation: 32,
            azimuth: 20
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
        this.trees.forEach(t => t.update(deltaTime));
        this.hud.update();
    }

    private onKeyDown(event: KeyboardEvent) {  
        this.state.keys.set(event.code, true);
    }

    private onKeyUp(event: KeyboardEvent) {
        this.state.keys.set(event.code, false);
        
        if (event.code === "Escape") {
            this.exitBuildMode();
            event.preventDefault();
            event.stopPropagation();
        }
    } 
}
