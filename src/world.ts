

import { Terrain } from './terrain';

import { Sky } from "three/examples/jsm/objects/Sky";
import { Water } from "three/examples/jsm/objects/Water";

import { PlayerControls } from './player-controls';
import { CameraControls } from './camera-controls';
import { Player } from './player';

import { BoxGeometry, Camera, DirectionalLight, Euler, MathUtils, Matrix4, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, Quaternion, RepeatWrapping, Scene, SphereGeometry, TextureLoader, Vector3 } from "three";
import { GUI } from "dat.gui";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

export class World extends Scene {

    private player!: Player;
    private playerControls!: PlayerControls;
    private cameraControls!: CameraControls;

    constructor(camera: Camera, domElement: HTMLElement, gui: GUI) {
        super();

        const radius = 50;        

        const player = new Player();
        this.add(player);     
        
        const light = new DirectionalLight(0xffffff, 1);
        light.target.position.set(0, -1, 0);
        light.add(light.target);
        light.position.set(0, 10, 0);
        player.add(light);

        this.cameraControls = new CameraControls({ 
            camera, 
            target: player,
            domElement 
        });
        
        camera.position.set(0, 5, -10);
        new OrbitControls(camera, domElement);

        this.playerControls = new PlayerControls({
            target: player,
            domElement,
            radius,
            getCameraForward: () => this.cameraControls.forward,
            resetYaw: () => this.cameraControls.resetYaw()
        });

        const terrain = new Terrain(
            {
                radius
            },
            gui
        ); 
        this.add(terrain);

        this.addSky(player, gui);        

        this.load();

        const root = new Object3D();
        const joint1 = new Mesh(new SphereGeometry(.5), new MeshBasicMaterial({ color: 0xff0000 }));
        const joint2 = new Mesh(new SphereGeometry(.5), new MeshBasicMaterial({ color: 0xff0000 }));
        const end = new Object3D();
        end.add(new Mesh(new SphereGeometry(.5), new MeshBasicMaterial({ color: 0xffff00 })));
        end.position.z = 2;
        joint2.position.z = 2;        
        const join1Mesh = new Mesh(new BoxGeometry(.2, .2, 2), new MeshBasicMaterial({ color: 0x00ff00 }));
        join1Mesh.position.z = 1;        
        const join2Mesh = new Mesh(new BoxGeometry(.2, .2, 2), new MeshBasicMaterial({ color: 0x00ff00 }));
        join2Mesh.position.z = 1;
        joint1.add(joint2);
        joint1.add(join1Mesh);
        joint2.add(join2Mesh);
        joint2.add(end);
        root.add(joint1);
        this.add(root);

        const target = new Mesh(new SphereGeometry(.5), new MeshBasicMaterial({ color: 0x0000ff }));        
        this.add(target);

        const debug = {
            rootAngle: 0,
            joint1Angle: 0,
            joint2Angle: 0,
            effectorX: 0,
            effectorY: 3.8,
            effectorZ: 1
        };

        target.position.z = debug.effectorZ;

        function debugChanged() {
            target.position.set(debug.effectorX, debug.effectorY, debug.effectorZ);

            // const rootLookAt = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), MathUtils.degToRad(debug.rootAngle));
            // root.quaternion.copy(rootLookAt);
            // const aRotation = new Quaternion().setFromEuler(new Euler(MathUtils.degToRad(debug.joint1Angle), 0, 0));
            // const bRotation = new Quaternion().setFromEuler(new Euler(MathUtils.degToRad(debug.joint2Angle), 0, 0));
            // joint1.quaternion.copy(aRotation);
            // joint2.quaternion.copy(bRotation);

            const localPos = new Vector3().copy(target.position).sub(root.position);
            const angle = Math.atan2(localPos.x, localPos.z);
            const rootLookAt = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), angle);
            root.quaternion.copy(rootLookAt);

            const localJointPos = root.worldToLocal(target.position.clone());
            const ab = new Vector3().subVectors(joint2.getWorldPosition(new Vector3()), joint1.getWorldPosition(new Vector3())).length();
            const bc = new Vector3().subVectors(joint2.getWorldPosition(new Vector3()), end.getWorldPosition(new Vector3())).length();
            const at = localJointPos.length();
            localJointPos.normalize();
            const angle0 = Math.atan2(localJointPos.y, localJointPos.z);
            
