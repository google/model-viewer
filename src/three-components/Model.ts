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

import {AnimationAction, AnimationClip, AnimationMixer, Box3, Material, Mesh, MeshStandardMaterial, Object3D, Scene, Texture, Vector3} from 'three';

import {$releaseFromCache, CacheRetainedScene, CachingGLTFLoader} from './CachingGLTFLoader.js';
import {moveChildren, reduceVertices} from './ModelUtils.js';

const $cancelPendingSourceChange = Symbol('cancelPendingSourceChange');
const $currentScene = Symbol('currentScene');

export const DEFAULT_FOV_DEG = 45;

const $loader = Symbol('loader');

/**
 * An Object3D that can swap out its underlying
 * model.
 */
export default class Model extends Object3D {
  private[$currentScene]: CacheRetainedScene|null = null;
  private[$loader] = new CachingGLTFLoader();
  private mixer = new AnimationMixer(null);
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
  }

  /**
   * Returns a boolean indicating whether or not there is a
   * loaded model attached.
   */
  hasModel(): boolean {
    return !!this.modelContainer.children.length;
  }

  applyEnvironmentMap(map: Texture|null) {
    // Note that unlit models (using MeshBasicMaterial) should not apply
    // an environment map, even though `map` is the currently configured
    // environment map.
    this.modelContainer.traverse((obj: Object3D) => {
      // There are some cases where `obj.material` is
      // an array of materials.
      const mesh: Mesh = obj as Mesh;

      if (Array.isArray(mesh.material)) {
        for (let material of (mesh.material as Array<Material>)) {
          if ((material as any).isMeshBasicMaterial) {
            continue;
          }
          (material as MeshStandardMaterial).envMap = map;
          material.needsUpdate = true;
        }
      } else if (mesh.material && !(mesh.material as any).isMeshBasicMaterial) {
        (mesh.material as MeshStandardMaterial).envMap = map;
        (mesh.material as Material).needsUpdate = true;
      }
    });
    this.dispatchEvent({type: 'envmap-change', value: map});
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

    let scene: Scene|null = null;

    try {
      scene = await new Promise<Scene|null>(async (resolve, reject) => {
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
    this[$currentScene] = scene as CacheRetainedScene;

    if (scene != null) {
      moveChildren(scene, this.modelContainer);
    }

    this.modelContainer.traverse(obj => {
      if (obj && obj.type === 'Mesh') {
        obj.castShadow = true;
      }
    });


    const animations = scene ? scene.userData.animations : [];
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
    // Remove all current children
    if (this[$currentScene] != null) {
      moveChildren(this.modelContainer, this[$currentScene]!);
      this[$currentScene]![$releaseFromCache]();
      this[$currentScene] = null;
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

    const halfFov = (DEFAULT_FOV_DEG / 2) * Math.PI / 180;
    this.idealCameraDistance = framedRadius / Math.sin(halfFov);
    const verticalFov = Math.tan(halfFov);

    const horizontalFov = (value: number, vertex: Vector3): number => {
      vertex.sub(center!);
      const radiusXZ = Math.sqrt(vertex.x * vertex.x + vertex.z * vertex.z);
      return Math.max(
          value, radiusXZ / (this.idealCameraDistance - Math.abs(vertex.y)));
    };
    this.fieldOfViewAspect =
        reduceVertices(this.modelContainer, horizontalFov) / verticalFov;

    this.add(this.modelContainer);
  }
}
