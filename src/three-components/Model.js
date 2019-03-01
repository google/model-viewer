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

import {AnimationMixer, Box3, Object3D, SkinnedMesh, Vector3} from 'three';

import {CachingGLTFLoader} from './CachingGLTFLoader.js';

// TODO three.js doesn't clone SkinnedMesh properly
SkinnedMesh.prototype.clone = function () {

	var clone = new this.constructor( this.geometry, this.material ).copy( this );
	clone.skeleton = this.skeleton;
	clone.bindMatrix.copy( this.bindMatrix );
	clone.bindMatrixInverse.getInverse( this.bindMatrix );

	return clone;

};

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
    this.mixer = new AnimationMixer();
    this.modelContainer = new Object3D();
    this.modelContainer.name = 'ModelContainer';
    this.boundingBox = new Box3();
    this.size = new Vector3();
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

  applyEnvironmentMap(map) {
    // Note that unlit models (using MeshBasicMaterial) should not apply
    // an environment map, even though `map` is the currently configured
    // environment map.
    this.modelContainer.traverse(obj => {
      // There are some cases where `obj.material` is
      // an array of materials.
      if (Array.isArray(obj.material)) {
        for (let material of obj.material) {
          if (material.isMeshBasicMaterial) {
            continue;
          }
          material.envMap = map;
          material.needsUpdate = true;
        }
      }
      else if (obj.material && !obj.material.isMeshBasicMaterial) {
        obj.material.envMap = map;
        obj.material.needsUpdate = true;
      }
    });
    this.dispatchEvent({type: 'envmap-change', value: map});
  }

  setEnvironmentMapIntensity(intensity) {
    const intensityIsNumber =
        typeof intensity === 'number' && !self.isNaN(intensity);

    if (!intensityIsNumber) {
      intensity = 1.0;
    }

    this.modelContainer.traverse(object => {
      if (object && object.isMesh && object.material) {
        const {material} = object;
        if (Array.isArray(object.material)) {
          object.material.forEach(
              material => material.envMapIntensity = intensity);
        } else {
          object.material.envMapIntensity = intensity;
        }
      }
    });
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

    const animations = scene.userData.animations;

    if (animations && animations.length > 0) {
      this.mixer.clipAction(animations[0], this).play();
    }

    this.updateBoundingBox();

    this.dispatchEvent({type: 'model-load'});
  }

  clear() {
    this.url = null;
    // Remove all current children
    while (this.modelContainer.children.length) {
      this.modelContainer.remove(this.modelContainer.children[0]);
    }
    this.mixer.stopAllAction(); // TODO Cleanup memory
  }

  updateBoundingBox() {
    this.remove(this.modelContainer);
    this.boundingBox.setFromObject(this.modelContainer);
    this.boundingBox.getSize(this.size);
    this.add(this.modelContainer);
  }
}
