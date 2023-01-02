
import { Object3D, MeshBasicMaterial, Mesh, BoxGeometry, SphereGeometry, Vector3, Matrix4, MathUtils, Ray } from "three";
import { Arm } from "./arm";
import { Collision } from "./collision";
import { IContext } from "./types";

interface IArm {
    arm: Arm;
    effector: Object3D;
    referenceEffector: Object3D;
    animationSource: Vector3;
}

interface IPlayer {
    position: Vector3;
    resetCameraYaw: (oldForward: Vector3, newForward: Vector3, up: Vector3) => void;
    context: IContext;
}

export class Player extends Object3D {

    public readonly right = new Vector3(1, 0, 0);
    public readonly forward = new Vector3(0, 0, 1);
    public get root() { return this._root; }

    private static config = {
        speed: 4,
        armAnimationSpeed: {
            ground: 4,
            air: 2.5
        },
        stepLength: .7,
        stepHeight: .4,
        armBoneLengths: [.8, 1],        
        armRanges: [new Vector3(0.6, .3, .5), new Vector3(1.5, 0, 1.3)],
        gravity: 50,
        jumpForce: 15,
        wiggle: {
            frequency: 2,
            amplitude: .2,
            fadeOutSpeed: 6
        }
    };

    private readonly keyStates: Map<string, boolean> = new Map<string, boolean>();
    private readonly velocity = new Vector3();
    private stepDistance = 0;

    private moveToPoint: Vector3 | null = null;

    private arms!: IArm[];
    private armCouples = [[0, 3], [1, 2]]; // couples of arms to animate together
    private currentArmCouple = 0;
    private idleAnims = 0;
    private walkAnimationActive = false;
    private animationProgress = 0;
    private verticalSpeed = 0;
    private isJumping = false;
    private wiggleFactor = 0;

    private readonly _root = new Object3D(); // holds golbal position and orientation of the player
    private readonly _bodyRoot = new Object3D(); // holds local position of the body (mainly used for jumping and carrying reference arm positions)
    private readonly _body = new Object3D(); // holds local rotation of the body (mainly used for wiggling while walking)
    private readonly props: IPlayer;

    private debug: Mesh;

    constructor(props: IPlayer) {
        super();
        this.props = props;        
        
        this._root.position.copy(props.position);
        this.add(this._root);
        
        this._root.add(this._bodyRoot);

        const geometry = new BoxGeometry(1, 1, 1);
        const material = new MeshBasicMaterial({ color: 0x0000ff });
        const mesh = new Mesh(geometry, material);
        mesh.scale.z = 2;        
        const head = new SphereGeometry(.5);
        const headMaterial = new MeshBasicMaterial({ color: 0x00ff00 });
        const headMesh = new Mesh(head, headMaterial);
        headMesh.position.z = 1;
        this._body.add(mesh);
        this._body.add(headMesh);
        this._bodyRoot.add(this._body);
        
        const [armRange1, armRange2] = Player.config.armRanges;
        this.arms = [
            this.createArm(new Vector3(armRange1.x, armRange1.y, armRange1.z), new Vector3(armRange2.x, 0, armRange2.z)),
            this.createArm(new Vector3(-armRange1.x, armRange1.y, armRange1.z), new Vector3(-armRange2.x, 0, armRange2.z)),
            this.createArm(new Vector3(armRange1.x, armRange1.y, -armRange1.z), new Vector3(armRange2.x, 0, -armRange2.z)),
            this.createArm(new Vector3(-armRange1.x, armRange1.y, -armRange1.z), new Vector3(-armRange2.x, 0, -armRange2.z))
        ];

        props.context.domElement.addEventListener('keydown', this.onKeyDown.bind(this));
        props.context.domElement.addEventListener('keyup', this.onKeyUp.bind(this));
        props.context.domElement.addEventListener('contextmenu', this.onRightClick.bind(this));

        this.debug = new Mesh(new SphereGeometry(.5), new MeshBasicMaterial({ color: 0xff0000 }));
        this.debug.position.copy(props.position);
        this.add(this.debug);
    }

