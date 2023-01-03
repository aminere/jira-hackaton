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
        const materials = await Loaders._mtlLoader.loadAsync(mtl);
        materials.preload();
        Loaders._objLoader.setMaterials(materials);
        return await Loaders._objLoader.loadAsync(obj) as Object3D;
    }
}

