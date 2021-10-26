/* @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import {BufferAttribute, InterleavedBufferAttribute, Object3D, Vector3} from 'three';



/**
 * Gets a scale value to perform inverse quantization of a vertex value
 * Reference:
 * https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_mesh_quantization#encoding-quantized-data
 * @param buffer A gltf vertex buffer
 * @returns A scale value based on KHR_mesh_quantization or 1 if the buffer is
 *     not quantized.
 */
export const getNormalizedComponentScale =
    (buffer: BufferAttribute|InterleavedBufferAttribute) => {
      if (!buffer.normalized) {
        return 1;
      }

      const array: ArrayLike<number> = buffer.array;
      if (array instanceof Int8Array) {
        return 1 / 127;
      } else if (array instanceof Uint8Array) {
        return 1 / 255;
      } else if (array instanceof Int16Array) {
        return 1 / 32767;
      } else if (array instanceof Uint16Array) {
        return 1 / 65535;
      }
      return 1;
    };
/**
 * Moves Three.js objects from one parent to another
 */
export const moveChildren = (from: Object3D, to: Object3D) => {
  while (from.children.length) {
    to.add(from.children.shift()!);
  }
};

/**
 * Performs a reduction across all the vertices of the input model and all its
 * children. The supplied function takes the reduced value and a vertex and
 * returns the newly reduced value. The value is initialized as zero.
 *
 * Adapted from Three.js, @see https://github.com/mrdoob/three.js/blob/7e0a78beb9317e580d7fa4da9b5b12be051c6feb/src/math/Box3.js#L241
 */
export const reduceVertices = <T>(
    model: Object3D, func: (value: T, vertex: Vector3) => T, initialValue: T):
    T => {
      let value = initialValue;
      const vertex = new Vector3();
      model.traverse((object: any) => {
        let i, l;

        object.updateWorldMatrix(false, false);

        const geometry = object.geometry;

        if (geometry !== undefined) {
          if (geometry.isGeometry) {
            const vertices = geometry.vertices;

            for (i = 0, l = vertices.length; i < l; i++) {
              vertex.copy(vertices[i]);
              vertex.applyMatrix4(object.matrixWorld);
              value = func(value, vertex);
            }

          } else if (geometry.isBufferGeometry) {
            const {position} = geometry.attributes;

            if (position !== undefined) {
              const scale = getNormalizedComponentScale(position);

              for (i = 0, l = position.count; i < l; i++) {
                vertex.fromBufferAttribute(position, i);
                vertex.multiplyScalar(scale);
                vertex.applyMatrix4(object.matrixWorld);

                value = func(value, vertex);
              }
            }
          }
        }
      });
      return value;
    };
