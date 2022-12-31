
import { Object3D, MeshBasicMaterial, Mesh, BoxGeometry, SphereGeometry, Vector3, Matrix4 } from "three";
import { Arm } from "./arm";
import { IContext } from "./types";

interface IArmAnimation {
    sourcePos: Vector3;
    progress: number;
    arm: IArm;
}

interface IArm {
    arm: Arm;
    effector: Object3D;
    referenceEffector: Object3D;
}

interface IPlayer {
    position: Vector3;
    getCameraForward: () => Vector3;
    resetCameraYaw: () => void;
    changeCameraYaw: (direction: number) => void;
    context: IContext;
}

export class Player extends Object3D {

    public readonly right = new Vector3(1, 0, 0);
    public readonly forward = new Vector3(0, 0, 1);
    public get root() { return this._root; }

    private readonly keyStates: Map<string, boolean> = new Map<string, boolean>();
    private readonly velocity = new Vector3();
    private stepDistance = 0;

    private arms!: IArm[];
    private armAnimations!: (IArmAnimation | null)[];
    private armCouples = [[0, 3], [1, 2]]; // couples of arms to animate together
    private currentArmCouple = 0;

    private readonly _root = new Object3D();
    private readonly props: IPlayer;

    constructor(props: IPlayer) {
        super();
        this.props = props;
        const geometry = new BoxGeometry(1, 1, 1);
        const material = new MeshBasicMaterial({ color: 0x0000ff });
        const mesh = new Mesh(geometry, material);
        mesh.scale.z = 2;
        
        const head = new SphereGeometry(.5);
        const headMaterial = new MeshBasicMaterial({ color: 0x00ff00 });
        const headMesh = new Mesh(head, headMaterial);
        headMesh.position.z = 1;

        this._root = new Object3D();
        this._root.position.copy(props.position);
        this.add(this._root);

        this._root.add(mesh);
        this._root.add(headMesh);
        
        this.arms = [
            this.createArm(new Vector3(0.6, 0, 0.5), new Vector3(1.5, 0, 2)),
            this.createArm(new Vector3(-0.6, 0, 0.5), new Vector3(-1.5, 0, 2)),
            this.createArm(new Vector3(0.6, 0, -0.5), new Vector3(1.5, 0, -2)),
            this.createArm(new Vector3(-0.6, 0, -0.5), new Vector3(-1.5, 0, -2))
        ];

        this.armAnimations = this.arms.map(_ => null);

        props.context.domElement.addEventListener('keydown', this.onKeyDown.bind(this));
        props.context.domElement.addEventListener('keyup', this.onKeyUp.bind(this)); 
    }

    public dispose() {
        this.props.context.domElement.removeEventListener('keydown', this.onKeyDown);
        this.props.context.domElement.removeEventListener('keyup', this.onKeyUp);
    }

    private createArm(position: Vector3, effectorPosition: Vector3): IArm {
        const armLength = 1.5;

        const effector = new Mesh(new SphereGeometry(.3), new MeshBasicMaterial({ color: 0x0000ff }));
        effector.position.copy(effectorPosition).add(this.root.position);
        this.add(effector); // not added to the root, so it's not affected by player motion
        
        const arm = new Arm(effector, armLength);
        arm.position.copy(position);
        this._root.add(arm);

        const referenceEffector = new Object3D();
        referenceEffector.add(new Mesh(new SphereGeometry(.3), new MeshBasicMaterial({ color: 0xff0000 })));
        referenceEffector.position.copy(effectorPosition);
        this._root.add(referenceEffector);

        return { 
            arm, 
            effector, 
            referenceEffector            
        };
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

        this.props.changeCameraYaw(0);
        const previousPos = this.root.position.clone();

        if (motion) {
            const speed = 10;

            this.forward.copy(this.props.getCameraForward());
            this.right.crossVectors(this.up, this.forward);
            this.props.resetCameraYaw();

            if (forwardMotion !== 0) {
                this.velocity
                    .set(0, 0, 0)
                    .addScaledVector(this.forward, forwardMotion)
                    .normalize();

                if (lateralMotion !== 0) {
                    this.props.changeCameraYaw(lateralMotion);
                }
            } else {
                this.velocity
                    .set(0, 0, 0)
                    .addScaledVector(this.right, lateralMotion)
                    .normalize();
            }

            const newUp = new Vector3()
                .copy(this.root.position)
                .addScaledVector(this.velocity, deltaTime * speed)
                .normalize();

            if (forwardMotion !== 0) {
                const newForward = new Vector3().crossVectors(this.right, newUp).normalize();
                this.forward.copy(newForward);
            } else {
                const newRight = new Vector3().crossVectors(newUp, this.forward).normalize();
                this.right.copy(newRight);
            }

            this.up.copy(newUp);

            // update position            
            this.root.position.set(0, 0, 0).addScaledVector(newUp, this.props.position.y);

            // update rotation
            const lookAt = new Matrix4().lookAt(new Vector3(), new Vector3().copy(this.forward).multiplyScalar(-1), this.up);
            this.root.quaternion.setFromRotationMatrix(lookAt);
        }

        // walk cycle
        const distance = previousPos.distanceTo(this.root.position);
        this.stepDistance += distance;
        const threshold = 1.3;
        if (this.stepDistance > threshold) {
            this.stepDistance = 0;
            const [arm1, arm2] = this.armCouples[this.currentArmCouple];
            this.currentArmCouple = (this.currentArmCouple + 1) % this.armCouples.length;
            this.armAnimations[arm1] = {
                arm: this.arms[arm1],
                sourcePos: this.arms[arm1].effector.getWorldPosition(new Vector3()),
                progress: 0
            };
            this.armAnimations[arm2] = {
                arm: this.arms[arm2],
                sourcePos: this.arms[arm2].effector.getWorldPosition(new Vector3()),
                progress: 0
            };
        }

        for (let i = 0; i < this.armAnimations.length; i++) {
            const animation = this.armAnimations[i];
            if (animation) {
                const finished = this.updateAnimation(animation, deltaTime);
                if (finished) {
                    this.armAnimations[i] = null;
                }
            }
        }

        this.arms.forEach(({ arm }) => arm.update());
    }

    private updateAnimation(animation: IArmAnimation, deltaTime: number) {
        const speed = 10;
        const { arm } = animation;
        const targetPos = arm.referenceEffector.getWorldPosition(new Vector3());
        arm.effector.position.lerpVectors(animation.sourcePos, targetPos, animation.progress);
        animation.progress += deltaTime * speed;
        if (animation.progress > 1) {
            arm.effector.position.copy(targetPos);
            return true;
        }
        return false;
    }

    private onKeyDown(event: KeyboardEvent) {  
        this.keyStates.set(event.code, true);
    }

    private onKeyUp(event: KeyboardEvent) {
        this.keyStates.set(event.code, false);
    }
}
