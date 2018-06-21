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

import GLTFLoader from 'gltf-loader';

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

    if (url === this.url && type === this.type) {
      return;
    }

    this.url = url;
    this.type = type;
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

    this.dispatchEvent({ type: 'model-load' });
  }
}
