
import * as THREE from 'three';
import { BoxGeometry, BufferAttribute, CubeTexture, Mesh, MeshStandardMaterial, Object3D, SphereGeometry, Vector2, Vector3 } from 'three';
import { PerlinNoise } from './perlin-noise';
import { Utils } from './utils';

interface ITerrainOptions {
    radius: number;
    cellResolution: number;
}

export class Terrain extends THREE.Mesh {

    private cells: Object3D[][];
    private props: ITerrainOptions;

    public getCell(face: number, x: number, y: number) {
        return this.cells[face][y * this.props.cellResolution + x];
    }

    public constructor(props: ITerrainOptions) {        
       const makeTexture = (face: number) => {
            const bpp = 4;
            const dimension = 256;
            const size = dimension * dimension;
            const data = new Uint8Array(size * bpp);
            const stride = dimension * bpp;
            for (let i = 0; i < dimension; i++) {
                for (let j = 0; j < dimension; j++) {
                    const index = i * stride + j * bpp;
                    data[index + 0] = 0;
                    data[index + 1] = 0;
                    data[index + 2] = 0;
                    data[index + 3] = 255;
                    if (face === 0) {
                        data[index + 0] = 255;
                    } else if (face === 1) {
                        data[index + 1] = 255;
                    } else if (face === 2) {
                        data[index + 2] = 255;
                    }
                }
            }
            const texture = new THREE.DataTexture(data, dimension, dimension, THREE.RGBAFormat);
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.needsUpdate = true;
            return texture;
        };
        const cubeMap = new CubeTexture([...Array(6)].map((_, i) => makeTexture(i)));
        cubeMap.needsUpdate = true;

        const material = new THREE.MeshPhongMaterial({ 
            color: 0xffffff, 
            flatShading: true, 
            vertexColors: true            
        });

        /*material.userData.cellsMap = {
            value: cubeMap
        };       
        material.onBeforeCompile = (shader) => {
            shader.uniforms.cellsMap = material.userData.cellsMap; 
            
            shader.vertexShader = shader.vertexShader.replace(
                "#include <normal_pars_vertex>",
                `#include <normal_pars_vertex>
                varying vec3 vObjectNormal;
                `
            );

            shader.vertexShader = shader.vertexShader.replace(
                "#include <beginnormal_vertex>",
                `#include <beginnormal_vertex>
                vObjectNormal = objectNormal;
                `
            );

            shader.fragmentShader = shader.fragmentShader.replace(
                "uniform float opacity;",
                `uniform float opacity;
                uniform samplerCube cellsMap;
                varying vec3 vObjectNormal;
                `
            );

            const outgoingLight = "vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;"
            shader.fragmentShader = shader.fragmentShader.replace(
                outgoingLight,
                `
                ${outgoingLight}                
                vec4 cellColor = texture(cellsMap, normalize(vObjectNormal));
                outgoingLight = cellColor.rgb;
                `
            );
        };*/

        const sphere = new THREE.IcosahedronGeometry(props.radius, 20);        

        const _vertices = sphere.getAttribute('position');
        const colors = new Float32Array(_vertices.count * 3);
        for (let i = 0; i < _vertices.count; i++) { 
            const noise = PerlinNoise.get2DNoise(i, i, 20, 8); 
            colors[i * 3 + 0] = .5;
            colors[i * 3 + 1] = noise; // Math.max(Math.random(), 0.5);
            colors[i * 3 + 2] = 0;
        }
        sphere.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        
        super(sphere, material);
        this.props = props;
        
        const cells: Object3D[][] = [
            this.createFace({
                startPos: new Vector3(props.radius, props.radius, props.radius),
                faceNormal: new Vector3(0, 1, 0),
                geometryOffset: new Vector3(-1, 0, -1),
                scanDirection: [new Vector3(-1, 0, 0), new Vector3(0, 0, -1)]
            }),
            this.createFace({
                startPos: new Vector3(-props.radius, props.radius, -props.radius),
                faceNormal: new Vector3(-1, 0, 0),
                geometryOffset: new Vector3(0, -1, 1),
                scanDirection: [new Vector3(0, 0, 1), new Vector3(0, -1, 0)],
            }),
            this.createFace({
                startPos: new Vector3(props.radius, -props.radius, -props.radius),
                faceNormal: new Vector3(0, -1, 0),
                geometryOffset: new Vector3(-1, 0, 1),
                scanDirection: [new Vector3(-1, 0, 0), new Vector3(0, 0, 1)]
            }),
            this.createFace({
                startPos: new Vector3(props.radius, props.radius, props.radius),
                faceNormal: new Vector3(1, 0, 0),
                geometryOffset: new Vector3(0, -1, -1),
                scanDirection: [new Vector3(0, 0, -1), new Vector3(0, -1, 0)],
            }),
            this.createFace({
                startPos: new Vector3(props.radius, props.radius, -props.radius),
                faceNormal: new Vector3(0, 0, -1),
                geometryOffset: new Vector3(-1, -1, 0),
                scanDirection: [new Vector3(-1, 0, 0), new Vector3(0, -1, 0)]
            }),
            this.createFace({
                startPos: new Vector3(-props.radius, props.radius, props.radius),
                faceNormal: new Vector3(0, 0, 1),
                geometryOffset: new Vector3(1, -1, 0),
                scanDirection: [new Vector3(1, 0, 0), new Vector3(0, -1, 0)]
            })
        ];
        this.cells = cells;
    }    

