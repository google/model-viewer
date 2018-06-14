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

import { Object3D, Box3, Vector3, Matrix4, TextureLoader } from 'three';

import GLTFLoader from '../../third_party/three/GLTFLoader.js';

const loadGLTF = (loader, url) =>
  new Promise((resolve, reject) =>
    loader.load(url, resolve, ()=>{}, reject));

export default class Model extends Object3D {
  constructor() {
    super();
    this.loader = new GLTFLoader();
  }

  async setSource(url, type) {
    if (!url) {
      return;
    }

    // Remove all current children
    while (this.children.length) {
      this.remove(this.children[0]);
    }

    const data = await loadGLTF(this.loader, url);

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
      this.add(data.scene.children.shift());
      this.traverse(obj => {
        if (obj && obj.type === 'Mesh') {
          obj.castShadow = true;
        }
      });
    }

    // Apply environment incase those were triggered before
    // the model was loaded
    //this._applyEnv();
    this.dispatchEvent({ type: 'model-load' });
  }
  /*
  _applyEnv() {
    this.traverse(obj => {
      if (obj.material) {
        obj.material.envMap = this.envMap;
        obj.material.envMapIntensity = this.envMapIntensity;
        obj.material.needsUpdate = true;
      }
    });
  }

  setEnvMap(cubemap) {
    this.envMap = cubemap;
    this._applyEnv();
  }

  setEnvMapIntensity(value) {
    this.envMapIntensity = value;
    this._applyEnv();
  }
  */
}
