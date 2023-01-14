import { Ray, Vector3 } from "three";

export class Collision {
    public static rayCastOnSphere(ray: Ray, center: Vector3, radius: number) {
        // thanks to iq - http://www.iquilezles.org/www/articles/intersectors/intersectors.htm        
        const oc = new Vector3().subVectors(ray.origin, center);
        const b = oc.dot(ray.direction);
        const c = oc.dot(oc) - radius * radius;
        let h = b * b - c;
        if (h < 0) {
            // no intersection
            return null;
        }
        h = Math.sqrt(h);
        const i1 = -b - h;
        const i2 = -b + h;
        let near = i1;
        let far = i2;
        if (i1 < 0) {
            if (i2 < 0) {
                // sphere is behind the ray
                return null;
            }
            near = i2;
            far = i1;
        }
        return {
            intersection1: new Vector3().addScaledVector(ray.direction, near).add(ray.origin),
            intersection2: new Vector3().addScaledVector(ray.direction, far).add(ray.origin)            
        };
    }
}
