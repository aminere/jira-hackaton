import { Euler, Matrix4, Object3D, Quaternion, Ray, Vector3 } from "three";
import { IContext } from "./types";

export class Utils {

    public static vec3 = {
        zero: new Vector3(),
        right: new Vector3(1, 0, 0),
        up: new Vector3(0, 1, 0),
        forward: new Vector3(0, 0, 1)
    }

    public static pool = {
        vec3: [...Array(16)].map(_ => new Vector3()),
        mat4: [...Array(16)].map(_ => new Matrix4()),
        quat: [...Array(16)].map(_ => new Quaternion()),
        euler: [...Array(16)].map(_ => new Euler()),
        ray: [...Array(16)].map(_ => new Ray())
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
        // changes the parent while preserving the world position
        object.getWorldPosition(object.position);
        parent.worldToLocal(object.position);
        parent.add(object);
    }

    public static getScreenRay(x: number, y: number, context: IContext, ray: Ray) {
        const [origin, direction] = Utils.pool.vec3;
        origin.setFromMatrixPosition(context.camera.matrixWorld);
        const { clientWidth, clientHeight } = context.domElement;
        direction.set((x / clientWidth) * 2 - 1, -(y / clientHeight) * 2 + 1, 0)
            .unproject(context.camera)
            .sub(origin)
            .normalize();
        return ray.set(origin, direction);
    }

    public static getScreenPosition(worldPos: Vector3, context: IContext, screenPos: Vector3) {
        const { clientWidth, clientHeight } = context.domElement;
        screenPos
            .copy(worldPos)
            .project(context.camera);
        screenPos.x = (screenPos.x + 1) / 2 * clientWidth;
        screenPos.y = -(screenPos.y - 1) / 2 * clientHeight;
        return screenPos;
    }

    public static getWheelDelta(delta: number, deltaMode: number) {
        if (deltaMode === 1) { // DOM_DELTA_LINE
            return delta * 32; // approximation, supposed to be the font size
        } else if (deltaMode === 2) { // DOM_DELTA_PAGE
            return delta * 32 * 10; // approximation, supposed to be the 'page' size whatever the fuck this is
        } else {
            return delta; // DOM_DELTA_PIXEL
        }
    } 
}

