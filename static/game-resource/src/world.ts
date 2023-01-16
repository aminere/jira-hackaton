

import { Terrain } from './terrain';

import { Sky } from "three/examples/jsm/objects/Sky";

import { CameraControls } from './camera-controls';
import { Player } from './player';

import { DirectionalLight, Line3, MathUtils, Object3D, Plane, Scene, Vector3 } from "three";
import { GUI } from "dat.gui";

import { IContext, ITask } from './types';
import { SeedTree } from './seed-tree';
import { Collision } from './collision';
import { Utils } from './utils';

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import type { Cell } from './cell';

interface IState {
    seedCount: number;
    coins: number;
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
    private context: IContext;
    private cursor: string | null = null;
    private terrain: Terrain;    
    private selectedCell: Cell | null = null; 

    private treeCells: Cell[] = [];
    
    private taskLoading = false;
    private tasksInitialized = false;
    private taskToPlant: ITask | null = null;
    private openPanels: HTMLElement[] = [];

    private state: IState = {
        seedCount: 0,
        coins: 0,        
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

        // init tree cells
        this.terrain.faces.forEach(face => {
            face.children.forEach(c => {
                const _cell = c as Cell;
                _cell.valid["tree"] = !Boolean(_cell.content);
                this.treeCells.push(_cell);
            });
        });

        const plantedIssues = JSON.parse(localStorage.getItem("planted-issues") ?? "{}") as Record<string, ITask>;
        Object.values(plantedIssues).forEach(issue => {                        
            // switch (type) {
                this.buildTree(this.terrain.getCell(issue.coords), issue);
                // case "water": this.buildWater(this.terrain.getCell(coords)); break;
            // }
        });
       
        this.load();

        this.onClick = this.onClick.bind(this);
        this.onRightClick = this.onRightClick.bind(this);
        this.onPointerMove = this.onPointerMove.bind(this);
        this.onResize = this.onResize.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
        this.onKeyUp = this.onKeyUp.bind(this);
        context.domElement.addEventListener('click', this.onClick);
        context.domElement.addEventListener('contextmenu', this.onRightClick);
        document.addEventListener("pointermove", this.onPointerMove);
        window.addEventListener("resize", this.onResize);
        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);

        this.onIssueLoaded = this.onIssueLoaded.bind(this);
        this.onIssuesLoaded = this.onIssuesLoaded.bind(this);
        
