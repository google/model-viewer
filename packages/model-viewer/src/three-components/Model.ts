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

import {AnimationAction, AnimationClip, AnimationMixer, Box3, Object3D, Vector3} from 'three';

import {CachingGLTFLoader} from './CachingGLTFLoader.js';
import {ModelViewerGLTFInstance} from './gltf-instance/ModelViewerGLTFInstance.js';
import {moveChildren, reduceVertices} from './ModelUtils.js';

const $cancelPendingSourceChange = Symbol('cancelPendingSourceChange');
const $currentGLTF = Symbol('currentGLTF');

export const DEFAULT_FOV_DEG = 45;
const DEFAULT_HALF_FOV = (DEFAULT_FOV_DEG / 2) * Math.PI / 180;
export const SAFE_RADIUS_RATIO = Math.sin(DEFAULT_HALF_FOV);
export const DEFAULT_TAN_FOV = Math.tan(DEFAULT_HALF_FOV);

const $loader = Symbol('loader');

/**
 * An Object3D that can swap out its underlying
 * model.
 */
export default class Model extends Object3D {
  private[$currentGLTF]: ModelViewerGLTFInstance|null = null;
  private[$loader] = new CachingGLTFLoader(ModelViewerGLTFInstance);
  private mixer: AnimationMixer;
  private[$cancelPendingSourceChange]: (() => void)|null;
  private animations: Array<AnimationClip> = [];
  private animationsByName: Map<string, AnimationClip> = new Map();
  private currentAnimationAction: AnimationAction|null = null;

  public modelContainer = new Object3D();
  public animationNames: Array<string> = [];
  public boundingBox = new Box3();
  public size = new Vector3();
  public idealCameraDistance = 0;
  public fieldOfViewAspect = 0;
  public userData: {url: string|null} = {url: null};
  public url: string|null = null;

  get loader() {
    return this[$loader];
  }

  /**
   * Creates a model.
   */
  constructor() {
    super();

    this.name = 'Model';
    this.modelContainer.name = 'ModelContainer';

    this.add(this.modelContainer);
    this.mixer = new AnimationMixer(this.modelContainer);
  }

  /**
   * Returns a boolean indicating whether or not there is a
   * loaded model attached.
   */
  hasModel(): boolean {
    return !!this.modelContainer.children.length;
  }

  /**
   * Pass in a THREE.Object3D to be controlled
   * by this model.
   */
  setObject(model: Object3D) {
    this.clear();
    this.modelContainer.add(model);
    this.updateFraming();
    this.dispatchEvent({type: 'model-load'});
  }

  async setSource(
      url: string|null, progressCallback?: (progress: number) => void) {
    if (!url || url === this.url) {
      if (progressCallback) {
        progressCallback(1);
      }
      return;
    }

    // If we have pending work due to a previous source change in progress,
    // cancel it so that we do not incur a race condition:
    if (this[$cancelPendingSourceChange] != null) {
      this[$cancelPendingSourceChange]!();
      this[$cancelPendingSourceChange] = null;
    }

    this.url = url;

    let gltf: ModelViewerGLTFInstance;

    try {
      gltf = await new Promise<ModelViewerGLTFInstance>(
          async (resolve, reject) => {
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
        // Loading was cancelled, so silently return
        return;
      }

      throw error;
    }

    this.clear();
    this[$currentGLTF] = gltf;

    if (gltf != null) {
      moveChildren(gltf.scene, this.modelContainer);
    }

    const {animations} = gltf!;
    const animationsByName = new Map();
    const animationNames = [];

    for (const animation of animations) {
      animationsByName.set(animation.name, animation);
      animationNames.push(animation.name);
    }

    this.animations = animations;
    this.animationsByName = animationsByName;
    this.animationNames = animationNames;

    this.userData.url = url;

    this.updateFraming();

    this.dispatchEvent({type: 'model-load', url});
  }

  set animationTime(value: number) {
    if (this.currentAnimationAction != null) {
      this.currentAnimationAction.time = value;
    }
  }

  get animationTime(): number {
    if (this.currentAnimationAction != null) {
      return this.currentAnimationAction.time;
    }

    return 0;
  }

  get hasActiveAnimation(): boolean {
    return this.currentAnimationAction != null;
  }

  /**
   * Plays an animation if there are any associated with the current model.
   * Accepts an optional string name of an animation to play. If no name is
   * provided, or if no animation is found by the given name, always falls back
   * to playing the first animation.
   */
  playAnimation(name: string|null = null, crossfadeTime: number = 0) {
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
            lastAnimationAction, crossfadeTime, false);
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

  updateAnimation(step: number) {
    this.mixer.update(step);
  }

  clear() {
    this.url = null;
    this.userData = {url: null};
    const gltf = this[$currentGLTF];
    // Remove all current children
    if (gltf != null) {
      moveChildren(this.modelContainer, gltf.scene);
      gltf.dispose();
      this[$currentGLTF] = null;
    }

    if (this.currentAnimationAction != null) {
      this.currentAnimationAction.stop();
      this.currentAnimationAction = null;
    }

    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this);
  }

  /**
   * Calculates the idealCameraDistance and fieldOfViewAspect that allows the 3D
   * object to be framed tightly in a 2D window of any aspect ratio without
   * clipping at any camera orbit. The camera's center target point can be
   * optionally specified. If no center is specified, it defaults to the center
   * of the bounding box, which means asymmetric models will tend to be tight on
   * one side instead of both. Proper choice of center can correct this.
   */
  updateFraming(center: Vector3|null = null) {
    this.remove(this.modelContainer);

    if (center == null) {
      this.boundingBox.setFromObject(this.modelContainer);
      this.boundingBox.getSize(this.size);
      center = this.boundingBox.getCenter(new Vector3);
    }

    const radiusSquared = (value: number, vertex: Vector3): number => {
      return Math.max(value, center!.distanceToSquared(vertex));
    };
    const framedRadius =
        Math.sqrt(reduceVertices(this.modelContainer, radiusSquared));

    this.idealCameraDistance = framedRadius / SAFE_RADIUS_RATIO;

    const horizontalFov = (value: number, vertex: Vector3): number => {
      vertex.sub(center!);
      const radiusXZ = Math.sqrt(vertex.x * vertex.x + vertex.z * vertex.z);
      return Math.max(
          value, radiusXZ / (this.idealCameraDistance - Math.abs(vertex.y)));
    };
    this.fieldOfViewAspect =
        reduceVertices(this.modelContainer, horizontalFov) / DEFAULT_TAN_FOV;

    this.add(this.modelContainer);
  }
}
