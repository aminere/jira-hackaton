
import { Object3D, Vector2, Vector3, MathUtils, Quaternion, Matrix4 } from "three";
import { Player } from "./player";

interface ICameraControls {
    camera: Object3D;
    target: Player;
    domElement: HTMLElement;
}

export class CameraControls {

    public get forward() { return this._forward; }

    private readonly props: ICameraControls;

    private _forward = new Vector3();

    private readonly deltaTouch = new Vector2();
    private touchPos: Vector2 | null = null;
    private previousTouch: Vector2 | null = null;    

    private yaw = 0;
    private pitch = 0;    
    private touchInside = false;

    constructor(props: ICameraControls) {        
        this.props = props;
        props.domElement.addEventListener('pointermove', this.onPointerMove.bind(this));
        props.domElement.addEventListener('pointerenter', this.onPointerEnter.bind(this));
        props.domElement.addEventListener('pointerleave', this.onPointerLeave.bind(this));
    }

    public dispose() {
        this.props.domElement.removeEventListener('pointermove', this.onPointerMove);
        this.props.domElement.removeEventListener('pointerenter', this.onPointerEnter);
        this.props.domElement.removeEventListener('pointerleave', this.onPointerLeave);
    }

    public update(deltaTime: number) {
        const yawSpeed = 125;
        const pitchSpeed = 10;
        const distFromTarget = 3;
        const heightOffset = 4;
        const margin = 0.2;

        if (this.touchInside) {
            if (this.touchPos !== null) {
                if (this.touchPos.x < margin) {
                    this.yaw += deltaTime * yawSpeed;
                } else if (this.touchPos.x > 1 - margin) {
                    this.yaw -= deltaTime * yawSpeed;
                }
            }
        }

        this.pitch += this.deltaTouch.y * deltaTime * pitchSpeed;
        this.deltaTouch.set(0, 0);

        this.pitch = MathUtils.clamp(this.pitch, -12, 70);

        const { camera, target } = this.props;

        const yawRotation = new Quaternion().setFromAxisAngle(target.up, this.yaw * MathUtils.DEG2RAD);
        const pitchRotation = new Quaternion().setFromAxisAngle(target.right, this.pitch * MathUtils.DEG2RAD);        
        const rotation = new Quaternion().multiplyQuaternions(yawRotation, pitchRotation);
        const newForward = new Vector3().copy(target.forward).applyQuaternion(rotation).normalize();

        camera.position.set(0, 0, 0)
            .addScaledVector(target.up, heightOffset)
            .addScaledVector(newForward, -distFromTarget)
            .add(target.position);

        const toPlayer = new Vector3().copy(target.position).sub(camera.position).normalize();
        const lookAt = new Matrix4().lookAt(new Vector3(), toPlayer, target.up);
        camera.quaternion.setFromRotationMatrix(lookAt);

        this._forward.copy(target.forward).applyQuaternion(yawRotation).normalize();
    }

    public resetYaw() {
        this.yaw = 0;
    }

    private onPointerMove(event: PointerEvent) {
        if (!this.touchInside) {
            return;
        }

        if (this.touchPos === null) {
            this.touchPos = new Vector2();
        }
        this.touchPos.set(
            event.clientX / this.props.domElement.clientWidth, 
            event.clientY / this.props.domElement.clientHeight
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

