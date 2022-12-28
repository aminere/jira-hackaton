
import { Matrix4, Object3D, Vector3 } from "three";

interface IPlayerControls {
    target: Object3D;
    domElement: HTMLElement;
    getCameraForward: () => Vector3;
}

export class PlayerControls {

    private readonly props: IPlayerControls;

    private readonly keyStates: Map<string, boolean> = new Map<string, boolean>();

    private readonly right = new Vector3();
    private readonly velocity = new Vector3();

    constructor(props: IPlayerControls) {
        this.props = props;
        props.domElement.addEventListener('keydown', this.onKeyDown.bind(this));
        props.domElement.addEventListener('keyup', this.onKeyUp.bind(this));        
    }

    public dispose() {
        this.props.domElement.removeEventListener('keydown', this.onKeyDown);
        this.props.domElement.removeEventListener('keyup', this.onKeyUp);
    }
    
    public update(deltaTime: number) {

        let motion = false;
        let forwardMotion = 0;
        let lateralMotion = 0;
        if (this.keyStates.get("KeyW")) {
            forwardMotion = 1;
            motion = true;
        } else if (this.keyStates.get("KeyS")) {
            forwardMotion = -1;
            motion = true;
        }
        if (this.keyStates.get("KeyA")) {
            lateralMotion = 1;
            motion = true;
        } else if (this.keyStates.get("KeyD")) {
            lateralMotion = -1;
            motion = true;
        }

        if (motion) {
            const speed = 10;

            const forward = this.props.getCameraForward();
            this.right.crossVectors(this.props.target.up, forward);
            this.velocity.set(
                forward.x * forwardMotion + this.right.x * lateralMotion,
                0,
                forward.z * forwardMotion + this.right.z * lateralMotion
            ).normalize();
            
            this.props.target.position.addScaledVector(this.velocity, deltaTime * speed);

            const lookAt = new Matrix4().lookAt(
                new Vector3(),
                new Vector3(forward.x, 0, forward.z).normalize(),
                this.props.target.up
            );
            this.props.target.quaternion.setFromRotationMatrix(lookAt);
        }
    }

    private onKeyDown(event: KeyboardEvent) {  
        this.keyStates.set(event.code, true);
    }

    private onKeyUp(event: KeyboardEvent) {
        this.keyStates.set(event.code, false);
    }
}


