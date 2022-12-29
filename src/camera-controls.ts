
import { Object3D, Vector2, Vector3, MathUtils, Quaternion } from "three";
import { Player } from "./player";

interface ICameraControls {
    camera: Object3D;
    target: Player;
    domElement: HTMLElement;
}

export class CameraControls {

    // public get forward() { return this._forward; }
    // public get right() { return this._right; }
    // public get up() { return this._up; }

    private readonly props: ICameraControls;
    
    // private _forward = new Vector3();
    // private _right = new Vector3();
    // private _up = new Vector3();

    private readonly deltaTouch = new Vector2();
    private touchPos: Vector2 | null = null;
    private previousTouch: Vector2 | null = null;    

    private yaw = 180;
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
        const distFromTarget = 10;
        const heightOffset = 0;
        const margin = 0.2;

        if (this.touchInside) {
            if (this.touchPos !== null) {
                if (this.touchPos.x < margin) {
                    this.yaw -= deltaTime * yawSpeed;
                } else if (this.touchPos.x > 1 - margin) {
                    this.yaw += deltaTime * yawSpeed;
                }
            }
        }

        this.pitch += this.deltaTouch.y * deltaTime * pitchSpeed;
        this.deltaTouch.set(0, 0);

        // this.pitch = MathUtils.clamp(this.pitch, -12, 70);
        console.log(this.yaw);

        const { camera, target } = this.props;

        const yawRotation = new Quaternion().setFromAxisAngle(target.up, -this.yaw * MathUtils.DEG2RAD);
        const pitchRotation = new Quaternion().setFromAxisAngle(target.right, -this.pitch * MathUtils.DEG2RAD);        
        camera.quaternion.multiplyQuaternions(yawRotation, pitchRotation);

        const forward = camera.getWorldDirection(new Vector3());

        camera.position
            .set(0, 0, 0)
            .addScaledVector(target.up, heightOffset)
            .addScaledVector(forward, -distFromTarget)
            .add(target.position);

        // this.props.camera.rotation.set(MathUtils.DEG2RAD * -this.pitch, MathUtils.DEG2RAD * -this.yaw, 0, "YXZ");        
        // const forward = this.props.camera.getWorldDirection(new Vector3());
        // this.props.camera.position
        //     .set(0, heightOffset, 0)
        //     .addScaledVector(forward, -distFromTarget)
        //     .add(this.props.target.position);
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

