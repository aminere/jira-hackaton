
import { MathUtils, Mesh, MeshStandardMaterial, Object3D, Ray, SphereGeometry, TextureLoader, Vector3, FrontSide, MeshBasicMaterial, Color, Group } from "three";
import { Collision } from "./collision";

import { IContext, ISeed } from "./types";

import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader"

import  CustomShaderMaterial from "three-custom-shader-material/vanilla";
import vert from './tree-vertex.glsl.js';
import { Utils } from "./utils";

export class SeedTree extends Object3D {

    private readonly context: IContext;

    private readonly seeds: ISeed[] = [];

    private foliageMaterial!: CustomShaderMaterial;

    private icon!: HTMLElement;
    private panel!: HTMLElement;
    private inFrontOfCamera = false;

    private static config = {
        seedAngularSpeed: 30,
        radius: 5,
        seedHeight: 3
    };

    constructor(context: IContext, icon: HTMLElement, panel: HTMLElement) {
        super();
        this.icon = icon;
        this.panel = panel;
        this.context = context;
        
        this.load();
        // [...Array(3)].forEach(() => this.spawnSeed());        

        // const folder = context.debugUI.addFolder("Seed Tree");
        // folder.add(SeedTree.config, 'seedAngularSpeed', 0, 360, 1);
        // folder.add(SeedTree.config, 'radius', 0, 20, .1);
        // folder.add(SeedTree.config, 'seedHeight', 0, 20, .1);        
    }

    public spawnSeed() {        
        const seed = {
            angle: Math.random() * 360,
            object: new Mesh(new SphereGeometry(.5), new MeshStandardMaterial({ color: 0x00ff00 })),
            // TODO from backend
            jiraTaskId: `JIRA-${this.seeds.length + 1}`
        };
        this.updateSeedPosition(seed);
        this.add(seed.object);
        this.seeds.push(seed);
        seed.object.traverse(o => o.castShadow = true);
    }

    public removeSeed(seed: ISeed) {
        this.seeds.splice(this.seeds.indexOf(seed), 1);
        seed.object.removeFromParent();
    }

    public update(deltaTime: number) {
        /*const { seedAngularSpeed } = SeedTree.config;
        this.seeds.forEach(seed => {
            seed.angle += deltaTime * seedAngularSpeed;
            this.updateSeedPosition(seed);
        });*/

        const windTime = this.foliageMaterial?.uniforms?.u_windTime;
        if (windTime) {
            windTime.value += this.foliageMaterial.uniforms.u_windSpeed.value * deltaTime;
        }

        // update HUD
        const [worldPos, screenPos, normalizedPos] = Utils.pool.vec3;
        Utils.getScreenPosition(this.getWorldPosition(worldPos), this.context, screenPos, normalizedPos);

        const inFrontOfCamera = Math.abs(normalizedPos.x) < 0.3 && Math.abs(normalizedPos.y) < 0.3;
        if (inFrontOfCamera !== this.inFrontOfCamera) {
            if (inFrontOfCamera) {
                this.icon.classList.remove('hidden');
            } else {
                this.icon.classList.add('hidden');
                this.panel.classList.add('hidden');
            }
            this.inFrontOfCamera = inFrontOfCamera;
        }

        if (inFrontOfCamera) {
            this.icon.style.left = `calc(${screenPos.x}px - 6vmin)`;
            this.icon.style.top = `calc(${screenPos.y}px - 6vmin)`;
        }
    }

    public rayCast(ray: Ray) {
        for (const seed of this.seeds) {
            if (Collision.rayCastOnSphere(ray, seed.object.getWorldPosition(new Vector3()), 2)) {
                return seed;
            }        
        }
        return null;
    }

    private updateSeedPosition(seed: ISeed) {
        const { radius, seedHeight } = SeedTree.config;
        const angleRad = seed.angle * MathUtils.DEG2RAD;
        seed.object.position.set(
            Math.sin(angleRad) * radius,
            seedHeight,
            Math.cos(angleRad) * radius
        );
    }

    private async load() {
        const obj = await new GLTFLoader().loadAsync("assets/tree.glb");        

        const alphaMap = await new TextureLoader().load("assets/foliage_alpha3.png");
        const foliageMaterial = new CustomShaderMaterial({
            alphaMap,
            alphaTest: 0.5,
            baseMaterial: MeshStandardMaterial,
            color: new Color('#596B1E').convertLinearToSRGB(),
            uniforms: {
                u_effectBlend: { value: 1.0 },
                u_inflate: { value: 0.0 },
                u_scale: { value: 1.0 },
                u_windSpeed: { value: 1.0 },
                u_windTime: { value: 0.0 },
            },
            vertexShader: vert,
            shadowSide: FrontSide
        });

        const trunk = obj.scene.children.filter(c => c.name === "trunk")?.[0].clone() as Mesh;
        const foliage = obj.scene.children.filter(c => c.name === "foliage")?.[0].clone() as Mesh;

        trunk.receiveShadow = true;
        trunk.castShadow = true;
        trunk.material = new MeshBasicMaterial({ color: 0x733331 });

        foliage.receiveShadow = true;
        foliage.castShadow = true;
        foliage.material = foliageMaterial;
        this.foliageMaterial = foliageMaterial;

        const group = new Group();
        group.scale.setScalar(1.4);
        group.add(trunk, foliage);
        this.add(group);
    }
}