    public dispose() {
        this.props.context.domElement.removeEventListener('keydown', this.onKeyDown);
        this.props.context.domElement.removeEventListener('keyup', this.onKeyUp);
        this.props.context.domElement.removeEventListener('contextmenu', this.onRightClick);
    }

    private createArm(position: Vector3, effectorPosition: Vector3): IArm {
        const effector = new Object3D(); // new Mesh(new SphereGeometry(.2), new MeshBasicMaterial({ color: 0x0000ff }));
        effector.position.copy(effectorPosition).add(this._root.position);
        this.add(effector); // not added to the root, so it's not affected by player motion
        
        const [bone1Length, bone2Length] = Player.config.armBoneLengths;
        const arm = new Arm(effector, bone1Length, bone2Length);
        arm.position.copy(position);
        this._body.add(arm);

        const referenceEffector = new Object3D();
        // referenceEffector.add(new Mesh(new SphereGeometry(.3), new MeshBasicMaterial({ color: 0x00ff00 })));
        referenceEffector.position.copy(effectorPosition);
        this._bodyRoot.add(referenceEffector);

        return { 
            arm, 
            effector, 
            referenceEffector,
            animationSource: new Vector3()
        };
    }

    public update(deltaTime: number) {        
        const previousPos = this.root.position.clone();        

        if (this.moveToPoint) {
            const { speed } = Player.config;

            this.right.crossVectors(this.up, this.moveToPoint.clone().normalize());
            const oldForward = this.forward.clone();
            this.forward.crossVectors(this.right, this.up).normalize();            
            // recalculate yaw so as camera remains in the same spot!
            this.props.resetCameraYaw(oldForward, this.forward, this.up);
            
            this.velocity.copy(this.forward);

            const newUp = new Vector3()
                .copy(this.root.position)
                .addScaledVector(this.velocity, deltaTime * speed)
                .normalize();
            
            const newForward = new Vector3().crossVectors(this.right, newUp).normalize();
            this.forward.copy(newForward);
            this.up.copy(newUp);

            // update position
            const newPosition = new Vector3().addScaledVector(newUp, this.props.position.y);
            // If we are going to move past the target, stop at the target and end the motion 
            const toTarget1 = this.moveToPoint.clone().sub(this.root.position).normalize();
            const toTarget2 = this.moveToPoint.clone().sub(newPosition).normalize();
            if (toTarget1.dot(toTarget2) < 0) {
                this.root.position.copy(this.moveToPoint);
                this.moveToPoint = null;
            } else {
                this.root.position.copy(newPosition);
            }         

            // update rotation
            const lookAt = new Matrix4().lookAt(new Vector3(), this.forward.clone().multiplyScalar(-1), this.up);
            this.root.quaternion.setFromRotationMatrix(lookAt);

            // walk cycle
            if (!this.isJumping) {
                const distance = previousPos.distanceTo(this.root.position);
                this.stepDistance += distance;
                const { stepLength } = Player.config;
                let stepProgress = this.stepDistance / stepLength;
                if (stepProgress > 1) {
                    this.stepDistance = this.stepDistance - stepLength;
                    stepProgress = stepProgress - 1;
                    const [arm1, arm2] = this.armCouples[this.currentArmCouple];
                    this.updateAnimation(arm1, 1, 0);
                    this.updateAnimation(arm2, 1, 0);
                    this.animationProgress = 1;
                    this.walkAnimationActive = false;
                    this.currentArmCouple = (this.currentArmCouple + 1) % this.armCouples.length;
                }

                const [arm1, arm2] = this.armCouples[this.currentArmCouple];
                if (!this.walkAnimationActive) {
                    this.arms[arm1].effector.getWorldPosition(this.arms[arm1].animationSource);
                    this.arms[arm2].effector.getWorldPosition(this.arms[arm2].animationSource);
                    this.walkAnimationActive = true;
                }
                this.updateAnimation(arm1, stepProgress, 1);
                this.updateAnimation(arm2, stepProgress, 1);
                this.animationProgress = stepProgress;
                this.idleAnims = 2;

                // wiggle animation
                const { wiggle } = Player.config;
                this._body.rotation.z = Math.sin(Math.PI * 2 * this.wiggleFactor) * wiggle.amplitude;
                this.wiggleFactor += deltaTime * wiggle.frequency;
            }

        } else {
            if (this.idleAnims > 0) {
                const { armAnimationSpeed } = Player.config;
                const [arm1, arm2] = this.armCouples[this.currentArmCouple];  
                let done = false;
                this.animationProgress += deltaTime * armAnimationSpeed.ground;
                if (this.animationProgress > 1) {
                    this.animationProgress = 1;
                    done = true;
                }
                this.updateAnimation(arm1, this.animationProgress, 0);
                this.updateAnimation(arm2, this.animationProgress, 0);
                if (done) {
                    this.idleAnims--;
                    if (this.idleAnims > 0) {
                        this.animationProgress = 0;
                        this.currentArmCouple = (this.currentArmCouple + 1) % this.armCouples.length;
                        const [arm1, arm2] = this.armCouples[this.currentArmCouple];  
                        this.arms[arm1].effector.getWorldPosition(this.arms[arm1].animationSource);
                        this.arms[arm2].effector.getWorldPosition(this.arms[arm2].animationSource);
                    }
                }
            }

            // exit wiggle animation
            const { wiggle } = Player.config;
            this._body.rotation.z = MathUtils.lerp(this._body.rotation.z, 0, deltaTime * wiggle.fadeOutSpeed);
        }

        if (this.isJumping) {            
            this._bodyRoot.position.y += this.verticalSpeed * deltaTime;
            this.verticalSpeed -= Player.config.gravity * deltaTime;

            const { armAnimationSpeed } = Player.config;
            this.animationProgress += deltaTime * armAnimationSpeed.air;
            this.animationProgress = Math.min(this.animationProgress, 1);
            this.arms.forEach((_, i) => this.updateAnimation(i, this.animationProgress, 0));

            if (this._bodyRoot.position.y < 0) {
                this._bodyRoot.position.y = 0;
                this.isJumping = false;
                this.idleAnims = 3;
            }
        }

        this.arms.forEach(({ arm }) => arm.update());
    }

