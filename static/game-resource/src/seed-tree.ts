
import { MathUtils, Mesh, MeshStandardMaterial, Object3D, Ray, SphereGeometry, TextureLoader, Vector3, MeshPhongMaterial, Texture } from "three";
import { Collision } from "./collision";

import { IContext, ISeed } from "./types";

// import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader"
// import vert from './tree-vertex.glsl.js';
// import  CustomShaderMaterial from "three-custom-shader-material/vanilla";

import { Utils } from "./utils";
import { Loaders } from "./loaders";
import gsap from "gsap";

export class SeedTree extends Object3D {

    private readonly context: IContext;

    private readonly seeds: ISeed[] = [];

    // private foliageMaterial!: CustomShaderMaterial;

    private container!: HTMLElement;
    public icon!: HTMLElement;
    public panel!: HTMLElement;
    public loader!: HTMLElement;
    public refresh!: HTMLElement;
    private inFrontOfCamera = false;

    private static models: Record<string, Object3D> = {};
    private static currentModel = 0;
    private static modelCount = 5;
    private static scales = [1, 1.5, 1, 1, 2];
    private static texture: Texture;

    private static config = {
        seedAngularSpeed: 30,
        radius: 5,
        seedHeight: 3
    };

    constructor(context: IContext, container: HTMLElement, icon: HTMLElement, panel: HTMLElement, loader: HTMLElement, refresh: HTMLElement) {
        super();
        this.container = container;
        this.icon = icon;
        this.panel = panel;
        this.loader = loader;
        this.refresh = refresh;
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

    public update() {
        /*const { seedAngularSpeed } = SeedTree.config;
        this.seeds.forEach(seed => {
            seed.angle += deltaTime * seedAngularSpeed;
            this.updateSeedPosition(seed);
        });*/

        // const windTime = this.foliageMaterial?.uniforms?.u_windTime;
        // if (windTime) {
        //     windTime.value += this.foliageMaterial.uniforms.u_windSpeed.value * deltaTime;
        // }

        // update HUD
        const [worldPos, screenPos, normalizedPos] = Utils.pool.vec3;
        Utils.getScreenPosition(this.getWorldPosition(worldPos), this.context, screenPos, normalizedPos);

        const inFrontOfCamera = Math.abs(normalizedPos.x) < 0.5 && Math.abs(normalizedPos.y) < 0.5;
        // if (inFrontOfCamera !== this.inFrontOfCamera) {
            if (inFrontOfCamera) {
                if (this.loader.classList.contains('hidden')) {
                    this.icon.classList.remove('hidden');
                }
            } else {
                this.icon.classList.add('hidden');
                this.panel.classList.add('hidden');
            }
            // this.inFrontOfCamera = inFrontOfCamera;
        // }

        // if (inFrontOfCamera) {
            this.container.style.left = `calc(${screenPos.x}px - 6vmin)`;
            this.container.style.top = `calc(${screenPos.y}px - 6vmin)`;
        // }
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
    
        const currentModelIndex = SeedTree.currentModel;
        SeedTree.currentModel = (currentModelIndex + 1) % SeedTree.modelCount;
        let currentModel = SeedTree.models[currentModelIndex];        
        if (!currentModel) {
            // if (!SeedTree.texture) {
            //     SeedTree.texture = await new TextureLoader().loadAsync("assets/tree-texture.png");
            // }

            const model = await Loaders.load(`assets/Tree_0${currentModelIndex + 1}.obj`, `assets/Tree_0${currentModelIndex + 1}.mtl`);
            currentModel = model;

            model.scale.setScalar(SeedTree.scales[currentModelIndex]);
            model.traverse(c => {
                c.castShadow = true;
                // if ((c as Mesh).isMesh) {
                //     const mesh = c as Mesh;
                //     (mesh.material as MeshPhongMaterial).map = SeedTree.texture;
                // }
            });

            SeedTree.models[currentModelIndex] = model;
            // await new Promise(resolve => setTimeout(resolve, 2000));
        }        
        
        const model = currentModel.clone();
        model.position.y = 20;
        gsap.to(model.position, { y: 0, duration: .5 });

        this.add(model);
        this.loader.classList.add('hidden');
        this.icon.classList.remove('hidden');

        /*const obj = await new GLTFLoader().loadAsync("assets/tree.glb");
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
        this.add(group);*/
    }
}

