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

import {Object3D} from 'three';

import GLTFLoader from '../../third_party/three/GLTFLoader.js';

const loadGLTF = (loader, url) => new Promise(
    (resolve, reject) => loader.load(url, resolve, () => {}, reject));

/**
 * An Object3D that can swap out its underlying
 * model.
 *
 * @extends THREE.Object3D
 */
export default class Model extends Object3D {
  /**
   * Creates a model.
   */
  constructor() {
    super();
    this.loader = new GLTFLoader();
    this.modelContainer = new Object3D();
    this.add(this.modelContainer);
  }

  /**
   * Returns a boolean indicating whether or not there is a
   * loaded model attached.
   *
   * @return {Boolean}
   */
  hasModel() {
    return !!this.modelContainer.children.length;
  }

  /**
   * @param {String} url
   * @param {String} type
   */
  async setSource(url, type) {
    if (!url || !type) {
      return;
    }

    if (url === this.url && type === this.type) {
      return;
    }

    // This Model component can only load glb and gltf
    if (['model/gltf-binary', 'model/gltf+json'].indexOf(type) === -1) {
      return;
    }

    const data = await loadGLTF(this.loader, url);

    // If parsing the GLTF does not throw, then clear out the current
    // model and replace with the new.
    this.url = url;
    this.type = type;
    // Remove all current children
    while (this.modelContainer.children.length) {
      this.modelContainer.remove(this.modelContainer.children[0]);
    }

    // data.animations = [];
    // data.cameras = [];
    // data.scenes = [x];
    // data.scene = x
    // data.asset.extras.author
    // data.asset.extras.license
    // data.asset.extras.source
    // data.asset.extras.title
    // data.asset.generator
    // data.asset.version

    while (data.scene && data.scene.children.length) {
      this.modelContainer.add(data.scene.children.shift());
    }

    this.modelContainer.traverse(obj => {
      if (obj && obj.type === 'Mesh') {
        obj.castShadow = true;
      }
    });

    this.dispatchEvent({type: 'model-load'});
  }
}
