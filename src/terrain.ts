
import { GUI } from 'dat.gui';
import * as THREE from 'three';
import { MathUtils } from 'three';
import { PerlinNoise } from './perlin-noise';

interface ITerrainOptions {
    radius: number;
}

export class Terrain extends THREE.Mesh {
    public constructor(props: ITerrainOptions, gui: GUI) {

        // const geometry = new THREE.BufferGeometry();

        // const vertexStride = options.resolution + 1;
        // const vertexCount = Math.pow(vertexStride, 2);
        // const vertices = new Float32Array(vertexCount * 3);
        // const normals = new Float32Array(vertexCount * 3);
        // const colors = new Float32Array(vertexCount * 3);

        // const normal = new THREE.Vector3(0, 1, 0);
        // const size = options.cellSize * options.resolution;
        // let start = new THREE.Vector3(size / 2, 0, -size / 2);
        // let point = start.clone();
        // const color = new THREE.Color();
        // let vertexIndex = 0;

        // for (let y = 0; y < vertexStride; y++) {
        //     for (let x = 0; x < vertexStride; x++) {
        //         const c = PerlinNoise.get2DNoise(x, y, 4);
        //         point.y = c;

        //         point.toArray(vertices, vertexIndex);
        //         normal.toArray(normals, vertexIndex);

        //         color.setRGB(c, c, c);
        //         color.toArray(colors, vertexIndex);
        //         vertexIndex += 3;
        //         point.x -= options.cellSize;
        //     }
        //     point.z += options.cellSize;
        //     point.x = start.x;
        // }

        // geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        // geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
        // geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        // const lastValidIndex = vertexStride * options.resolution - 1;
        // const indices = Array.from(new Array(vertexCount))
        //     .reduce((acc, _, i) => {
        //         if (i > lastValidIndex || (i + 1) % vertexStride === 0) {
        //             return acc;
        //         }
        //         return [
        //             ...acc,
        //             i + 0, i + 1, i + vertexStride,
        //             i + 1, i + vertexStride + 1, i + vertexStride
        //         ];
        //     }, []);

        // geometry.setIndex(indices);

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

        // const debug = new THREE.Mesh(
        //     new THREE.BoxGeometry(1, 1, 1),
        //     new THREE.MeshBasicMaterial({ color: 0xff0000 })
        // );
        // debug.scale.z = 2;
        // this.add(debug);
        // const angles = { theta: 0, phi: 0 };        
        // function updateDebug() {
        //     debug.position.setFromSphericalCoords(4, MathUtils.degToRad(angles.phi), MathUtils.degToRad(angles.theta));
        //     console.log(`phi ${angles.phi} theta ${angles.theta} = ${debug.position.x} ${debug.position.y} ${debug.position.z}`);
        // }
        // updateDebug();
        // gui.add(angles, 'phi', 0, 360).onChange(updateDebug);
        // gui.add(angles, 'theta', 0, 360).onChange(updateDebug);
    }
}
