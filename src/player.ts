
import { Object3D, Mesh, BoxGeometry, SphereGeometry, Vector3, Matrix4, MathUtils, MeshStandardMaterial, MeshBasicMaterial, Clock, Color } from "three";
import { Arm } from "./arm";
import { IContext, ISeed } from "./types";
import { Utils } from "./utils";
import gsap from "gsap";

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
        armBoneLengths: [.6, 1.4],        
        armRanges: [new Vector3(0.6, .3, .5), new Vector3(1.5, 0, 1)],
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
    private isGrabbing = false;
    private waterBucket: Object3D | null = null;

    private readonly _root = new Object3D(); // holds golbal position and orientation of the player
    private readonly _bodyRoot = new Object3D(); // holds local position of the body (mainly used for jumping and carrying reference arm positions)
    private readonly _body = new Object3D(); // holds local rotation of the body (mainly used for wiggling while walking)
    private readonly props: IPlayer;

    constructor(props: IPlayer) {
        super();
        this.props = props;        
        
        this._root.position.copy(props.position);
        this.add(this._root);
        
        this._root.add(this._bodyRoot);
        
        const color = new Color(.3, .3, .3);
        const mesh = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial({ color }));
        mesh.scale.z = 2;
        const headMesh = new Mesh(new SphereGeometry(.5), new MeshStandardMaterial({ color }));
        headMesh.position.z = 1;
        this._body.add(mesh);
        this._body.add(headMesh);        
        this._bodyRoot.add(this._body);
        this._body.position.y = 1;
        
        const [armRange1, armRange2] = Player.config.armRanges;
        this.arms = [
            this.createArm(new Vector3(armRange1.x, armRange1.y, armRange1.z), new Vector3(armRange2.x, 0, armRange2.z)),
            this.createArm(new Vector3(-armRange1.x, armRange1.y, armRange1.z), new Vector3(-armRange2.x, 0, armRange2.z)),
            this.createArm(new Vector3(armRange1.x, armRange1.y, -armRange1.z), new Vector3(armRange2.x, 0, -armRange2.z)),
            this.createArm(new Vector3(-armRange1.x, armRange1.y, -armRange1.z), new Vector3(-armRange2.x, 0, -armRange2.z))
        ];

        window.addEventListener('keydown', this.onKeyDown.bind(this));
        window.addEventListener('keyup', this.onKeyUp.bind(this))

        this._body.traverse(c => c.castShadow = true);
    }

    public dispose() {
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('keyup', this.onKeyUp);
    }

    private createArm(position: Vector3, effectorPosition: Vector3): IArm {
        const effector = new Object3D(); // new Mesh(new SphereGeometry(.2), new MeshBasicMaterial({ color: 0x0000ff }));
        effector.position.copy(effectorPosition).add(this._root.position);
        this.add(effector); // not added to the root, so it's not affected by player motion
        // effector.add(new Mesh(new SphereGeometry(.2), new MeshBasicMaterial({ color: 0x0000ff })));
        
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

    public moveTo(point: Vector3) {
        if (this.isGrabbing) {
            return;
        }
        this.moveToPoint = point;
    }

    public jump() {
        if (this.isJumping) {
            return;
        }
        this.isJumping = true;
        this.verticalSpeed = Player.config.jumpForce;
        this.arms.forEach(arm => arm.effector.getWorldPosition(arm.animationSource));
        this.animationProgress = 0;
        this.idleAnims = 0;
    }

    public grabSeed(seed: ISeed) {
        const [_, rightArm] = this.arms;
        Utils.setParent(seed.object, this);

        const { armBoneLengths } = Player.config;
        const [ bone1Length, bone2Length ] = armBoneLengths;
        const bone1Factor = bone1Length / (bone1Length + bone2Length);
        const bone2Factor = bone2Length / (bone1Length + bone2Length);
        const [armPos] = Utils.pool.vec3;
        const toTarget = rightArm.arm.getWorldPosition(armPos).distanceTo(seed.object.position);
        const bone1DesiredLength = toTarget * bone1Factor;
        const bone2DesiredLength = toTarget * bone2Factor;

        const getReferenceArmPosition = (anticipation: number) => {
            const [referencePos] = Utils.pool.vec3;
            return rightArm.referenceEffector.getWorldPosition(referencePos)
                .addScaledVector(this.velocity, anticipation);
        };

        const duration = .6;        
        const clock = new Clock();
        this.isGrabbing = true;
        gsap.timeline({
            onComplete: () => {
                this.isGrabbing = false;
            }            
        })
            .to(
                rightArm.effector.position,
                {
                    x: seed.object.position.x,
                    y: seed.object.position.y,
                    z: seed.object.position.z,
                    duration,
                    onUpdate: () => {
                        const t = clock.getElapsedTime() / duration;                        
                        rightArm.arm.setBoneLengths(
                            MathUtils.lerp(bone1Length, bone1DesiredLength, t), 
                            MathUtils.lerp(bone2Length, bone2DesiredLength, t)
                        );
                    },
                    onComplete: () => {
                        Utils.setParent(seed.object, rightArm.effector);
                        clock.start();
                    }
                }
            )
            .to(
                rightArm.effector.position,
                {
                    x: () => getReferenceArmPosition(3).x,
                    y: () => getReferenceArmPosition(3).y,
                    z: () => getReferenceArmPosition(3).z,
                    duration,
                    onUpdate: () => {
                        const t = clock.getElapsedTime() / duration;
                        rightArm.arm.setBoneLengths(
                            MathUtils.lerp(bone1DesiredLength, bone1Length, t), 
                            MathUtils.lerp(bone2DesiredLength, bone2Length, t)
                        );
                    },
                    onComplete: () => {
                        const { x, y, z } = getReferenceArmPosition(1);
                        gsap.to(rightArm.effector.position, { x, y, z, duration: .2 });
                    }
                }
            );
    }

    public grabWater(waterPit: Object3D) {
        this.waterBucket = new Mesh(new SphereGeometry(.5), new MeshBasicMaterial({ color: 0x0000ff }));
        this.waterBucket.position.y = 2;
        this._body.add(this.waterBucket);
    }

    public update(deltaTime: number) {        

        if (this.keyStates.get("Space")) {
            this.jump();
        }

        if (this.moveToPoint) {
            const { speed } = Player.config;

            const [
                newUp, 
                newForward, 
                newPosition, 
                oldForward, 
                previousPos, 
                toTarget1, 
                toTarget2,
                invForward
            ] = Utils.pool.vec3;

            this.right.crossVectors(this.up, this.moveToPoint).normalize();
            oldForward.copy(this.forward);
            this.forward.crossVectors(this.right, this.up).normalize();            
            // recalculate yaw so as camera remains in the same spot!
            this.props.resetCameraYaw(oldForward, this.forward, this.up);
            
            this.velocity.copy(this.forward);
            
            newUp.copy(this.root.position)
                .addScaledVector(this.velocity, deltaTime * speed)
                .normalize();
            
            newForward.crossVectors(this.right, newUp).normalize();
            this.forward.copy(newForward);
            this.up.copy(newUp);

            // update position
            previousPos.copy(this.root.position);
            newPosition.copy(newUp).multiplyScalar(this.props.position.y);
            // If we are going to move past the target, stop at the target and end the motion 
            toTarget1.subVectors(this.moveToPoint, this.root.position).normalize();
            toTarget2.subVectors(this.moveToPoint, newPosition).normalize();
            if (toTarget1.dot(toTarget2) < 0) {
                this.root.position.copy(this.moveToPoint);
                this.moveToPoint = null;
                this.velocity.set(0, 0, 0);
            } else {
                this.root.position.copy(newPosition);
            }         

            // update rotation
            const [lookAt] = Utils.pool.mat4;
            invForward.copy(this.forward).multiplyScalar(-1);
            lookAt.lookAt(Utils.vec3.zero, invForward, this.up);
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

        if (this.isGrabbing) {
            // when grabbing, the right arm is animated differently
            const rightArmIndex = 1;
            if (index === rightArmIndex) {
                return;
            }
        }

        const { animationSource, effector, referenceEffector } = this.arms[index];
        const [targetPos] = Utils.pool.vec3;
        referenceEffector
            .getWorldPosition(targetPos)
            .addScaledVector(this.velocity, anticipation);
        effector.position.lerpVectors(animationSource, targetPos, progress);

        if (!this.isJumping) {
            // make arms elevate above ground while stepping
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
}

