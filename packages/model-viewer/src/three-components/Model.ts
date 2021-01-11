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

import ModelViewerElementBase, {$renderer} from '../model-viewer-base.js';

import {ModelViewerGLTFInstance} from './gltf-instance/ModelViewerGLTFInstance.js';
import {Hotspot} from './Hotspot.js';
import {ModelScene} from './ModelScene.js';
import {reduceVertices} from './ModelUtils.js';
import {Shadow, Side} from './Shadow.js';

export const DEFAULT_FOV_DEG = 45;
const DEFAULT_HALF_FOV = (DEFAULT_FOV_DEG / 2) * Math.PI / 180;
export const SAFE_RADIUS_RATIO = Math.sin(DEFAULT_HALF_FOV);
export const DEFAULT_TAN_FOV = Math.tan(DEFAULT_HALF_FOV);

const view = new Vector3();
const target = new Vector3();
const normalWorld = new Vector3();

/**
 * An Object3D that can swap out its underlying model.
 */
export default class Model extends Object3D {
  public shadow: Shadow|null = null;

  private _currentGLTF: ModelViewerGLTFInstance|null = null;
  private mixer: AnimationMixer;
  private cancelPendingSourceChange: (() => void)|null = null;
  private animationsByName: Map<string, AnimationClip> = new Map();
  private currentAnimationAction: AnimationAction|null = null;

  public animations: Array<AnimationClip> = [];
  public modelContainer = new Object3D();
  public animationNames: Array<string> = [];
  public boundingBox = new Box3();
  public size = new Vector3();
  public idealCameraDistance = 0;
  public fieldOfViewAspect = 0;
  public userData: {url: string|null} = {url: null};
  public url: string|null = null;
  public tightBounds = false;

