
import { Matrix4, Vector3 } from "three";
import { Player } from "./player";
import { IContext } from "./types";

interface IPlayerControls {
    context: IContext;
    target: Player;    
    radius: number;
    getCameraForward: () => Vector3;
    resetYaw: () => void;    
    changeYaw: (direction: number) => void;
}

export class PlayerControls {

    private readonly props: IPlayerControls;

    private readonly keyStates: Map<string, boolean> = new Map<string, boolean>();

    private readonly velocity = new Vector3();

    constructor(props: IPlayerControls) {
        this.props = props;
        props.context.domElement.addEventListener('keydown', this.onKeyDown.bind(this));
        props.context.domElement.addEventListener('keyup', this.onKeyUp.bind(this));        
    }

    public dispose() {
        this.props.context.domElement.removeEventListener('keydown', this.onKeyDown);
        this.props.context.domElement.removeEventListener('keyup', this.onKeyUp);
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

        this.props.changeYaw(0);
        if (motion) {
            const speed = 10;            

            const { target } = this.props;
            target.forward.copy(this.props.getCameraForward());
            target.right.crossVectors(target.up, target.forward);
            this.props.resetYaw();

            if (forwardMotion !== 0) {
                this.velocity
                    .set(0, 0, 0)
                    .addScaledVector(target.forward, forwardMotion)
                    .normalize();

                if (lateralMotion !== 0) {
                    this.props.changeYaw(lateralMotion);
                }
            } else {
                this.velocity
                    .set(0, 0, 0)
                    .addScaledVector(target.right, lateralMotion)
                    .normalize();
            }            

            const newUp = new Vector3()
                .copy(target.root.position)
                .addScaledVector(this.velocity, deltaTime * speed)
                .normalize();

            if (forwardMotion !== 0) {
                const newForward = new Vector3().crossVectors(target.right, newUp).normalize();
                target.forward.copy(newForward);
            } else {
                const newRight = new Vector3().crossVectors(newUp, target.forward).normalize();
                target.right.copy(newRight);
            }

            target.up.copy(newUp);
            target.root.position.set(0, 0, 0).addScaledVector(newUp, this.props.radius);

            const lookAt = new Matrix4().lookAt(new Vector3(), new Vector3().copy(target.forward).multiplyScalar(-1), target.up);
            target.root.quaternion.setFromRotationMatrix(lookAt);
        }
    }

    private onKeyDown(event: KeyboardEvent) {  
        this.keyStates.set(event.code, true);
    }

    private onKeyUp(event: KeyboardEvent) {
        this.keyStates.set(event.code, false);
    }
}


