
import { Object3D, Vector3 } from "three";

interface IAction {
    onPressed: () => void;
    whilePressed: (deltaTime: number) => void;
    onReleased: () => void;
}

interface IPlayerControls {
    target: Object3D;
    domElement: HTMLElement;
    getCameraForward: () => Vector3;
}

export class PlayerControls {

    private readonly props: IPlayerControls;

    private readonly actions: Map<string, IAction>;
    private readonly keyStates: Map<string, boolean> = new Map<string, boolean>();

    private readonly forward = new Vector3();
    private readonly right = new Vector3();

    constructor(props: IPlayerControls) {
        this.props = props;

        this.onKeyDown = this.onKeyDown.bind(this);
        this.onKeyUp = this.onKeyUp.bind(this);
        props.domElement.addEventListener('keydown', this.onKeyDown);
        props.domElement.addEventListener('keyup', this.onKeyUp);

        const speed = 10;

        this.actions = new Map<string, IAction>([
            [
                "KeyW",
                {
                    onPressed: () => { },
                    whilePressed: (deltaTime: number) => {                        
                        props.target.position.addScaledVector(this.forward, speed * deltaTime);
                    },
                    onReleased: () => { }
                }
            ],
            [
                "KeyA", 
                {
                    onPressed: () => { },
                    whilePressed: (deltaTime: number) => { 
                        props.target.position.addScaledVector(this.right, speed * deltaTime);
                    },
                    onReleased: () => { }
                }
            ],
            [
                "KeyS", 
                {
                    onPressed: () => { },
                    whilePressed: (deltaTime: number) => { 
                        props.target.position.addScaledVector(this.forward, -speed * deltaTime);
                    },
                    onReleased: () => { }
                }
            ],
            [
                "KeyD", 
                {
                    onPressed: () => { },
                    whilePressed: (deltaTime: number) => { 
                        props.target.position.addScaledVector(this.right, -speed * deltaTime);
                    },
                    onReleased: () => { }
                }
            ]
        ]);
    }

    public dispose() {
        this.props.domElement.removeEventListener('keydown', this.onKeyDown);
        this.props.domElement.removeEventListener('keyup', this.onKeyUp);
    }
    
    public update(deltaTime: number) {
        const { target } = this.props;
        target.getWorldDirection(this.forward);
        this.right.crossVectors(target.up, this.forward);

        this.keyStates.forEach((value, key) => {
            if (value) {
                const action = this.actions.get(key);
                if (action) {
                    action.whilePressed(deltaTime);
                }
            }
        });
    }

    private onKeyDown(event: KeyboardEvent) {  
        this.keyStates.set(event.code, true);
        const action = this.actions.get(event.code);
        if (action) {
            action.onPressed();
        }        
    }

    private onKeyUp(event: KeyboardEvent) {
        this.keyStates.set(event.code, false);
        const action = this.actions.get(event.code);
        if (action) {
            action.onReleased();
        }
    }
}