  get currentGLTF() {
    return this._currentGLTF;
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
  async setObject(model: Object3D) {
    this.reset();
    this.modelContainer.add(model);
    this.updateBoundingBox();

    const scene = this.parent as ModelScene;
    let target = null;
    if (this.tightBounds === true) {
      await scene.element.requestUpdate('cameraTarget');
      target = scene.getTarget();
    }
    this.updateFraming(target);

    this.dispatchEvent({type: 'model-load'});
  }

  async setSource(
      element: ModelViewerElementBase, url: string|null,
      progressCallback?: (progress: number) => void) {
    if (!url || url === this.url) {
      if (progressCallback) {
        progressCallback(1);
      }
      return;
    }

    // If we have pending work due to a previous source change in progress,
    // cancel it so that we do not incur a race condition:
    if (this.cancelPendingSourceChange != null) {
      this.cancelPendingSourceChange!();
      this.cancelPendingSourceChange = null;
    }

    this.url = url;

    let gltf: ModelViewerGLTFInstance;

    try {
      gltf = await new Promise<ModelViewerGLTFInstance>(
          async (resolve, reject) => {
            this.cancelPendingSourceChange = () => reject();
            try {
              const result = await element[$renderer].loader.load(
                  url, element, progressCallback);
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

    this.reset();
    this._currentGLTF = gltf;

    if (gltf != null) {
      this.modelContainer.add(gltf.scene);
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

    this.updateBoundingBox();

    const scene = this.parent as ModelScene;
    let target = null;
    if (this.tightBounds === true) {
      await scene.element.requestUpdate('cameraTarget');
      target = scene.getTarget();
    }
    this.updateFraming(target);

    this.dispatchEvent({type: 'model-load', url});
  }

  set animationTime(value: number) {
    this.mixer.setTime(value);
  }

  get animationTime(): number {
    if (this.currentAnimationAction != null) {
      return this.currentAnimationAction.time;
    }

    return 0;
  }

  get duration(): number {
    if (this.currentAnimationAction != null &&
        this.currentAnimationAction.getClip()) {
      return this.currentAnimationAction.getClip().duration;
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

  reset() {
    this.url = null;
    this.userData = {url: null};
    const gltf = this._currentGLTF;
    // Remove all current children
    if (gltf != null) {
      for (const child of this.modelContainer.children) {
        this.modelContainer.remove(child);
      }
      gltf.dispose();
      this._currentGLTF = null;
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

    if (this.tightBounds === true) {
      const bound = (box: Box3, vertex: Vector3): Box3 => {
        return box.expandByPoint(vertex);
      };
      this.boundingBox = reduceVertices(this.modelContainer, bound, new Box3());
    } else {
      this.boundingBox.setFromObject(this.modelContainer);
    }
    this.boundingBox.getSize(this.size);

    this.add(this.modelContainer);
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
      center = this.boundingBox.getCenter(new Vector3);
    }

    const radiusSquared = (value: number, vertex: Vector3): number => {
      return Math.max(value, center!.distanceToSquared(vertex));
    };
    const framedRadius =
        Math.sqrt(reduceVertices(this.modelContainer, radiusSquared, 0));

    this.idealCameraDistance = framedRadius / SAFE_RADIUS_RATIO;

    const horizontalFov = (value: number, vertex: Vector3): number => {
      vertex.sub(center!);
      const radiusXZ = Math.sqrt(vertex.x * vertex.x + vertex.z * vertex.z);
      return Math.max(
          value, radiusXZ / (this.idealCameraDistance - Math.abs(vertex.y)));
    };
    this.fieldOfViewAspect =
        reduceVertices(this.modelContainer, horizontalFov, 0) / DEFAULT_TAN_FOV;

    this.add(this.modelContainer);
  }

  /**
   * Sets the shadow's intensity, lazily creating the shadow as necessary.
   */
  setShadowIntensity(
      shadowIntensity: number, shadowSoftness: number, side: Side) {
    let shadow = this.shadow;
    if (shadow != null) {
      shadow.setIntensity(shadowIntensity);
      shadow.setModel(this, shadowSoftness, side);
    } else if (shadowIntensity > 0) {
      shadow = new Shadow(this, shadowSoftness, side);
      shadow.setIntensity(shadowIntensity);
      this.shadow = shadow;
    }
  }

  /**
   * Sets the shadow's softness by mapping a [0, 1] softness parameter to the
   * shadow's resolution. This involves reallocation, so it should not be
   * changed frequently. Softer shadows are cheaper to render.
   */
  setShadowSoftness(softness: number) {
    const shadow = this.shadow;
    if (shadow != null) {
      shadow.setSoftness(softness);
    }
  }

  /**
   * The shadow must be rotated manually to match any global rotation applied to
   * this model. The input is the global orientation about the Y axis.
   */
  setShadowRotation(radiansY: number) {
    const shadow = this.shadow;
    if (shadow != null) {
      shadow.setRotation(radiansY);
    }
  }

  /**
   * Call to check if the shadow needs an updated render; returns true if an
   * update is needed and resets the state.
   */
  isShadowDirty(): boolean {
    const shadow = this.shadow;
    if (shadow == null) {
      return false;
    } else {
      const {needsUpdate} = shadow;
      shadow.needsUpdate = false;
      return needsUpdate;
    }
  }

  /**
   * Shift the floor vertically from the bottom of the model's bounding box by
   * offset (should generally be negative).
   */
  setShadowScaleAndOffset(scale: number, offset: number) {
    const shadow = this.shadow;
    if (shadow != null) {
      shadow.setScaleAndOffset(scale, offset);
    }
  }

  /**
   * The following methods are for operating on the set of Hotspot objects
   * attached to the scene. These come from DOM elements, provided to slots by
   * the Annotation Mixin.
   */
  addHotspot(hotspot: Hotspot) {
    this.add(hotspot);
  }

  removeHotspot(hotspot: Hotspot) {
    this.remove(hotspot);
  }

  /**
   * Helper method to apply a function to all hotspots.
   */
  forHotspots(func: (hotspot: Hotspot) => void) {
    const {children} = this;
    for (let i = 0, l = children.length; i < l; i++) {
      const hotspot = children[i];
      if (hotspot instanceof Hotspot) {
        func(hotspot);
      }
    }
  }

  /**
   * Update the CSS visibility of the hotspots based on whether their normals
   * point toward the camera.
   */
  updateHotspots(viewerPosition: Vector3) {
    this.forHotspots((hotspot) => {
      view.copy(viewerPosition);
      target.setFromMatrixPosition(hotspot.matrixWorld);
      view.sub(target);
      normalWorld.copy(hotspot.normal).transformDirection(this.matrixWorld);
      if (view.dot(normalWorld) < 0) {
        hotspot.hide();
      } else {
        hotspot.show();
      }
    });
  }

  /**
   * Rotate all hotspots to an absolute orientation given by the input number of
   * radians. Zero returns them to upright.
   */
  orientHotspots(radians: number) {
    this.forHotspots((hotspot) => {
      hotspot.orient(radians);
    });
  }

  /**
   * Set the rendering visibility of all hotspots. This is used to hide them
   * during transitions and such.
   */
  setHotspotsVisibility(visible: boolean) {
    this.forHotspots((hotspot) => {
      hotspot.visible = visible;
    });
  }
}
