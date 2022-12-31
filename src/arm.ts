import { BoxGeometry, Euler, MathUtils, Mesh, MeshBasicMaterial, Object3D, Quaternion, SphereGeometry, Vector3 } from "three";

export class Arm extends Object3D {

    private root: Object3D;
    private joints: Object3D[] = [];
    private effector: Object3D;

    constructor(effector: Object3D, boneLength: number) {
        super();
        this.root = new Object3D();
        const joint1 = new Mesh(new SphereGeometry(.1), new MeshBasicMaterial({ color: 0x0000ff }));
        const joint2 = new Mesh(new SphereGeometry(.1), new MeshBasicMaterial({ color: 0x0000ff }));
        const end = new Object3D();        
        end.position.z = boneLength;
        joint2.position.z = boneLength;
        const join1Mesh = new Mesh(new BoxGeometry(.2, .2, boneLength), new MeshBasicMaterial({ color: 0x00ff00 }));
        join1Mesh.position.z = boneLength / 2;
        const join2Mesh = new Mesh(new BoxGeometry(.2, .2, boneLength), new MeshBasicMaterial({ color: 0x00ff00 }));
        join2Mesh.position.z = boneLength / 2;
        // end.add(new Mesh(new SphereGeometry(.2), new MeshBasicMaterial({ color: 0xff0000 })));
        joint2.add(end);
        joint2.add(join2Mesh);
        joint1.add(joint2);
        joint1.add(join1Mesh);
        this.root.add(joint1);
        this.add(this.root);
        this.joints = [joint1, joint2, end];
        this.effector = effector;
    }

    public update() {
        const [joint1, joint2, end] = this.joints;
        const localPos = this.worldToLocal(this.effector.getWorldPosition(new Vector3()));
        const angle = Math.atan2(localPos.x, localPos.z);
        // const rootLookAt = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), angle);
        // this.root.quaternion.copy(rootLookAt);
        this.root.rotation.y = angle;

        const localJointPos = this.root.worldToLocal(this.effector.getWorldPosition(new Vector3()));
        const ab = new Vector3().subVectors(joint2.getWorldPosition(new Vector3()), joint1.getWorldPosition(new Vector3())).length();
        const bc = new Vector3().subVectors(joint2.getWorldPosition(new Vector3()), end.getWorldPosition(new Vector3())).length();
        const at = localJointPos.length();
        localJointPos.normalize();
        const angle0 = Math.atan2(localJointPos.y, localJointPos.z);

        const aRotation = new Quaternion();
        const bRotation = new Quaternion();
        const solveDirection = -1;
        if (at >= ab + bc) {
            // target too far, keep leg straight
            aRotation.setFromEuler(new Euler(-angle0, 0, 0));
        } else {
            // Use cosine rule to compute joint angles
            // Rotate first joint
            const t = (bc * bc - ab * ab - at * at) / (-2 * ab * at);
            const angle1 = Math.acos(MathUtils.clamp(t, -1, 1));
            aRotation.setFromEuler(new Euler(-angle0 + angle1 * solveDirection, 0, 0));

            // Rotate second joint
            const t2 = (at * at - ab * ab - bc * bc) / (-2 * ab * bc);
            const angle2 = Math.acos(MathUtils.clamp(t2, -1, 1));
            bRotation.setFromEuler(new Euler((-Math.PI + angle2) * solveDirection, 0, 0));
        }
        joint1.quaternion.copy(aRotation);
        joint2.quaternion.copy(bRotation);
    }
}