    private updateAnimation(index: number, progress: number, anticipation: number) {        
        const { animationSource, effector, referenceEffector } = this.arms[index];
        const targetPos = referenceEffector
            .getWorldPosition(new Vector3())
            .addScaledVector(this.velocity, anticipation);
        effector.position.lerpVectors(animationSource, targetPos, progress);

        if (!this.isJumping) {
            const { stepHeight } = Player.config;
            effector.position.addScaledVector(this.up, Math.sin(progress * Math.PI) * stepHeight);
        }
    }

    private onKeyDown(event: KeyboardEvent) {  
        this.keyStates.set(event.code, true);
    }

    private onKeyUp(event: KeyboardEvent) {
        this.keyStates.set(event.code, false);
    }

    private onRightClick(event: MouseEvent) {
        event.stopPropagation();
        event.preventDefault();

        const rayOrigin = new Vector3().setFromMatrixPosition(this.props.context.camera.matrixWorld);
        const screenRay = new Ray(
            rayOrigin,
            new Vector3(
                (event.clientX / window.innerWidth) * 2 - 1,
                -(event.clientY / window.innerHeight) * 2 + 1,
                0
            ).unproject(this.props.context.camera).sub(rayOrigin).normalize()
        );

        const raycast = Collision.rayCastOnSphere(screenRay, new Vector3(), this.props.position.y);
        if (raycast) {            
            this.moveToPoint = raycast.intersection1.clone();
            this.debug.position.copy(this.moveToPoint);
        }
    }
}
