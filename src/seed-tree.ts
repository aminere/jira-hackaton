
import { MathUtils, Mesh, MeshStandardMaterial, Object3D, Ray, SphereGeometry, Vector3 } from "three";
import { Collision } from "./collision";

import { Loaders } from "./loaders";
import { IContext, ISeed } from "./types";

export class SeedTree extends Object3D {

    private readonly context: IContext;

    private readonly seeds: ISeed[] = [];

    private static config = {
        seedAngularSpeed: 30,
        radius: 5,
        seedHeight: 3
    };

    constructor(context: IContext) {
        super();
        this.context = context;
        
        this.load();
        [...Array(3)].forEach(() => this.spawnSeed());        

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
        const { seedAngularSpeed } = SeedTree.config;
        this.seeds.forEach(seed => {
            seed.angle += deltaTime * seedAngularSpeed;
            this.updateSeedPosition(seed);
        });
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
        const obj = await Loaders.load("assets/tree_small.obj", "assets/tree_small.mtl");
        obj.scale.setScalar(5);
        obj.traverse(child => child.castShadow = true);
        this.add(obj);
    }
}

