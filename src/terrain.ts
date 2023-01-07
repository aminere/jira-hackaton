
import * as THREE from 'three';
import { BoxGeometry, CubeTexture, Mesh, MeshStandardMaterial, Object3D, SphereGeometry, Vector2 } from 'three';
import { PerlinNoise } from './perlin-noise';

interface ITerrainOptions {
    radius: number;
}

export class Terrain extends THREE.Mesh {
    public constructor(props: ITerrainOptions) {

        const makeTexture = (face: number) => {
            console.log(face);
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

        material.userData.cellsMap = {
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
        };

        const sphere = new THREE.IcosahedronGeometry(props.radius, 20);        

        const _vertices = sphere.getAttribute('position');
        const colors = new Float32Array(_vertices.count * 3);

        // const test = new Float32Array(_vertices.count);
        for (let i = 0; i < _vertices.count; i++) { 
            const noise = PerlinNoise.get2DNoise(i, i, 20, 8); 
            colors[i * 3 + 0] = .5;
            colors[i * 3 + 1] = noise; // Math.max(Math.random(), 0.5);
            colors[i * 3 + 2] = 0;
            // test[i] = 1;
        }
        sphere.setAttribute("color", new THREE.BufferAttribute(colors, 3));        
        
        // sphere.setAttribute("test", new THREE.BufferAttribute(test, 1));        
        super(sphere, material);

        const cellMaterial = new MeshStandardMaterial({ color: 0xff0000, transparent: true, opacity: .5 });        
        const cells: Object3D[][] = [[]];
        const cellResolution = 4;
        const cellSize = props.radius * 2 / cellResolution;
        const startPos = new Vector2(props.radius, props.radius);
        const currentPos = startPos.clone();
        for (let i = 0; i < cellResolution; i++) {
            for (let j = 0; j < cellResolution; j++) {                
                const material = cellMaterial.clone();
                const cell = new Object3D();
                cell.position.set(currentPos.x, props.radius + -.1 + Math.random() * .2, currentPos.y);
                cells[0].push(cell);
                this.add(cell);
                const box = new Mesh(new BoxGeometry(cellSize, .1, cellSize), material);
                box.position.set(-cellSize / 2, 0, -cellSize / 2);
                cell.add(box);
                cell.add(new Mesh(new SphereGeometry(1), material));
                currentPos.x -= cellSize;
            }
            currentPos.x = startPos.x;
            currentPos.y -= cellSize;
        }

        startPos.set(-props.radius, props.radius);
        currentPos.copy(startPos);
        cells.push([]);
        for (let i = 0; i < cellResolution; i++) {
            for (let j = 0; j < cellResolution; j++) {                
                const material = cellMaterial.clone();
                const cell = new Object3D();                                
                cell.position.set(-props.radius, currentPos.y, currentPos.x);
                cells[1].push(cell);
                this.add(cell);
                const box = new Mesh(new BoxGeometry(cellSize, .1, cellSize), material);                
                box.rotateZ(Math.PI / 2);
                box.position.set(0, -cellSize / 2, cellSize / 2);
                cell.add(box);
                cell.add(new Mesh(new SphereGeometry(1), material));
                currentPos.x += cellSize;
            }
            currentPos.x = startPos.x;
            currentPos.y -= cellSize;
        }        
    }
    
}

