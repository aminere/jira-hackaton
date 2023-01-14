
import * as THREE from 'three';
import { BoxGeometry, CubeTexture, Mesh, MeshBasicMaterial, Object3D, Vector3 } from 'three';
import { Cell } from './cell';
import { PerlinNoise } from './perlin-noise';
import { Utils } from './utils';

interface ITerrainOptions {
    radius: number;
    cellResolution: number;
}

export class Terrain extends THREE.Mesh {

    public faces: Object3D[];
    private props: ITerrainOptions;

    public static materials = {
        valid: new MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: .6, side: THREE.DoubleSide }),
        invalid: new MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: .6, side: THREE.DoubleSide }),
        selected: new MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: .6, side: THREE.DoubleSide })
    };    

    public getCell(coords: Vector3) {        
        const { x: face, y: x, z: y } = coords;
        return this.faces[face].children[Math.round(y) * this.props.cellResolution + Math.round(x)] as Cell;
    }

    public constructor(props: ITerrainOptions) {        
       /*const makeTexture = (face: number) => {
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
        cubeMap.needsUpdate = true;*/

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
            colors[i * 3 + 0] = .3;
            colors[i * 3 + 1] = noise; // Math.max(Math.random(), 0.5);
            colors[i * 3 + 2] = 0;
        }
        sphere.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        
        super(sphere, material);
        this.props = props;
        
        const faces: Object3D[] = [
            this.createFace(0, {
                startPos: new Vector3(props.radius, props.radius, props.radius),
                faceNormal: new Vector3(0, 1, 0),
                geometryOffsetDir: new Vector3(-1, 0, -1),
                scanDirection: [new Vector3(-1, 0, 0), new Vector3(0, 0, -1)]
            }),
            this.createFace(1, {
                startPos: new Vector3(-props.radius, props.radius, -props.radius),
                faceNormal: new Vector3(-1, 0, 0),
                geometryOffsetDir: new Vector3(0, -1, 1),
                scanDirection: [new Vector3(0, 0, 1), new Vector3(0, -1, 0)],
            }),
            this.createFace(2, {
                startPos: new Vector3(props.radius, -props.radius, -props.radius),
                faceNormal: new Vector3(0, -1, 0),
                geometryOffsetDir: new Vector3(-1, 0, 1),
                scanDirection: [new Vector3(-1, 0, 0), new Vector3(0, 0, 1)]
            }),
            this.createFace(3, {
                startPos: new Vector3(props.radius, props.radius, props.radius),
                faceNormal: new Vector3(1, 0, 0),
                geometryOffsetDir: new Vector3(0, -1, -1),
                scanDirection: [new Vector3(0, 0, -1), new Vector3(0, -1, 0)],
            }),
            this.createFace(4, {
                startPos: new Vector3(props.radius, props.radius, -props.radius),
                faceNormal: new Vector3(0, 0, -1),
                geometryOffsetDir: new Vector3(-1, -1, 0),
                scanDirection: [new Vector3(-1, 0, 0), new Vector3(0, -1, 0)]
            }),
            this.createFace(5, {
                startPos: new Vector3(-props.radius, props.radius, props.radius),
                faceNormal: new Vector3(0, 0, 1),
                geometryOffsetDir: new Vector3(1, -1, 0),
                scanDirection: [new Vector3(1, 0, 0), new Vector3(0, -1, 0)]
            })
        ];
        this.faces = faces;
    }

    private createFace(
        index: number,
        settings: {
            startPos: Vector3;
            faceNormal: Vector3;
            geometryOffsetDir: Vector3;
            scanDirection: [Vector3, Vector3];
        }) {
        const { startPos, faceNormal, geometryOffsetDir, scanDirection } = settings;
        const { radius, cellResolution } = this.props;
        const cellSize = radius * 2 / cellResolution;
        const cellThickness = .5;
        const currentPos = startPos.clone();
        const [position, normal, absNormal, worldSpacePos, geometryOffset, geometrySize, positionOffset] = Utils.pool.vec3;
        const face = new Object3D();
        this.add(face);
        absNormal.set(Math.abs(faceNormal.x), Math.abs(faceNormal.y), Math.abs(faceNormal.z));
        const invFaceNormal = new Vector3(1, 1, 1).sub(absNormal);

        geometryOffset.set(
            geometryOffsetDir.x * invFaceNormal.x * cellSize / 2 + faceNormal.x * cellThickness / 2,
            geometryOffsetDir.y * invFaceNormal.y * cellSize / 2 + faceNormal.y * cellThickness / 2,
            geometryOffsetDir.z * invFaceNormal.z * cellSize / 2 + faceNormal.z * cellThickness / 2,
        );

        const size = .9;
        geometrySize.set(
            (cellSize * invFaceNormal.x + cellThickness * absNormal.x) * size, 
            (cellSize * invFaceNormal.y + cellThickness * absNormal.y) * size,
            (cellSize * invFaceNormal.z + cellThickness * absNormal.z) * size
        );

        const [horizScan, vertScan] = scanDirection;        
        for (let i = 0; i < cellResolution; i++) {
            for (let j = 0; j < cellResolution; j++) {                
                
                const geometry = new BoxGeometry(geometrySize.x, geometrySize.y, geometrySize.z);
                const positions = geometry.getAttribute("position");
                
                positionOffset.set(
                    currentPos.x * invFaceNormal.x + faceNormal.x * radius,
                    currentPos.y * invFaceNormal.y + faceNormal.y * radius,
                    currentPos.z * invFaceNormal.z + faceNormal.z * radius
                );
                
                for (let k = 0; k < positions.count; k++) {
                    const x = positions.getX(k) + geometryOffset.x;
                    const y = positions.getY(k) + geometryOffset.y;
                    const z = positions.getZ(k) + geometryOffset.z;

                    // project on sphere while preserving height
                    normal.set(
                        x * invFaceNormal.x + positionOffset.x, 
                        y * invFaceNormal.y + positionOffset.y, 
                        z * invFaceNormal.z + positionOffset.z
                        ).normalize();
                    
                    const normalFactor = worldSpacePos.set(x, y, z).dot(faceNormal);
                    position.copy(normal)
                        .multiplyScalar(radius)
                        .addScaledVector(normal, normalFactor);
                        
                    positions.setX(k, position.x);
                    positions.setY(k, position.y);
                    positions.setZ(k, position.z);
                }

                const cellPosition = new Vector3()
                    .copy(positionOffset)
                    .addScaledVector(horizScan, cellSize / 2)
                    .addScaledVector(vertScan, cellSize / 2)
                    .normalize()
                    .multiplyScalar(radius);
                const cell = new Cell(new Mesh(geometry, Terrain.materials.valid), cellPosition, new Vector3(index, j, i));
                face.add(cell);
                cell.visible = false;
                currentPos.addScaledVector(horizScan, cellSize);                
            }
            currentPos.copy(startPos).addScaledVector(vertScan, cellSize * (i + 1));
        }
        return face;
    }
}

