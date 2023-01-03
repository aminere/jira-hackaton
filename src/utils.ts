import { Matrix4, Object3D, Vector3 } from "three";

export class Utils {

    public static vec3 = {
        zero: new Vector3(),
        right: new Vector3(1, 0, 0),
        up: new Vector3(0, 1, 0),
        forward: new Vector3(0, 0, 1)
    }

    public static pool = {
        vec3: [...Array(16)].map(_ => new Vector3()),
        mat4: [...Array(16)].map(_ => new Matrix4())
    };

    public static castOnSphere(object: Object3D, radius: number) {
        const [right, forward, up] = Utils.pool.vec3;
        up.copy(object.position).normalize();
        object.position.copy(up).multiplyScalar(radius);
        if (Math.abs(up.dot(Utils.vec3.up)) < 1) {            
            right.crossVectors(up, Utils.vec3.up);
            forward.crossVectors(right, up).normalize();
            const [lookAt] = Utils.pool.mat4;
            lookAt.lookAt(Utils.vec3.zero, forward, up);
            object.quaternion.setFromRotationMatrix(lookAt);
        }
    }    

    public static setParent(object: Object3D, parent: Object3D) {
        object.getWorldPosition(object.position);
        parent.worldToLocal(object.position);
        parent.add(object);
    }
}