    private createFace(settings: {
        startPos: Vector3;
        faceNormal: Vector3; 
        geometryOffset: Vector3;
        scanDirection: [Vector3, Vector3];
    }) {
        const { startPos, faceNormal, geometryOffset, scanDirection } = settings;
        const cellMaterial = new MeshStandardMaterial({ color: 0x00ff00, transparent: true, opacity: .8, side: THREE.DoubleSide });        
        const { radius, cellResolution } = this.props;
        const cellSize = radius * 2 / cellResolution;
        const cellThickness = 1;
        const currentPos = startPos.clone();
        const [position, normal, absNormal, worldSpacePos] = Utils.pool.vec3;
        const face: Object3D[] = [];
        absNormal.set(Math.abs(faceNormal.x), Math.abs(faceNormal.y), Math.abs(faceNormal.z));
        const invFaceNormal = new Vector3(1, 1, 1).sub(absNormal);

        const [horizScan, vertScan] = scanDirection;        
        for (let i = 0; i < cellResolution; i++) {
            for (let j = 0; j < cellResolution; j++) {                
                const material = cellMaterial.clone();
                const cell = new Object3D();
                face.push(cell);
                cell.visible = false;
                this.add(cell);
                const geometry = new BoxGeometry(
                    cellSize * invFaceNormal.x + cellThickness * absNormal.x, 
                    cellSize * invFaceNormal.y + cellThickness * absNormal.y,
                    cellSize * invFaceNormal.z + cellThickness * absNormal.z
                );
                const positions = geometry.getAttribute("position");
                for (let i = 0; i < positions.count; i++) {
                    const x = positions.getX(i) + geometryOffset.x * invFaceNormal.x * cellSize / 2 + faceNormal.x * cellThickness / 2;
                    const y = positions.getY(i) + geometryOffset.y * invFaceNormal.y * cellSize / 2 + faceNormal.y * cellThickness / 2;
                    const z = positions.getZ(i) + geometryOffset.z * invFaceNormal.z * cellSize / 2 + faceNormal.z * cellThickness / 2;

                    // project on sphere while preserving height
                    normal.set(
                        x + currentPos.x * invFaceNormal.x + faceNormal.x * radius, 
                        y + currentPos.y * invFaceNormal.y + faceNormal.y * radius, 
                        z + currentPos.z * invFaceNormal.z + faceNormal.z * radius
                        ).normalize();
                    
                    const normalFactor = worldSpacePos.set(x, y, z).dot(faceNormal);
                    position.copy(normal)
                        .multiplyScalar(radius)
                        .addScaledVector(normal, normalFactor);
                        
                    positions.setX(i, position.x);
                    positions.setY(i, position.y);
                    positions.setZ(i, position.z);
                }
                positions.needsUpdate = true;
                cell.add(new Mesh(geometry, material));
                currentPos.addScaledVector(horizScan, cellSize);
            }
            currentPos.copy(startPos).addScaledVector(vertScan, cellSize * (i + 1));
        }
        return face;
    }
}

