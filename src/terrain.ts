
import * as THREE from 'three';
import { PerlinNoise } from './perlin-noise';

interface ITerrainOptions {
    cellSize: number;
    resolution: number;
}

export class Terrain extends THREE.Mesh {
    public constructor(options: ITerrainOptions) {

        const geometry = new THREE.BufferGeometry()

        const vertexStride = options.resolution + 1;
        const vertexCount = Math.pow(vertexStride, 2);
        const vertices = new Float32Array(vertexCount * 3);
        const normals = new Float32Array(vertexCount * 3);      
        const colors = new Float32Array(vertexCount * 3);

        const normal = new THREE.Vector3(0, 1, 0);
        const size = options.cellSize * options.resolution;
        let start = new THREE.Vector3(size / 2, 0, -size / 2);
        let point = start.clone();
        const color = new THREE.Color();
        let vertexIndex = 0;

        for (let y = 0; y < vertexStride; y++) {
            for (let x = 0; x < vertexStride; x++) {
                const c = PerlinNoise.get2DNoise(x, y, 4);
                point.y = c;

                point.toArray(vertices, vertexIndex);
                normal.toArray(normals, vertexIndex);

                color.setRGB(c, c, c);
                color.toArray(colors, vertexIndex);
                vertexIndex += 3;
                point.x -= options.cellSize;
            }
            point.z += options.cellSize;
            point.x = start.x;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const indices = Array.from(new Array(vertexCount))
            .reduce((acc, _, i) => {
                if ((i + 1) % vertexStride === 0) {
                    return acc;
                }
                return [
                    ...acc, 
                    i + 0, i + 1, i + vertexStride,
                    i + 1, i + vertexStride + 1, i + vertexStride
                ];
            }, []);

        geometry.setIndex(indices);        
        const material = new THREE.MeshPhongMaterial({ color: 0xffffff });
        material.vertexColors = true;
        super(geometry, material);
    }
}
