
import { Matrix4, Vector3 } from "three";
import { Player } from "./player";

interface IPlayerControls {
    target: Player;
    domElement: HTMLElement;
    getCameraForward: () => Vector3;
    // getCameraRight: () => Vector3;
}

export class PlayerControls {

    private readonly props: IPlayerControls;

    private readonly keyStates: Map<string, boolean> = new Map<string, boolean>();

    private readonly right = new Vector3(1, 0, 0);
    // private readonly forward = new Vector3(0, 0, 1);
    // private readonly up = new Vector3(0, 1, 0);

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

        // console.log(this.props.target.getWorldDirection(new Vector3()));

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

            const { target } = this.props;

            const forward = this.props.getCameraForward();
            this.right.crossVectors(target.up, forward);
            this.velocity.set(
                forward.x * forwardMotion + this.right.x * lateralMotion,
                0,
                forward.z * forwardMotion + this.right.z * lateralMotion
            ).normalize();
            
            target.position.addScaledVector(this.velocity, deltaTime * speed);

            const lookAt = new Matrix4().lookAt(
                new Vector3(),
                new Vector3(-forward.x, 0, -forward.z).normalize(),
                target.up
            );
            target.quaternion.setFromRotationMatrix(lookAt);
        }
    }

    private onKeyDown(event: KeyboardEvent) {  
        this.keyStates.set(event.code, true);
    }

    private onKeyUp(event: KeyboardEvent) {
        this.keyStates.set(event.code, false);
    }
}


