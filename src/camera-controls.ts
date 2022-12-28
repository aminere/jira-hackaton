
import { Object3D, Vector2, Vector3, MathUtils } from "three";

interface ICameraControls {
    camera: Object3D;
    target: Object3D;
    domElement: HTMLElement;
}

export class CameraControls {

    public get forward() { return this._forward; }

    private readonly props: ICameraControls;
    
    private readonly deltaTouch = new Vector2();
    private touchPos: Vector2 | null = null;
    private previousTouch: Vector2 | null = null;

    private yaw = 0;
    private pitch = 0;
    private _forward = new Vector3();
    private touchInside = false;

    constructor(props: ICameraControls) {        
        this.props = props;
        props.domElement.addEventListener('pointermove', this.onPointerMove.bind(this));
        props.domElement.addEventListener('pointerover', this.onPointerOver.bind(this));
        props.domElement.addEventListener('pointerout', this.onPointerOut.bind(this));
    }

    public dispose() {
        this.props.domElement.removeEventListener('pointermove', this.onPointerMove);
        this.props.domElement.removeEventListener('pointerover', this.onPointerOver);
        this.props.domElement.removeEventListener('pointerout', this.onPointerOut);
    }

    public update(deltaTime: number) {
        const yawSpeed = 125;
        const pitchSpeed = 10;
        const distFromTarget = 10;
        const heightOffset = 2;
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

        this.pitch = MathUtils.clamp(this.pitch, -12, 70);
        this.props.camera.rotation.set(MathUtils.DEG2RAD * -this.pitch, MathUtils.DEG2RAD * -this.yaw, 0, "YXZ");
        this.props.camera.getWorldDirection(this._forward);

        this.props.camera.position
            .set(0, heightOffset, 0)
            .addScaledVector(this._forward, -distFromTarget)
            .add(this.props.target.position);
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

    private onPointerOver() {
        this.touchInside = true;
    }

    private onPointerOut() {
        this.touchInside = false;
    }
}

