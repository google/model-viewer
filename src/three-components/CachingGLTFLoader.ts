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

import {Mesh, Object3D, Scene} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';

import {CacheEvictionPolicy} from '../utilities/cache-eviction-policy.js';

import {cloneGltf, Gltf} from './ModelUtils.js';

export type ProgressCallback = (progress: number) => void;

export const loadWithLoader =
    (url: string,
     loader: any,
     progressCallback: ProgressCallback = () => {}) => {
      const onProgress = (event: ProgressEvent) => {
        progressCallback!(event.loaded / event.total);
      };
      return new Promise<Gltf>((resolve, reject) => {
        loader.load(url, resolve, onProgress, reject);
      });
    };

export const $releaseFromCache = Symbol('releaseFromCache');
export interface CacheRetainedScene extends Scene {
  [$releaseFromCache]: () => void;
}

const cache = new Map<string, Promise<Gltf>>();
const preloaded = new Map<string, boolean>();

export const $evictionPolicy = Symbol('evictionPolicy');

export class CachingGLTFLoader {
  static[$evictionPolicy]: CacheEvictionPolicy =
      new CacheEvictionPolicy(CachingGLTFLoader);

  static get cache() {
    return cache;
  }

  /** @nocollapse */
  static clearCache() {
    cache.forEach((_value, url) => {
      this.delete(url);
    });
    this[$evictionPolicy].reset();
  }

  static has(url: string) {
    return cache.has(url);
  }

  /** @nocollapse */
  static async delete(url: string) {
    if (!this.has(url)) {
      return;
    }

    const gltfLoads = cache.get(url);
    preloaded.delete(url);
    cache.delete(url);

    const gltf = await gltfLoads;
    // Dispose of the cached glTF's materials and geometries:
    gltf!.scenes.forEach(scene => {
      scene.traverse(object3D => {
        if (!(object3D as Mesh).isMesh) {
          return;
        }
        const mesh = object3D as Mesh;
        const materials =
            Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach(material => {
          material.dispose();
        });
        mesh.geometry.dispose();
      });
    });
  }

  /**
   * Returns true if the model that corresponds to the specified url is
   * available in our local cache.
   */
  static hasFinishedLoading(url: string) {
    return !!preloaded.get(url);
  }

  protected loader: GLTFLoader = new GLTFLoader();

  protected get[$evictionPolicy](): CacheEvictionPolicy {
    return (this.constructor as typeof CachingGLTFLoader)[$evictionPolicy];
  }

  /**
   * Preloads a glTF, populating the cache. Returns a promise that resolves
   * when the cache is populated.
   */
  async preload(url: string, progressCallback: ProgressCallback = () => {}) {
    if (!cache.has(url)) {
      cache.set(url, loadWithLoader(url, this.loader, (progress: number) => {
                  progressCallback(progress * 0.9);
                }));
    }

    await cache.get(url);

    if (progressCallback) {
      progressCallback(1.0);
    }

    preloaded.set(url, true);
  }

  /**
   * Loads a glTF from the specified url and resolves a unique clone of the
   * glTF. If the glTF has already been loaded, makes a clone of the cached
   * copy.
   */
  async load(url: string, progressCallback: ProgressCallback = () => {}):
      Promise<CacheRetainedScene|null> {
    await this.preload(url, progressCallback);

    const gltf = await cache.get(url)!;

    if (gltf.scene != null) {
      gltf.scene.traverse((node: Object3D) => {
        node.castShadow = true;
        // Three.js seems to cull some animated models incorrectly. Since we
        // expect to view our whole scene anyway, we turn off the frustum
        // culling optimization here.
        node.frustumCulled = false;
        // Animations for objects without names target their UUID instead. When
        // objects are cloned, they get new UUIDs which the animation can't
        // find. To fix this, we assign their UUID as their name.
        if (!node.name) {
          node.name = node.uuid;
        }
      });
    }

    const clone = cloneGltf(gltf);
    const model = clone.scene ? clone.scene : null;

    if (model != null) {
      model.userData.animations = clone.animations;  // save animations

      this[$evictionPolicy].retain(url);

      (model as CacheRetainedScene)[$releaseFromCache] = (() => {
        let released = false;
        return () => {
          if (released) {
            return;
          }

          // We manually dispose cloned materials because Three.js keeps
          // an internal count of materials using the same program, so it's
          // safe to dispose of them incrementally. Geometry clones are not
          // accounted for, so they cannot be disposed of incrementally.
          model.traverse((object3D) => {
            if (!(object3D as Mesh).isMesh) {
              return;
            }
            const mesh = object3D as Mesh;
            const materials =
                Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            materials.forEach(material => {
              material.dispose();
            });
          });

          this[$evictionPolicy].release(url);
          released = true;
        };
      })();
    }

    return model as CacheRetainedScene | null;
  }
}