            const aRotation = new Quaternion();
            const bRotation = new Quaternion();
            if (at >= ab + bc) {
                // target too far, keep leg straight
                aRotation.setFromEuler(new Euler(-angle0, 0, 0));
            } else {
                // Use cosine rule to compute joint angles
                // Rotate first joint
                const t = (bc * bc - ab * ab - at * at) / (-2 * ab * at);
                const angle1 = Math.acos(MathUtils.clamp(t, -1, 1));
                aRotation.setFromEuler(new Euler(-angle0 + angle1, 0, 0));

                // Rotate second joint
                const t2 = (at * at - ab * ab - bc * bc) / (-2 * ab * bc);
                const angle2 = Math.acos(MathUtils.clamp(t2, -1, 1));
                bRotation.setFromEuler(new Euler(-Math.PI + angle2, 0, 0));
            }
            joint1.quaternion.copy(aRotation);
            joint2.quaternion.copy(bRotation);
        }

        debugChanged();
        // gui.add(debug, "rootAngle", 0, 360, 1).onChange(debugChanged);
        // gui.add(debug, "joint1Angle", 0, 360, 1).onChange(debugChanged);
        // gui.add(debug, "joint2Angle", 0, 360, 1).onChange(debugChanged);
        gui.add(debug, "effectorX", -10, 10, .1).onChange(debugChanged);
        gui.add(debug, "effectorY", -10, 10, .1).onChange(debugChanged);
        gui.add(debug, "effectorZ", -10, 10, .1).onChange(debugChanged);
    }

    private addSky(parent: Object3D, gui: GUI) {
        const sky = new Sky();
        sky.scale.setScalar(10000);
        parent.add(sky);

        const uniforms = sky.material.uniforms;

        const skySettings = {
            turbidity: 0.1,
            rayleigh: 0.194,
            mieCoefficient: 0.003,
            mieDirectionalG: 0.975            
        };

        const sunSettings = {
            elevation: 32,
            azimuth: 180
        };

        const skyFolder = gui.addFolder('Sky');

        function onSkySettingsChanged() {
            Object.entries(skySettings).forEach(([key, value]) => uniforms[key].value = value);
        }

        function onSunSettingsChanged() {
            const phi = MathUtils.degToRad(90 - sunSettings.elevation);
            const theta = MathUtils.degToRad(sunSettings.azimuth);        
            uniforms['sunPosition'].value.setFromSphericalCoords(1, phi, theta);
        }

        onSkySettingsChanged();
        onSunSettingsChanged();

        skyFolder.add(sunSettings, 'elevation', 0, 90, 0.1).onChange(onSunSettingsChanged)
        skyFolder.add(sunSettings, 'azimuth', -180, 180, 0.1).onChange(onSunSettingsChanged)
        skyFolder.add(skySettings, 'turbidity', 0.0, 20.0, 0.1).onChange(onSkySettingsChanged);
        skyFolder.add(skySettings, 'rayleigh', 0.0, 4, 0.001).onChange(onSkySettingsChanged);
        skyFolder.add(skySettings, 'mieCoefficient', 0.0, 0.1, 0.001).onChange(onSkySettingsChanged);
        skyFolder.add(skySettings, 'mieDirectionalG', 0.0, 1, 0.001).onChange(onSkySettingsChanged);
        // skyFolder.open();
    }

    private async load() {

        await new Promise(resolve => setTimeout(resolve, 1));                 

        // const waterGeometry = new PlaneGeometry(100, 100);
        // const water = new Water(
        //     waterGeometry,
        //     {
        //         textureWidth: 512,
        //         textureHeight: 512,
        //         waterNormals: new TextureLoader().load('assets/waternormals.jpg', function (texture) {

        //             texture.wrapS = texture.wrapT = RepeatWrapping;

        //         }),
        //         sunDirection: new Vector3(),
        //         sunColor: 0xffffff,
        //         waterColor: 0x001e0f,
        //         distortionScale: 3.7,
        //         fog: false
        //     }
        // );
        // water.rotation.x = - Math.PI / 2;
        // water.position.y = .3;
        // this.add( water );
        // water.material.uniforms['sunDirection'].value.copy(sun).normalize();
        
        this.dispatchEvent({ type: "ready" });
    }

    public update(deltaTime: number) {
        // this.cameraControls.update(deltaTime);
        this.playerControls.update(deltaTime);
    }
}
