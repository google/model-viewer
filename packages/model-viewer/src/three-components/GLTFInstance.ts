/* @license
 * Copyright 2020 Google LLC. All Rights Reserved.
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

import {Group, Mesh, Object3D, Texture} from 'three';
import {GLTF} from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

import {Constructor} from '../utilities.js';



export const $prepared = Symbol('prepared');

export interface PreparedGLTF extends GLTF {
  [$prepared]?: boolean;
}

export const $prepare = Symbol('prepare');
export const $preparedGLTF = Symbol('preparedGLTF');
export const $clone = Symbol('clone');

/**
 * Represents the preparation and enhancement of the output of a Three.js
 * GLTFLoader (a Three.js-flavor "GLTF"), to make it suitable for optimal,
 * correct viewing in a given presentation context and also make the cloning
 * process more explicit and legible.
 *
 * A GLTFInstance is API-compatible with a Three.js-flavor "GLTF", so it should
 * be considered to be interchangeable with the loaded result of a GLTFLoader.
 *
 * This basic implementation only implements trivial preparation and enhancement
 * of a GLTF. These operations are intended to be enhanced by inheriting
 * classes.
 */
export class GLTFInstance implements GLTF {
  /**
   * Prepares a given GLTF for presentation and future cloning. A GLTF that is
   * prepared can safely have this method invoked on it multiple times; it will
   * only be prepared once, including after being cloned.
   */
  static prepare(source: GLTF): PreparedGLTF {
    if (source.scene == null) {
      throw new Error('Model does not have a scene');
    }

    if ((source as PreparedGLTF)[$prepared]) {
      return source;
    }

    const prepared = this[$prepare](source) as Partial<PreparedGLTF>;

    // NOTE: ES5 Symbol polyfill is not compatible with spread operator
    // so {...prepared, [$prepared]: true} does not work
    prepared[$prepared] = true;

    return prepared as PreparedGLTF;
  }

  /**
   * Override in an inheriting class to apply specialty one-time preparations
   * for a given input GLTF.
   */
  protected static[$prepare](source: GLTF): GLTF {
    // TODO(#195,#1003): We don't currently support multiple scenes, so we don't
    // bother preparing extra scenes for now:
    const {scene} = source;
    const scenes = [scene];

    return {...source, scene, scenes};
  }

  protected[$preparedGLTF]: PreparedGLTF;

  get parser() {
    return this[$preparedGLTF].parser;
  }

  get animations() {
    return this[$preparedGLTF].animations;
  }

  get scene() {
    return this[$preparedGLTF].scene;
  }

  get scenes() {
    return this[$preparedGLTF].scenes;
  }

  get cameras() {
    return this[$preparedGLTF].cameras;
  }

  get asset() {
    return this[$preparedGLTF].asset;
  }

  get userData() {
    return this[$preparedGLTF].userData;
  }

  constructor(preparedGLTF: PreparedGLTF) {
    this[$preparedGLTF] = preparedGLTF;
  }

  /**
   * Creates and returns a copy of this instance.
   */
  clone<T extends GLTFInstance>(): T {
    const GLTFInstanceConstructor = this.constructor as Constructor<T>;
    const clonedGLTF = this[$clone]();

    return new GLTFInstanceConstructor(clonedGLTF);
  }

  /**
   * Cleans up any retained memory that might not otherwise be released when
   * this instance is done being used.
   */
  dispose(): void {
    this.scenes.forEach((scene: Group) => {
      scene.traverse((object: Object3D) => {
        if (!(object as Mesh).isMesh) {
          return;
        }
        const mesh = object as Mesh;
        const materials =
            Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach(material => {
          // Explicitly dispose any textures assigned to this material
          for (const propertyName in material) {
            const texture = (material as any)[propertyName];
            if (texture instanceof Texture) {
              const image = texture.source.data;
              if (image instanceof ImageBitmap) {
                image.close();
              }
              texture.dispose();
            }
          }
          material.dispose();
        });
        mesh.geometry.dispose();
      });
    });
  }

  /**
   * Override in an inheriting class to implement specialized cloning strategies
   */
  protected[$clone](): PreparedGLTF {
    const source = this[$preparedGLTF];
    // TODO(#195,#1003): We don't currently support multiple scenes, so we don't
    // bother cloning extra scenes for now:
    const scene = (SkeletonUtils as any).clone(this.scene) as Group;
    cloneVariantMaterials(scene, this.scene);
    const scenes = [scene];
    const userData = source.userData ? {...source.userData} : {};
    return {...source, scene, scenes, userData};
  }
}

// Variant materials and original material instances are stored under
// object.userData.variantMaterials/originalMaterial.
// Three.js Object3D.clone() doesn't clone Three.js objects under
// .userData so this function is a workaround.
const cloneVariantMaterials = (dst: Object3D, src: Object3D) => {
  traversePair(dst, src, (dst, src) => {
    if (src.userData.variantMaterials !== undefined) {
      dst.userData.variantMaterials = new Map(src.userData.variantMaterials);
    }
    if (src.userData.variantData !== undefined) {
      dst.userData.variantData = src.userData.variantData;
    }
    if (src.userData.originalMaterial !== undefined) {
      dst.userData.originalMaterial = src.userData.originalMaterial;
    }
  });
};

const traversePair =
    (obj1: Object3D,
     obj2: Object3D,
     callback: (obj1: Object3D, obj2: Object3D) => void) => {
      callback(obj1, obj2);
      // Assume obj1 and obj2 have the same tree structure
      for (let i = 0; i < obj1.children.length; i++) {
        traversePair(obj1.children[i], obj2.children[i], callback);
      }
    };

export type GLTFInstanceConstructor =
    Constructor<GLTFInstance, {prepare: typeof GLTFInstance['prepare']}>;
