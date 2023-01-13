
import { MathUtils, Mesh, MeshStandardMaterial, Object3D, Ray, SphereGeometry, TextureLoader, Vector3, FrontSide, MeshBasicMaterial, Color } from "three";
import { Collision } from "./collision";

import { Loaders } from "./loaders";
import { IContext, ISeed } from "./types";

import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader"

import  CustomShaderMaterial from "three-custom-shader-material/vanilla";
import vert from './tree-vertex.glsl.js';

export class SeedTree extends Object3D {

    private readonly context: IContext;

    private readonly seeds: ISeed[] = [];

    private foliageMaterial!: CustomShaderMaterial;

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

        const windTime = this.foliageMaterial?.uniforms?.u_windTime;
        if (windTime) {
            windTime.value += this.foliageMaterial.uniforms.u_windSpeed.value * deltaTime;
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
        // const obj = await Loaders.load("assets/tree_small.obj", "assets/tree_small.mtl");
        const obj = await new GLTFLoader().loadAsync("assets/tree.glb");
        
        obj.scene.scale.setScalar(2);
        // obj.scene.position.y = 4;
        // obj.scene.traverse(child => child.castShadow = true);

        const alphaMap = await new TextureLoader().load("assets/foliage_alpha3.png");
        const foliageMaterial = new CustomShaderMaterial({
            alphaMap,
            alphaTest: 0.5,
            baseMaterial: MeshStandardMaterial,
            color: new Color('#3f6d21').convertLinearToSRGB(),
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

        this.add(trunk);
        this.add(foliage);

    //     <CustomShaderMaterial
    //     alphaMap={alphaMap}
    //     alphaTest={0.5}
    //     baseMaterial={MeshStandardMaterial}
    //     color={new Color('#3f6d21').convertLinearToSRGB()}
    //     ref={ref}
    //     uniforms={uniforms}
    //     vertexShader={vert}
    //     shadowSide={FrontSide}
    //   />

        // this.add(obj.scene);
    }
}

