
import * as THREE from 'three';

interface ITerrainOptions {
    cellSize: number;
    resolution: number;
}

export class Terrain extends THREE.Mesh {
    public constructor(options: ITerrainOptions) {

        const geometry = new THREE.BufferGeometry()

        const vertexStride = options.resolution + 1;
        const vertexCount = Math.pow(vertexStride, 2);
        console.log({vertexCount});
        const vertices = new Float32Array(vertexCount * 3);
        const normals = new Float32Array(vertexCount * 3);      
        
        const normal = new THREE.Vector3(0, 1, 0);
        const size = options.cellSize * options.resolution;
        let start = new THREE.Vector3(size / 2, 0, -size / 2);
        let point = start.clone();
        let vertexIndex = 0;
        for (let y = 0; y < vertexStride; y++) {
            for (let x = 0; x < vertexStride; x++) {
                point.toArray(vertices, vertexIndex);
                normal.toArray(normals, vertexIndex);
                vertexIndex += 3;
                point.x -= options.cellSize;
            }
            point.z += options.cellSize;
            point.x = start.x;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));

        const indices = Array.from(new Array(vertexCount))
            .reduce((acc, _, i) => {
                if ((i + 1) % vertexStride === 0) {
                    console.log(`skipping ${i}`);
                    return acc;
                }
                return [
                    ...acc, 
                    i + 0, i + 1, i + vertexStride,
                    i + 1, i + vertexStride + 1, i + vertexStride
                ];
            }, []);        

        console.log(indices);
        geometry.setIndex(indices);
        const material = new THREE.MeshPhongMaterial({ color: 0xff0000 });
        super(geometry, material);
    }
}
