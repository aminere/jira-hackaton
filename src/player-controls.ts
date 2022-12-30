
import { Matrix4, Plane, Vector3 } from "three";
import { Player } from "./player";

interface IPlayerControls {
    target: Player;
    domElement: HTMLElement;
    radius: number;
    getCameraForward: () => Vector3;
    resetYaw: () => void;
    // getCameraRight: () => Vector3;
}

export class PlayerControls {

    private readonly props: IPlayerControls;

    private readonly keyStates: Map<string, boolean> = new Map<string, boolean>();

    // private readonly right = new Vector3(1, 0, 0);
    // private readonly forward = new Vector3(0, 0, 1);
    // private readonly up = new Vector3(0, 1, 0);

    private readonly velocity = new Vector3();

    constructor(props: IPlayerControls) {
        this.props = props;
        props.domElement.addEventListener('keydown', this.onKeyDown.bind(this));
        props.domElement.addEventListener('keyup', this.onKeyUp.bind(this));
        
        props.target.position.set(0, props.radius, 0);
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

            // const forward = this.props.getCameraForward();
            // this.right.crossVectors(this.props.target.up, forward);
            // this.velocity.set(
            //     forward.x * forwardMotion + this.right.x * lateralMotion,
            //     0,
            //     forward.z * forwardMotion + this.right.z * lateralMotion
            // ).normalize();

            const { target } = this.props;

            if (motion) {
                target.forward.copy(this.props.getCameraForward());
                target.right.crossVectors(target.up, target.forward);
                this.props.resetYaw();
            }

            this.velocity
                .set(0, 0, 0)
                .addScaledVector(target.forward, forwardMotion)
                .addScaledVector(target.right, lateralMotion)
                .normalize();            
            const newPos = new Vector3().copy(this.props.target.position).addScaledVector(this.velocity, deltaTime * speed);
            newPos.normalize();

            if (forwardMotion !== 0) {
                const toCurrentPos = new Vector3().copy(this.props.target.position).normalize();
                const newRight = new Vector3().crossVectors(toCurrentPos, newPos)
                    .multiplyScalar(forwardMotion)
                    .normalize();
                const newUp = newPos;
                const newForward = new Vector3().crossVectors(newRight, newUp).normalize();
                target.forward.copy(newForward);
                target.right.copy(newRight);
                target.up.copy(newUp);
            } else {
                const newUp = newPos;
                const newRight = new Vector3().crossVectors(newUp, target.forward).normalize();
                target.right.copy(newRight);
                target.up.copy(newUp);
            }

            newPos.multiplyScalar(this.props.radius);
            this.props.target.position.copy(newPos);

            const lookAt = new Matrix4().lookAt(new Vector3(), new Vector3().copy(target.forward).multiplyScalar(-1), target.up);
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


