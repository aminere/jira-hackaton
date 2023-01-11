import { Object3D } from "three";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";

export class Loaders {

    private static _objLoader: OBJLoader;
    private static _mtlLoader: MTLLoader;

    public static init() {
        Loaders._objLoader = new OBJLoader();
        Loaders._mtlLoader = new MTLLoader();
    }

    public static async load(obj: string, mtl: string) {
        const materials = await new MTLLoader().loadAsync(mtl);
        materials.preload();
        const objLoader = new OBJLoader().setMaterials(materials);
        return await objLoader.loadAsync(obj) as Object3D;
    }
}

