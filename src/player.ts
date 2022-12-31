
import { Object3D, MeshBasicMaterial, Mesh, BoxGeometry, SphereGeometry, Vector3, Matrix4 } from "three";
import { Arm } from "./arm";
import { IContext } from "./types";

interface IArmAnimation {
    sourcePos: Vector3;
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
    private armAnimations!: IArmAnimation[];
    private armCouples = [[0, 3], [1, 2]]; // couples of arms to animate together
    private currentArmCouple = 0;
    private isAnimating = false;

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

        this.armAnimations = this.arms.map(arm => ({ sourcePos: new Vector3(), arm }));

        props.context.domElement.addEventListener('keydown', this.onKeyDown.bind(this));
        props.context.domElement.addEventListener('keyup', this.onKeyUp.bind(this)); 
    }

    public dispose() {
        this.props.context.domElement.removeEventListener('keydown', this.onKeyDown);
        this.props.context.domElement.removeEventListener('keyup', this.onKeyUp);
    }

    private createArm(position: Vector3, effectorPosition: Vector3): IArm {
        const armLength = 1.5;

        const effector = new Mesh(new SphereGeometry(.2), new MeshBasicMaterial({ color: 0x0000ff }));
        effector.position.copy(effectorPosition).add(this.root.position);
        this.add(effector); // not added to the root, so it's not affected by player motion
        
        const arm = new Arm(effector, armLength);
        arm.position.copy(position);
        this._root.add(arm);

        const referenceEffector = new Object3D();
        // referenceEffector.add(new Mesh(new SphereGeometry(.3), new MeshBasicMaterial({ color: 0xff0000 })));
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

            // walk cycle
            const distance = previousPos.distanceTo(this.root.position);
            this.stepDistance += distance;
            const stepSize = 1.6;
            let stepProgress = this.stepDistance / stepSize;
            if (stepProgress > 1) {
                this.stepDistance = this.stepDistance - stepSize;
                stepProgress = stepProgress - 1;
                const [arm1, arm2] = this.armCouples[this.currentArmCouple];
                this.updateAnimation(this.armAnimations[arm1], 1);
                this.updateAnimation(this.armAnimations[arm2], 1);
                this.currentArmCouple = (this.currentArmCouple + 1) % this.armCouples.length;
                this.isAnimating = false;
            }

            const [arm1, arm2] = this.armCouples[this.currentArmCouple];
            if (!this.isAnimating) {
                this.armAnimations[arm1].sourcePos = this.arms[arm1].effector.getWorldPosition(new Vector3());                    
                this.armAnimations[arm2].sourcePos = this.arms[arm2].effector.getWorldPosition(new Vector3());
                this.isAnimating = true;
            }
            this.updateAnimation(this.armAnimations[arm1], stepProgress);
            this.updateAnimation(this.armAnimations[arm2], stepProgress);
        }

        this.arms.forEach(({ arm }) => arm.update());
    }

    private updateAnimation(animation: IArmAnimation, progress: number) {
        const { arm } = animation;
        const targetPos = arm.referenceEffector
            .getWorldPosition(new Vector3())
            .addScaledVector(this.velocity, 1);
        arm.effector.position.lerpVectors(animation.sourcePos, targetPos, progress);

        const stepHeight = .3;
        arm.effector.position.addScaledVector(this.up, Math.sin(progress * Math.PI) * stepHeight);
    }

    private onKeyDown(event: KeyboardEvent) {  
        this.keyStates.set(event.code, true);
    }

    private onKeyUp(event: KeyboardEvent) {
        this.keyStates.set(event.code, false);
    }
}
