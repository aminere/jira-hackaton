
import { GUI } from "dat.gui";
import { Object3D, MeshBasicMaterial, Mesh, BoxGeometry, SphereGeometry, Vector3 } from "three";
import { Arm } from "./arm";
import { IContext } from "./types";

export class Player extends Object3D {

    public readonly right = new Vector3(1, 0, 0);
    public readonly forward = new Vector3(0, 0, 1);
    public get root() { return this._root; }

    private arms: [Arm, Object3D][] = [];
    private _root = new Object3D();

    constructor(context: IContext, radius: number) {
        super();
        const geometry = new BoxGeometry(1, 1, 1);
        const material = new MeshBasicMaterial({ color: 0x0000ff });
        const mesh = new Mesh(geometry, material);
        mesh.scale.z = 2;
        
        const head = new SphereGeometry(.5);
        const headMaterial = new MeshBasicMaterial({ color: 0x00ff00 });
        const headMesh = new Mesh(head, headMaterial);
        headMesh.position.z = 1;

        this._root = new Object3D();
        this._root.position.set(0, radius, 0);
        this.add(this._root);

        this._root.add(mesh);
        this._root.add(headMesh);
        
        this.createArm(new Vector3(0.6, 0, 0.5), new Vector3(1.5, 0, 2)); // front left arm
        this.createArm(new Vector3(-0.6, 0, 0.5), new Vector3(-1.5, 0, 2)); // front right arm
        this.createArm(new Vector3(0.6, 0, -0.5), new Vector3(1.5, 0, -2)); // back left arm
        this.createArm(new Vector3(-0.6, 0, -0.5), new Vector3(-1.5, 0, -2)); // back right arm
    }

    private createArm(position: Vector3, effectorPosition: Vector3) {
        const effector = new Mesh(new SphereGeometry(.3), new MeshBasicMaterial({ color: 0x0000ff }));
        this.add(effector); // not added to the root, so it's not affected by player motion
        effector.position.copy(effectorPosition).add(this.root.position);
        const arm = new Arm(effector, 1.5);
        arm.position.copy(position);
        this._root.add(arm);
        this.arms.push([arm, effector]);
    }

    update() {
        this.arms.forEach(([arm, _]) => arm.update());        
    }
}
