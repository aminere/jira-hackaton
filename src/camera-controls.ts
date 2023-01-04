
import { Vector2, Vector3, MathUtils, Quaternion, Matrix4 } from "three";
import { Player } from "./player";
import { IContext } from "./types";
import { Utils } from "./utils";

interface ICameraControls {
    context: IContext;    
    target: Player;    
}

export class CameraControls {

    private readonly props: ICameraControls;

    private readonly deltaTouch = new Vector2();
    private touchPos: Vector2 | null = null;
    private previousTouch: Vector2 | null = null;

    private yaw = 0;
    private touchInside = false;

    private config = {
        distFromTarget: 2.3,        
        heightOffset: 8.3,
        lookAtOffsetY: 0,
        lookAtOffsetZ: 4.5,
        margin: 0.2
    };

    constructor(props: ICameraControls) {        
        this.props = props;
        props.context.domElement.addEventListener('pointermove', this.onPointerMove.bind(this));
        props.context.domElement.addEventListener('pointerenter', this.onPointerEnter.bind(this));
        props.context.domElement.addEventListener('pointerleave', this.onPointerLeave.bind(this));
        
        const { gui } = props.context;
        const folder = gui.addFolder("Camera");
        folder.add(this.config, 'distFromTarget', 0, 20, .1);
        folder.add(this.config, 'heightOffset', 0, 20, .1);
        folder.add(this.config, 'lookAtOffsetY', 0, 20, .1);
        folder.add(this.config, 'lookAtOffsetZ', 0, 20, .1);
        // folder.open();
    }

    public dispose() {
        this.props.context.domElement.removeEventListener('pointermove', this.onPointerMove);
        this.props.context.domElement.removeEventListener('pointerenter', this.onPointerEnter);
        this.props.context.domElement.removeEventListener('pointerleave', this.onPointerLeave);
    }

    public update(deltaTime: number) {           
        
        if (this.touchInside) {
            if (this.touchPos !== null) {
                const { margin } = this.config;
                const yawSpeed = (() => {
                    if (this.touchPos.x < margin || this.touchPos.x > 1 - margin) {
                        return 50 * -Math.sign(this.touchPos.x - margin);
                    } else {
                        // map [margin, 1 - margin] to [0, 1]
                        const a = (this.touchPos.x - margin) / (1 - margin * 2);
                        // map [0, 1] to [-1, 1]
                        const b = a * 2 - 1;
                        return -15 * b;
                    }
                })();
                this.yaw += deltaTime * yawSpeed;                
            }
        }

        this.deltaTouch.set(0, 0);

        const { context, target } = this.props;
        const { camera } = context;

        const rotation = new Quaternion().setFromAxisAngle(target.up, this.yaw * MathUtils.DEG2RAD);
        const newForward = target.forward.clone().applyQuaternion(rotation).normalize();

        const { distFromTarget, heightOffset, lookAtOffsetY, lookAtOffsetZ } = this.config;
        camera.position.copy(target.root.position)
            .addScaledVector(target.up, heightOffset)
            .addScaledVector(newForward, -distFromTarget);

        const lookTarget = new Vector3()
            .copy(target.root.position)
            .addScaledVector(target.up, lookAtOffsetY)
            .addScaledVector(newForward, lookAtOffsetZ)
            .sub(camera.position)
            .normalize();
        const lookAtMatrix = new Matrix4().lookAt(new Vector3(), lookTarget, target.up);
        camera.quaternion.setFromRotationMatrix(lookAtMatrix);

        // const toPlayer = new Vector3().copy(target.root.position).sub(camera.position).normalize();
        // const lookAt = new Matrix4().lookAt(new Vector3(), toPlayer, target.up);
        // camera.quaternion.setFromRotationMatrix(lookAt);
    }

    public resetYaw(oldForward: Vector3, newForward: Vector3, up: Vector3) {
        const dot = oldForward.dot(newForward);
        const angle = Math.acos(MathUtils.clamp(dot, -1, 1));
        const [newUp] = Utils.pool.vec3;
        newUp.crossVectors(oldForward, newForward);
        const direction = -Math.sign(newUp.dot(up));
        this.yaw += angle * direction * MathUtils.RAD2DEG;
    }

    private onPointerMove(event: PointerEvent) {
        if (!this.touchInside) {
            return;
        }

        if (this.touchPos === null) {
            this.touchPos = new Vector2();
        }
        this.touchPos.set(
            event.clientX / this.props.context.domElement.clientWidth, 
            event.clientY / this.props.context.domElement.clientHeight
        );
        
        if (this.previousTouch === null) {
            this.previousTouch = new Vector2(event.clientX, event.clientY);
        } else {
            this.deltaTouch.set(event.clientX, event.clientY).sub(this.previousTouch);
            this.previousTouch.set(event.clientX, event.clientY);
        }
    }

    private onPointerEnter() {
        this.touchInside = true;
    }

    private onPointerLeave() {
        this.touchInside = false;
    }
}

