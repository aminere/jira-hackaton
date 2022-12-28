
import { Object3D, Vector2, Vector3, MathUtils } from "three";

export class CameraControls {

    private readonly domElement: HTMLElement;
    private readonly camera: Object3D;
    private readonly target: Object3D;

    private readonly deltaTouch = new Vector2();
    private previousTouch: Vector2 | null = null;

    private yaw = 0;
    private pitch = 0;
    private forward = new Vector3();

    constructor(camera: Object3D, target: Object3D, domElement: HTMLElement) {        
        this.camera = camera;
        this.target = target;
        this.domElement = domElement;
        this.onPointerMove = this.onPointerMove.bind(this);
        domElement.addEventListener('pointermove', this.onPointerMove);
    }

    public dispose() {
        this.domElement.removeEventListener('pointermove', this.onPointerMove);
    }

    public update(deltaTime: number) {
        const sensitivity = 0.2;
        const distFromTarget = 10;
        const heightOffset = 1;

        this.yaw += this.deltaTouch.x * sensitivity;
        this.pitch += this.deltaTouch.y * sensitivity;
        this.deltaTouch.set(0, 0);

        this.pitch = MathUtils.clamp(this.pitch, -20, 30);
        this.camera.rotation.set(MathUtils.DEG2RAD * -this.pitch, MathUtils.DEG2RAD * -this.yaw, 0, "YXZ");
        this.camera.getWorldDirection(this.forward);
        // this.camera.updateWorldMatrix(false, false);
        // const e = this.camera.matrixWorld.elements;
		// this.forward.set( -e[ 8 ], -e[ 9 ], -e[ 10 ] ).normalize();

        this.camera.position
            .set(0, heightOffset, 0)
            .addScaledVector(this.forward, -distFromTarget)
            .add(this.target.position);
    }

    private onPointerMove(event: PointerEvent) {
        if (this.previousTouch === null) {
            this.previousTouch = new Vector2(event.clientX, event.clientY);
        } else {
            this.deltaTouch.set(event.clientX, event.clientY).sub(this.previousTouch);
            this.previousTouch.set(event.clientX, event.clientY);
        }
    }
}

