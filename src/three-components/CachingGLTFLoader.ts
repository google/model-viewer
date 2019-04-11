/*
 * Copyright 2018 Google Inc. All Rights Reserved.
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

import GLTFLoader from '../third_party/three/GLTFLoader.js';

import {cloneGltf, Gltf} from './ModelUtils.js';

export type ProgressCallback = (loaded: number, total: number) => void;

export const loadWithLoader =
    (url: string,
     loader: any,
     progressCallback: ProgressCallback|null = null) => {
      const onProgress = progressCallback != null ? (event: ProgressEvent) => {
        progressCallback!(event.loaded, event.total);
      } : () => {};
      return new Promise<Gltf>((resolve, reject) => {
        loader.load(url, resolve, onProgress, reject);
      });
    }

const cache = new Map<string, Promise<Gltf>>();
const preloaded = new Map<string, boolean>();

export class CachingGLTFLoader {
  static clearCache() {
    cache.clear();
    preloaded.clear();
  }

  static has(url: string) {
    return cache.has(url);
  }

  /**
   * Returns true if the model that corresponds to the specified url is
   * available in our local cache.
   */
  static hasFinishedLoading(url: string) {
    return !!preloaded.get(url);
  }

  protected loader: GLTFLoader = new GLTFLoader();

  /**
   * Preloads a glTF, populating the cache. Returns a promise that resolves
   * when the cache is populated.
   */
  async preload(url: string, progressCallback: ProgressCallback|null = null) {
    if (!cache.has(url)) {
      cache.set(url, loadWithLoader(url, this.loader, progressCallback));
    }

    await cache.get(url);

    preloaded.set(url, true);
  }

  /**
   * Loads a glTF from the specified url and resolves a unique clone of the
   * glTF. If the glTF has already been loaded, makes a clone of the cached
   * copy.
   */
  async load(url: string, progressCallback: ProgressCallback|null = null) {
    await this.preload(url, progressCallback);

    const gltf = cloneGltf(await cache.get(url)!);
    const model = gltf.scene ? gltf.scene : null;

    if (model != null) {
      model.userData.animations = gltf.animations;  // save animations
    }

    return model;
  }
}
