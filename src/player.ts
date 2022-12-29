
import { Object3D, MeshBasicMaterial, Mesh, BoxGeometry, SphereGeometry, Vector3 } from "three";

export class Player extends Object3D {

    public readonly right = new Vector3(1, 0, 0);
    public readonly forward = new Vector3(0, 0, 1);

    constructor() {
        super();
        const geometry = new BoxGeometry(1, 1, 1);
        const material = new MeshBasicMaterial({ color: 0xff0000 });
        const mesh = new Mesh(geometry, material);
        mesh.scale.z = 2;
        
        const head = new SphereGeometry(1);
        const headMaterial = new MeshBasicMaterial({ color: 0x00ff00 });
        const headMesh = new Mesh(head, headMaterial);
        headMesh.position.z = 1;

        this.add(mesh);
        this.add(headMesh);
    }
}
