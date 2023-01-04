import { BoxGeometry, Euler, MathUtils, Mesh, MeshBasicMaterial, Object3D, Quaternion, SphereGeometry, Vector3 } from "three";
import { Utils } from "./utils";

export class Arm extends Object3D {

    private root: Object3D;
    private joints: Object3D[] = [];
    private effector: Object3D;
    private join1Mesh: Object3D;
    private join2Mesh: Object3D;

    constructor(effector: Object3D, bone1Length: number, bone2Length: number) {
        super();
        this.root = new Object3D();
        const joint1 = new Mesh(new SphereGeometry(.1), new MeshBasicMaterial({ color: 0x0000ff }));
        const joint2 = new Mesh(new SphereGeometry(.1), new MeshBasicMaterial({ color: 0x0000ff }));
        const end = new Object3D();
        const join1Mesh = new Mesh(new BoxGeometry(.2, .2, 1), new MeshBasicMaterial({ color: 0x00ff00 }));
        this.join1Mesh = join1Mesh;
        const join2Mesh = new Mesh(new BoxGeometry(.2, .2, 1), new MeshBasicMaterial({ color: 0x00ff00 }));
        this.join2Mesh = join2Mesh;
        end.add(new Mesh(new SphereGeometry(.2), new MeshBasicMaterial({ color: 0xff0000 })));
        joint2.add(end);
        joint2.add(join2Mesh);
        joint1.add(joint2);
        joint1.add(join1Mesh);
        this.root.add(joint1);
        this.add(this.root);
        this.joints = [joint1, joint2, end];
        this.effector = effector;
        this.setBoneLengths(bone1Length, bone2Length);
    }

    public setBoneLengths(bone1Length: number, bone2Length: number) {
        const [_, joint2, end] = this.joints;
        end.position.z = bone2Length;
        joint2.position.z = bone1Length;
        this.join1Mesh.scale.z = bone1Length;
        this.join1Mesh.position.z = bone1Length / 2;
        this.join2Mesh.scale.z = bone2Length;
        this.join2Mesh.position.z = bone2Length / 2;    
    }

    public update() {
        const [joint1Pos, joint2Pos, endPos, effectorPos] = Utils.pool.vec3;
        const [joint1, joint2, end] = this.joints;
        const localPos = this.worldToLocal(this.effector.getWorldPosition(effectorPos));
        const angle = Math.atan2(localPos.x, localPos.z);
        this.root.rotation.y = angle;

        const localJointPos = this.root.worldToLocal(this.effector.getWorldPosition(effectorPos));
        joint1.getWorldPosition(joint1Pos);
        joint2.getWorldPosition(joint2Pos);
        end.getWorldPosition(endPos);
        const ab = joint1Pos.distanceTo(joint2Pos);
        const bc = joint2Pos.distanceTo(endPos);
        const at = localJointPos.length();
        localJointPos.divideScalar(at); // normalize
        const angle0 = Math.atan2(localJointPos.y, localJointPos.z);

        const [aRotation, bRotation] = Utils.pool.quat;
        aRotation.identity();
        bRotation.identity();
        const solveDirection = -1;
        const [euler] = Utils.pool.euler;
        if (at >= ab + bc) {
            // target too far, keep leg             
            aRotation.setFromEuler(euler.set(-angle0, 0, 0));
        } else {
            // Use cosine rule to compute joint angles
            // Rotate first joint
            const t = (bc * bc - ab * ab - at * at) / (-2 * ab * at);
            const angle1 = Math.acos(MathUtils.clamp(t, -1, 1));
            aRotation.setFromEuler(euler.set(-angle0 + angle1 * solveDirection, 0, 0));

            // Rotate second joint
            const t2 = (at * at - ab * ab - bc * bc) / (-2 * ab * bc);
            const angle2 = Math.acos(MathUtils.clamp(t2, -1, 1));
            bRotation.setFromEuler(euler.set((-Math.PI + angle2) * solveDirection, 0, 0));
        }
        joint1.quaternion.copy(aRotation);
        joint2.quaternion.copy(bRotation);
    }
}

