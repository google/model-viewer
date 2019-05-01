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

const $cancelPendingSourceChange = Symbol('cancelPendingSourceChange');

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
    this.url = null;
    this.mixer = new AnimationMixer();
    this.animations = null;
    this.animationsByName = null;
    this.animationNames = [];
    this.currentAnimationAction = null;
    this.userData = {url: null};

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
      } else if (obj.material && !obj.material.isMeshBasicMaterial) {
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
   * @param {Function?} progressCallback
   */
  async setSource(url, progressCallback) {
    if (!url || url === this.url) {
      if (progressCallback) {
        progressCallback(1);
      }
      return;
    }

    // If we have pending work due to a previous source change in progress,
    // cancel it so that we do not incur a race condition:
    if (this[$cancelPendingSourceChange] != null) {
      this[$cancelPendingSourceChange]();
      this[$cancelPendingSourceChange] = null;
    }

    this.url = url;

    let scene = null;

    try {
      scene = await new Promise(async (resolve, reject) => {
        this[$cancelPendingSourceChange] = () => reject();
        try {
          const result = await this.loader.load(url, progressCallback);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    } catch (error) {
      if (error == null) {
        return;
      }

      throw error;
    }

    this.clear();

    while (scene && scene.children.length) {
      this.modelContainer.add(scene.children.shift());
    }

    this.modelContainer.traverse(obj => {
      if (obj && obj.type === 'Mesh') {
        obj.castShadow = true;
      }
    });

    const {animations} = scene.userData;
    const animationsByName = new Map();
    const animationNames = [];

    if (animations != null) {
      for (const animation of animations) {
        animationsByName.set(animation.name, animation);
        animationNames.push(animation.name);
      }
    }

    this.animations = animations;
    this.animationsByName = animationsByName;
    this.animationNames = animationNames;

    this.userData.url = url;

    this.updateBoundingBox();

    this.dispatchEvent({type: 'model-load', url});
  }

  set animationTime(value = 0) {
    if (this.currentAnimationAction != null) {
      this.currentAnimationAction.time = value;
    }
  }

  get animationTime() {
    if (this.currentAnimationAction != null) {
      return this.currentAnimationAction.time;
    }

    return 0;
  }

  get hasActiveAnimation() {
    return this.currentAnimationAction != null;
  }

  /**
   * Plays an animation if there are any associated with the current model.
   * Accepts an optional string name of an animation to play. If no name is
   * provided, or if no animation is found by the given name, always falls back
   * to playing the first animation.
   */
  playAnimation(name = null, crossfadeTime = 0) {
    const {animations} = this;
    if (animations == null || animations.length === 0) {
      console.warn(
          `Cannot play animation (model does not have any animations)`);
      return;
    }

    let animationClip = null;

    if (name != null) {
      animationClip = this.animationsByName.get(name);
    }

    if (animationClip == null) {
      animationClip = animations[0];
    }

    try {
      const {currentAnimationAction: lastAnimationAction} = this;

      this.currentAnimationAction =
          this.mixer.clipAction(animationClip, this).play();
      this.currentAnimationAction.enabled = true;

      if (lastAnimationAction != null &&
          this.currentAnimationAction !== lastAnimationAction) {
        this.currentAnimationAction.crossFadeFrom(
            lastAnimationAction, crossfadeTime);
      }
    } catch (error) {
      console.error(error);
    }
  }

  stopAnimation() {
    if (this.currentAnimationAction != null) {
      this.currentAnimationAction.stop();
      this.currentAnimationAction.reset();
      this.currentAnimationAction = null;
    }

    this.mixer.stopAllAction();
  }

  updateAnimation(step) {
    this.mixer.update(step);
  }

  clear() {
    this.url = null;
    this.userData = {url: null};
    // Remove all current children
    while (this.modelContainer.children.length) {
      this.modelContainer.remove(this.modelContainer.children[0]);
    }

    if (this.currentAnimationAction != null) {
      this.currentAnimationAction.stop();
      this.currentAnimationAction = null;
    }

    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this);
  }

  updateBoundingBox() {
    this.remove(this.modelContainer);
    this.boundingBox.setFromObject(this.modelContainer);
    this.boundingBox.getSize(this.size);
    this.add(this.modelContainer);
  }
}
