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

import {Box3, Object3D, Vector3} from 'three';

import {CachingGLTFLoader} from './CachingGLTFLoader.js';

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
    this.name = 'Model';
    this.loader = new CachingGLTFLoader();
    this.modelContainer = new Object3D();
    this.modelContainer.name = 'ModelContainer';
    this.boundingBox = new Box3();
    this.size = new Vector3();
    this.add(this.modelContainer);
  }

  /**
   * Centers the model on the X and Z axis from its
   * (0, 0, 0) point, and raises the model such that its
   * lowest point is at y=0. Useful for AR.
   */
  centerAndGroundPosition() {
    if (this.size.length() === 0) {
      return;
    }

    const position = this.modelContainer.position;
    position.x = -(this.boundingBox.min.x + (this.size.x / 2));
    position.y = -this.boundingBox.min.y;
    position.z = -(this.boundingBox.min.z + (this.size.z / 2));
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

  applyEnvironmentMap(map) {
    this.modelContainer.traverse(obj => {
      if (obj && obj.isMesh && obj.material) {
        obj.material.envMap = map;
        obj.material.needsUpdate = true;
      }
    });
    this.dispatchEvent({type: 'envmap-change', value: map});
  }

  /**
   * Pass in a THREE.Object3D to be controlled
   * by this model.
   *
   * @param {THREE.Object3D}
   */
  setObject(model) {
    this.clear();
    this.modelContainer.add(model);
    this.updateBoundingBox();
    this.dispatchEvent({type: 'model-load'});
  }

  /**
   * @param {String} url
   */
  async setSource(url) {
    if (!url || url === this.url) {
      return;
    }

    const scene = await this.loader.load(url);

    this.clear();
    this.url = url;

    while (scene && scene.children.length) {
      this.modelContainer.add(scene.children.shift());
    }

    this.modelContainer.traverse(obj => {
      if (obj && obj.type === 'Mesh') {
        obj.castShadow = true;
      }
    });

    this.updateBoundingBox();

    this.dispatchEvent({type: 'model-load'});
  }

  clear() {
    this.url = null;
    // Remove all current children
    while (this.modelContainer.children.length) {
      this.modelContainer.remove(this.modelContainer.children[0]);
    }
  }

  updateBoundingBox() {
    this.modelContainer.position.set(0, 0, 0);

    this.remove(this.modelContainer);
    this.boundingBox.setFromObject(this.modelContainer);
    this.boundingBox.getSize(this.size);
    this.add(this.modelContainer);

    this.centerAndGroundPosition();
  }
}
