

import { MathUtils } from 'three';

export class PerlinNoise {
    private static readonly resolution = 32;
    private static readonly permutations = Array.from(new Array(this.resolution * this.resolution)).map(() => Math.random());

    private static getGradient(x: number, y: number) {
        const { resolution } = this;
        const ix = Math.floor(x);
        const iy = Math.floor(y);
        const u = x - ix;
        const v = y - iy;
        const x1 = ix % resolution;
        const x2 = (ix + 1) % resolution;
        const y1 = iy % resolution;
        const y2 = (iy + 1) % resolution;
        const line1 = y1 * resolution;
        const line2 = y2 * resolution;
        const x1y1 = this.permutations[line1 + x1];
        const x2y1 = this.permutations[line1 + x2];
        const x1y2 = this.permutations[line2 + x1];
        const x2y2 = this.permutations[line2 + x2];
        const i1 = MathUtils.lerp(x1y1, x2y1, u);
        const i2 = MathUtils.lerp(x1y2, x2y2, u);
        return MathUtils.lerp(i1, i2, v);
    }

    public static get2DNoise(x: number, y: number, frequency: number, octaves = 4) {
        let noise = 0;
        let weigth = 1;
        let weights = 0;
        for (let i = 0; i < octaves; i++) {
            noise += this.getGradient(x / frequency, y / frequency) * weigth;
            weights += weigth;
            frequency *= 0.5;
            weigth *= 0.5;
        }
        noise /= weights;
        return noise;
    }
}

