
import * as THREE from 'three';

interface ITerrainOptions {
    radius: number;
}

export class Terrain extends THREE.Mesh {
    public constructor(props: ITerrainOptions) {

        const material = new THREE.MeshPhongMaterial({ 
            color: 0xffffff, 
            flatShading: true, 
            vertexColors: true 
        });
        const sphere = new THREE.IcosahedronGeometry(props.radius, 20);

        const _vertices = sphere.getAttribute('position');
        const colors = new Float32Array(_vertices.count * 3);
        for (let i = 0; i < _vertices.count; i++) {  
            colors[i * 3 + 0] = .3;
            colors[i * 3 + 1] = Math.max(Math.random(), 0.5);
            colors[i * 3 + 2] = 0;
        }
        sphere.setAttribute("color", new THREE.BufferAttribute(colors, 3));

        super(sphere, material);        
    }
}

