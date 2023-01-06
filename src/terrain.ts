
import * as THREE from 'three';
import { PerlinNoise } from './perlin-noise';

interface ITerrainOptions {
    radius: number;
}

export class Terrain extends THREE.Mesh {
    public constructor(props: ITerrainOptions) {

        const bpp = 4;
        const dimension = 256;
        const size = dimension * dimension;
        const data = new Uint8Array(size * bpp);
        const color = new THREE.Color(0xffffff);
        const r = Math.floor(color.r * 255);
        const g = Math.floor(color.g * 255);
        const b = Math.floor(color.b * 255);
        const stride = dimension * bpp;
        for (let i = 0; i < dimension; i++) {
            for (let j = 0; j < dimension; j++) {
                const index = i * stride + j * bpp;
                const noise = PerlinNoise.get2DNoise(i, j, 50, 8);
                data[index + 0] = 255;
                data[index + 1] = 0;
                data[index + 2] = 0;
                data[index + 3] = 255;

                if (j > dimension / 2) {
                    data[index + 0] = 0;
                    data[index + 1] = 255;
                }
            }
        }
        const texture = new THREE.DataTexture(data, dimension, dimension, THREE.RGBAFormat);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.needsUpdate = true;

        const material = new THREE.MeshPhongMaterial({ 
            color: 0xffffff, 
            flatShading: true, 
            vertexColors: true            
        });

        material.userData.cells = {
            value: texture
        };
        
        material.onBeforeCompile = (shader) => {
            shader.uniforms.cells = material.userData.cells;

            shader.vertexShader = shader.vertexShader.replace(
                "#include <common>",
                `#include <common>                
                `
            );

            shader.fragmentShader = shader.fragmentShader.replace(
                "uniform float opacity;",
                `uniform float opacity;
                uniform sampler2D cells;
                `
            );

            const outgoingLight = "vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;"
            shader.fragmentShader = shader.fragmentShader.replace(
                outgoingLight,
                `
                ${outgoingLight}
                vec4 cell = texture2D(cells, vec2(0.504, 0.));
                outgoingLight *= cell.rgb;
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
    }
}

