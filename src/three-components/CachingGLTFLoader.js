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

const loadWithLoader = (url, loader) => new Promise((resolve, reject) => {
  loader.load(url, resolve, () => {}, reject);
});

const cache = new Map();

export class CachingGLTFLoader {
  static has(url) {
    return cache.has(url);
  }

  constructor() {
    this.loader = new GLTFLoader();
  }

  async load(url) {
    if (!cache.has(url)) {
      cache.set(url, loadWithLoader(url, this.loader));
    }

    const gltf = await cache.get(url);

    const model = gltf.scene ? gltf.scene.clone(true) : null;

    // Materials aren't cloned when cloning meshes; geometry
    // and materials are copied by reference. This is necessary
    // for the same model to be used twice with different
    // environment maps.
    if (model) {
      model.traverse(object => {
        // Set a high renderOrder while we're here to ensure the model
        // always renders on top of the skysphere
        object.renderOrder = 1000;
        if (Array.isArray(object.material)) {
          object.material = object.material.map(m => m.clone());
        } else if (object.material) {
          object.material = object.material.clone();
        }
      });
    }

    return model;
  }
}