        (document.getElementById("jira-logo") as HTMLButtonElement).onclick = () => this.openTasksPanel();
        (document.getElementById("refresh") as HTMLButtonElement).onclick = () => this.refreshData();
    }

    private onIssuesLoaded(event: THREE.Event) {       
        console.log("onIssuesLoaded");
        this.removeEventListener("issuesLoaded", this.onIssuesLoaded);
        this.taskLoading = false;
        document.getElementById("task-loading")?.classList.add("hidden");
        document.getElementById("tasks")?.classList.remove("hidden");
        this.fillTaskList(JSON.parse(event.message) as ITask[]);        
    }

    private openTasksPanel() {
        const panel = (document.getElementById("task-panel") as HTMLElement);
        panel.classList.toggle("hidden");

        this.openPanels.forEach(p => p.classList.add("hidden"));

        if (this.taskLoading) {
            return;
        }

        if (!this.tasksInitialized) {
            this.tasksInitialized = true;
            this.taskLoading = true;                        
            this.addEventListener("issuesLoaded", this.onIssuesLoaded);             
            this.dispatchEvent({ type: "loadIssues" });
        }
    }

    private refreshData() {
        console.log("Refreshing data");
        const taskList = document.getElementById("task-list") as HTMLElement;
        taskList.innerHTML = "";
        document.getElementById("task-loading")?.classList.remove("hidden");
        document.getElementById("tasks")?.classList.add("hidden");

        this.taskLoading = true;
        this.addEventListener("issuesLoaded", this.onIssuesLoaded);
        this.dispatchEvent({ type: "loadIssues" });        
    }

    private addTaskToList(task: ITask, taskList: HTMLElement) {
        const taskElem = document.createElement("div");
        taskElem.id = `task-${task.key}`;
        taskElem.classList.add("task");

        const key = document.createElement("span");
        key.innerText = task.key;
        const summary = document.createElement("span");
        summary.innerText = task.summary;

        /*const button = document.createElement("button");
        button.type = "button";
        button.id = `button-${task.key}`;
        const buttonText = document.createElement("span");
        buttonText.innerText = "PLANT ME";
        button.appendChild(buttonText);
        button.onclick = () => {      
            document.getElementById("task-panel")?.classList.add("hidden");
            this.taskToPlant = task;
            this.enterBuildMode("tree");
        };*/

        const taskIcons = document.createElement("div");
        taskIcons.classList.add("task-icons");            
        const buttonTree = document.createElement("button");
        buttonTree.classList.add("tooltip");
        buttonTree.type = "button";    
        buttonTree.onclick = () => {
            document.getElementById("task-panel")?.classList.add("hidden");
            this.taskToPlant = {
                ...task,
                ...{ type: "tree" }
            };
            this.enterBuildMode();
        };    
        const buttonTreeIcon = document.createElement("img");
        buttonTreeIcon.src = "ui/tree.svg";        
        buttonTree.appendChild(buttonTreeIcon);
        const buttonPlant = document.createElement("button");
        buttonPlant.classList.add("tooltip");
        buttonPlant.type = "button";    
        buttonPlant.onclick = () => {
            document.getElementById("task-panel")?.classList.add("hidden");
            this.taskToPlant = {
                ...task,
                ...{ type: "plant" }
            };
            this.enterBuildMode();
        };    
        const buttonPlantIcon = document.createElement("img");
        buttonPlantIcon.src = "ui/flower.svg";        
        buttonPlant.appendChild(buttonPlantIcon);
        taskIcons.appendChild(buttonTree);
        taskIcons.appendChild(buttonPlant);

        taskElem.appendChild(key);
        taskElem.appendChild(summary);
        taskElem.appendChild(taskIcons);
        taskList.appendChild(taskElem);
    }

    private fillTaskList(tasks: ITask[]) {
        const taskList = document.getElementById("task-list") as HTMLElement;        
        const plantedIssues = JSON.parse(localStorage.getItem("planted-issues") ?? "{}");

        let availableTasks = 0;
        tasks.forEach(task => {
            if (task.id in plantedIssues) {
                // task already planted
                return;
            }

            this.addTaskToList(task, taskList);            
            ++availableTasks;
        });

        if (availableTasks === 0) {
            document.getElementById("no-tasks")?.classList.remove("hidden");
        } else {
            document.getElementById("no-tasks")?.classList.add("hidden");
        }
    }

    private castOnSphere(object: Object3D) {
        const { radius } = World.config;
        Utils.castOnSphere(object, radius);
    }    

    private onIssueLoaded(event: THREE.Event) {
        console.log("onIssueLoaded");
        this.removeEventListener("issueLoaded", this.onIssueLoaded);        
        const issue = JSON.parse(event.message) as ITask;

        const plantedIssues = JSON.parse(localStorage.getItem("planted-issues") ?? "{}");
        const plantedIssue = plantedIssues[issue.id] as ITask;
        plantedIssue.summary = issue.summary;
        plantedIssue.status = issue.status;

        const cell = this.terrain.getCell(plantedIssue.coords);
        if (cell) {
            const tree = cell.content as SeedTree;
            const status = tree.panel.querySelector(`#status-${issue.id}`) as HTMLElement;
            status.innerText = `${issue.status}`;
            const summary = tree.panel.querySelector(`#summary-${issue.id}`) as HTMLElement;
            summary.innerText = `${issue.summary}`;            
            tree.icon.classList.remove("hidden");
            tree.loader.classList.add("hidden");
        }

        this.trees.forEach(tree => {
            tree.refresh.classList.remove("hidden");            
        });
    }

    private buildTree(cell: Cell, task: ITask) {

        const hud = document.getElementById("hud") as HTMLElement;

        const container = document.createElement("div");
        container.classList.add("tree-container");

        const panel = document.createElement("div");
        panel.classList.add("tree-panel", "hidden");
        const key = document.createElement("div");
        key.innerText = task.key;
        const status = document.createElement("div");
        status.id = `status-${task.id}`;
        status.innerText = `STATUS: ${task.status}`;
        const summary = document.createElement("div");
        summary.id = `summary-${task.id}`;
        summary.innerText = task.summary;
        panel.appendChild(key);
        panel.appendChild(status);
        panel.appendChild(summary);

        const controls = document.createElement("div");
        controls.classList.add("tree-controls");
        const refresh = document.createElement("button");
        refresh.classList.add("tooltip");
        refresh.type = "button";

        const loader = document.createElement("div");
        loader.classList.add("loader", "tree-loader");

        refresh.onclick = () => {
            this.addEventListener("issueLoaded", this.onIssueLoaded);
            this.dispatchEvent({ type: "loadIssue", message: task.id });
            
            icon.classList.add("hidden");
            panel.classList.add("hidden");
            loader.classList.remove("hidden");

            this.trees.forEach(tree => {
                tree.refresh.classList.add("hidden");
            });
        };

        const refreshIcon = document.createElement("img");
        refreshIcon.src = "ui/refresh.png";
        const refreshTooltip = document.createElement("span");
        refreshTooltip.classList.add("tooltiptext");
        refreshTooltip.innerText = "Refresh Issue";
        refresh.appendChild(refreshIcon);
        refresh.appendChild(refreshTooltip);
        const close = document.createElement("button");
        close.classList.add("tooltip");
        close.type = "button";

        close.onclick = () => {
            // remove tree
            const _tree = cell.content as SeedTree;
            this.trees.splice(this.trees.indexOf(_tree), 1);
            this.remove(_tree);
            cell.content = null;

            const plantedIssues = JSON.parse(localStorage.getItem("planted-issues") ?? "{}");
            delete plantedIssues[task.id];
            localStorage.setItem("planted-issues", JSON.stringify(plantedIssues));

            container.parentNode?.removeChild(container);

            const taskList = document.getElementById("task-list") as HTMLElement;
            this.addTaskToList(task, taskList);
            document.getElementById("no-tasks")?.classList.add("hidden");
        };

        const closeIcon = document.createElement("img");
        closeIcon.src = "ui/close.svg";
        const closeTooltip = document.createElement("span");
        closeTooltip.classList.add("tooltiptext");
        closeTooltip.innerText = "Remove";        
        close.appendChild(closeIcon);
        close.appendChild(closeTooltip);        

        const swap = document.createElement("button");
        swap.classList.add("tooltip");
        swap.type = "button";
        swap.onclick = () => {
            // swap tree
            const oldTree = cell.content as SeedTree;
            this.trees.splice(this.trees.indexOf(oldTree), 1);
            this.remove(oldTree);

            loader.classList.remove('hidden');
            panel.classList.add("hidden");            
            icon.classList.add('hidden');

            const newTree = new SeedTree(this.context, container, icon, panel, loader, refresh, "tree");
            newTree.position.copy(cell.worldPos);
            this.castOnSphere(newTree);
            cell.content = newTree;
            this.add(newTree);
            this.trees.push(newTree);

            const plantedIssues = JSON.parse(localStorage.getItem("planted-issues") ?? "{}");
            plantedIssues[task.id].type = "tree";
            localStorage.setItem("planted-issues", JSON.stringify(plantedIssues));
        };
        const swapIcon = document.createElement("img");
        swapIcon.src = "ui/tree.svg";
        const swapTooltip = document.createElement("span");
        swapTooltip.classList.add("tooltiptext");
        swapTooltip.innerText = "Change Tree";        
        swap.appendChild(swapIcon);
        swap.appendChild(swapTooltip);

        // swap plant
        const swapPlant = document.createElement("button");
        swapPlant.classList.add("tooltip");
        swapPlant.type = "button";
        swapPlant.onclick = () => {
            // swap plant
            const oldTree = cell.content as SeedTree;
            this.trees.splice(this.trees.indexOf(oldTree), 1);
            this.remove(oldTree);

            loader.classList.remove('hidden');
            panel.classList.add("hidden");            
            icon.classList.add('hidden');

            const newTree = new SeedTree(this.context, container, icon, panel, loader, refresh, "plant");
            newTree.position.copy(cell.worldPos);
            this.castOnSphere(newTree);
            cell.content = newTree;
            this.add(newTree);
            this.trees.push(newTree);

            const plantedIssues = JSON.parse(localStorage.getItem("planted-issues") ?? "{}");
            plantedIssues[task.id].type = "plant";
            localStorage.setItem("planted-issues", JSON.stringify(plantedIssues));
        };
        const swapPlantIcon = document.createElement("img");
        swapPlantIcon.src = "ui/flower.svg";
        const swapPlantTooltip = document.createElement("span");
        swapPlantTooltip.classList.add("tooltiptext");
        swapPlantTooltip.innerText = "Change Plant";        
        swapPlant.appendChild(swapPlantIcon);
        swapPlant.appendChild(swapPlantTooltip);

        controls.appendChild(refresh);
        controls.appendChild(swap);
        controls.appendChild(swapPlant);
        controls.appendChild(close);
        panel.appendChild(controls);        

        const icon = document.createElement("img");
        icon.classList.add("hidden");
        icon.src = "ui/jira-icon.png";
        icon.onclick = () => {
            panel.classList.toggle("hidden");
            this.openPanels.forEach(p => {
                if (p !== panel) {
                    p.classList.add("hidden");
                }
            });
            if (!panel.classList.contains("hidden")) {
                const index = this.openPanels.findIndex(p => p === panel);
                if (index < 0) {
                    this.openPanels.push(panel);
                }
            }
        };        

        container.appendChild(icon);        
        container.appendChild(loader);
        container.appendChild(panel);
        
        hud.appendChild(container);

        const tree = new SeedTree(this.context, container, icon, panel, loader, refresh, task.type);
        tree.position.copy(cell.worldPos);
        this.castOnSphere(tree);
        cell.content = tree;
        this.add(tree);
        this.trees.push(tree);
    }

    public dispose() {
        this.context.domElement.removeEventListener('click', this.onClick);
        this.context.domElement.removeEventListener('contextmenu', this.onRightClick);
        document.removeEventListener('pointermove', this.onPointerMove);
        window.removeEventListener("resize", this.onResize);
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('keyup', this.onKeyUp);
    }

    private onClick(event: MouseEvent) {
        const [screenRay] = Utils.pool.ray;
        Utils.getScreenRay(event.clientX, event.clientY, this.context, screenRay);

        const { radius } = World.config;
        const raycast = Collision.rayCastOnSphere(screenRay, Utils.vec3.zero, radius);
        if (raycast) {

            if (this.selectedCell) {
                const canPlant = !this.selectedCell.content && this.taskToPlant !== null;
                if (canPlant) {
                    const task = this.taskToPlant as ITask;
                    console.log(`Planting ${task}`);
                    this.buildTree(this.selectedCell, task);

                    const taskList = document.getElementById("task-list") as HTMLElement;
                    const taskElem = document.getElementById(`task-${task.key}`) as HTMLElement;
                    taskList.removeChild(taskElem);

                    const plantedIssues = JSON.parse(localStorage.getItem("planted-issues") ?? "{}");
                    plantedIssues[task.id] = {
                        id: task.id,
                        key: task.key,
                        summary: task.summary,
                        status: task.status,

                        coords: this.selectedCell.coords.clone(),
                        type: task.type
                    } as ITask;
                    localStorage.setItem("planted-issues", JSON.stringify(plantedIssues));

                    if (taskList.children.length === 0) {
                        document.getElementById("no-tasks")?.classList.remove("hidden");
                    }

                    this.taskToPlant = null;
                    this.exitBuildMode();
                }
            } else {
                if (this.cameraControls) {
                    this.player.moveTo(raycast.intersection1.clone());
                    document.getElementById("task-panel")?.classList.add("hidden");
                }
            }
        }
    }    

    private enterBuildMode() {

        this.exitBuildMode();       

        this.treeCells.forEach(cell => {
            cell.visible = !Boolean(cell.content); // && cell.valid["tree"];
            if (cell.visible) {
                cell.mesh.material = Terrain.materials.valid;
            }
        });

        this.cameraControls.freezeYaw = true;
    }

    private exitBuildMode() {
        if (this.selectedCell) {
            this.selectedCell.visible = false;
            this.selectedCell = null;
        }
        this.cameraControls.freezeYaw = false;
        this.treeCells.forEach(cell => cell.visible = false);
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

        if (this.taskToPlant === null) {            
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
                        if (!Boolean(this.selectedCell.content)) {
                            this.selectedCell.visible = true;
                            this.selectedCell.mesh.material = valid;
                        } else {
                            this.selectedCell.visible = false;
                            this.selectedCell.mesh.material = invalid;
                        }
                    }
                    
                    cell.visible = !Boolean(cell.content); 
                    cell.mesh.material = selected;                               
                    /*if (cell.valid[this.state.action]) {
                        cell.mesh.material = selected;
                    } else {
                        cell.mesh.material = invalid;
                    }*/
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
    
    // private updateUI() {
    //     (document.getElementById("seedCount") as HTMLElement).innerText = `x ${this.state.seedCount}`;
    // }

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
        // setTimeout(() => this.hud.setSize(this.context.domElement.clientWidth, this.context.domElement.clientHeight), 10);        
    }

    public update(deltaTime: number) {
        if (this.cameraControls) {
            this.cameraControls.update(deltaTime);
        }

        if (this.state.keys.get("Space")) {
            this.player.jump();
        }

        this.player.update(deltaTime);
        this.trees.forEach(t => {
            t.update();
        });
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
