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
import {cloneGltf} from './ModelUtils.js';

const loadWithLoader = (url, loader) => new Promise((resolve, reject) => {
  loader.load(url, resolve, () => {}, reject);
});

const cache = new Map();
const preloaded = new Map();

export class CachingGLTFLoader {
  static clearCache() {
    cache.clear();
    preloaded.clear();
  }

  static has(url) {
    return cache.has(url);
  }

  /**
   * Returns true if the model that corresponds to the specified url is
   * available in our local cache.
   */
  static hasFinishedLoading(url) {
    return !!preloaded.get(url);
  }

  constructor() {
    this.loader = new GLTFLoader();
  }

  /**
   * Preloads a glTF, populating the cache. Returns a promise that resolves
   * when the cache is populated.
   */
  async preload(url) {
    if (!cache.has(url)) {
      const loadAttempt = loadWithLoader(url, this.loader);
      loadAttempt
          .then(() => {
            preloaded.set(url, true);
          })
          .catch(() => {});  // Silently ignore exceptions here, they should be
                             // caught by the invoking function
      cache.set(url, loadAttempt);
      // window.loadAttempt = loadAttempt;
    }

    await cache.get(url);
    return;  // Explicitly return so that we don't leak the source glTF
  }

  /**
   * Loads a glTF from the specified url and resolves a unique clone of the
   * glTF. If the glTF has already been loaded, makes a clone of the cached
   * copy.
   */
  async load(url) {
    await this.preload(url);

    const gltf = cloneGltf(await cache.get(url));
    const model = gltf.scene ? gltf.scene : null;

    if (model != null) {
      model.userData.animations = gltf.animations;  // save animations
    }

    return model;
  }
}
