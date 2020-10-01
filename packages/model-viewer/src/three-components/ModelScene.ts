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

import {Camera, Event as ThreeEvent, Matrix3, Object3D, PerspectiveCamera, Raycaster, Scene, Vector2, Vector3} from 'three';

import {USE_OFFSCREEN_CANVAS} from '../constants.js';
import ModelViewerElementBase from '../model-viewer-base.js';

import {Damper, SETTLING_TIME} from './Damper.js';
import Model, {DEFAULT_FOV_DEG} from './Model.js';

export interface ModelLoadEvent extends ThreeEvent {
  url: string
}

export interface ModelSceneConfig {
  element: ModelViewerElementBase;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

export type IlluminationRole = 'primary'|'secondary'

export const IlluminationRole: {[index: string]: IlluminationRole} = {
  Primary: 'primary',
  Secondary: 'secondary'
};

const DEFAULT_TAN_FOV = Math.tan((DEFAULT_FOV_DEG / 2) * Math.PI / 180);

const raycaster = new Raycaster();
const vector3 = new Vector3();

/**
 * A THREE.Scene object that takes a Model and CanvasHTMLElement and
 * constructs a framed scene based off of the canvas dimensions.
 * Provides lights and cameras to be used in a renderer.
 */
export class ModelScene extends Scene {
  public aspect = 1;
  public canvas: HTMLCanvasElement;
  public shadowIntensity = 0;
  public shadowSoftness = 1;
  public width = 1;
  public height = 1;
  public isDirty = false;
  public element: ModelViewerElementBase;
  public context: CanvasRenderingContext2D|ImageBitmapRenderingContext|null =
      null;
  public exposure = 1;
  public model: Model;
  public canScale = true;
  public framedFieldOfView = DEFAULT_FOV_DEG;
  public activeCamera: Camera;
  // These default camera values are never used, as they are reset once the
  // model is loaded and framing is computed.
  public camera = new PerspectiveCamera(45, 1, 0.1, 100);

  private goalTarget = new Vector3();
  private targetDamperX = new Damper();
  private targetDamperY = new Damper();
  private targetDamperZ = new Damper();

  constructor({canvas, element, width, height}: ModelSceneConfig) {
    super();

    this.name = 'ModelScene';

    this.element = element;
    this.canvas = canvas;
    this.model = new Model();

    // These default camera values are never used, as they are reset once the
    // model is loaded and framing is computed.
    this.camera = new PerspectiveCamera(45, 1, 0.1, 100);
    this.camera.name = 'MainCamera';

    this.activeCamera = this.camera;

    this.add(this.model);

    this.setSize(width, height);

    this.model.addEventListener(
        'model-load', (event: any) => this.onModelLoad(event));
  }

  /**
   * Function to create the context lazily, as when there is only one
   * <model-viewer> element, the renderer's 3D context can be displayed
   * directly. This extra context is necessary to copy the renderings into when
   * there are more than one.
   */
  createContext() {
    if (USE_OFFSCREEN_CANVAS) {
      this.context = this.canvas.getContext('bitmaprenderer')!;
    } else {
      this.context = this.canvas.getContext('2d')!;
    }
  }

  /**
   * Sets the model via URL.
   */
  async setModelSource(
      source: string|null, progressCallback?: (progress: number) => void) {
    try {
      await this.model.setSource(this.element, source, progressCallback);
    } catch (e) {
      throw new Error(
          `Could not set model source to '${source}': ${e.message}`);
    }
  }

  /**
   * Updates the ModelScene for a new container size in CSS pixels.
   */
  setSize(width: number, height: number) {
    if (this.width === width && this.height === height) {
      return;
    }
    this.width = Math.max(width, 1);
    this.height = Math.max(height, 1);

    this.aspect = this.width / this.height;
    this.frameModel();

    this.isDirty = true;
  }

  /**
   * Set's the framedFieldOfView based on the aspect ratio of the window in
   * order to keep the model fully visible at any camera orientation.
   */
  frameModel() {
    const vertical = DEFAULT_TAN_FOV *
        Math.max(1, this.model.fieldOfViewAspect / this.aspect);
    this.framedFieldOfView = 2 * Math.atan(vertical) * 180 / Math.PI;
  }

  /**
   * Returns the size of the corresponding canvas element.
   */
  getSize(): {width: number, height: number} {
    return {width: this.width, height: this.height};
  }

  /**
   * Returns the current camera.
   */
  getCamera(): Camera {
    return this.activeCamera;
  }

  /**
   * Sets the passed in camera to be used for rendering.
   */
  setCamera(camera: Camera) {
    this.activeCamera = camera;
  }

  /**
   * Called when the model's contents have loaded, or changed.
   */
  onModelLoad(event: {url: string}) {
    this.frameModel();
    this.setShadowIntensity(this.shadowIntensity);
    this.isDirty = true;
    this.dispatchEvent({type: 'model-load', url: event.url});
  }

  /**
   * Sets the point in model coordinates the model should orbit/pivot around.
   */
  setTarget(modelX: number, modelY: number, modelZ: number) {
    this.goalTarget.set(-modelX, -modelY, -modelZ);
  }

  /**
   * Gets the point in model coordinates the model should orbit/pivot around.
   */
  getTarget(): Vector3 {
    return vector3.copy(this.goalTarget).multiplyScalar(-1);
  }

  /**
   * Shifts the model to the target point immediately instead of easing in.
   */
  jumpToGoal() {
    this.updateTarget(SETTLING_TIME);
  }

  /**
   * This should be called every frame with the frame delta to cause the target
   * to transition to its set point.
   */
  updateTarget(delta: number) {
    const goal = this.goalTarget;
    const target = this.model.position;
    if (!goal.equals(target)) {
      const radius = this.model.idealCameraDistance;
      let {x, y, z} = target;
      x = this.targetDamperX.update(x, goal.x, delta, radius);
      y = this.targetDamperY.update(y, goal.y, delta, radius);
      z = this.targetDamperZ.update(z, goal.z, delta, radius);
      this.model.position.set(x, y, z);
      this.model.updateMatrixWorld();
      this.model.setShadowRotation(this.yaw);
      this.isDirty = true;
    }
  }

  /**
   * Yaw the +z (front) of the model toward the indicated world coordinates.
   */
  pointTowards(worldX: number, worldZ: number) {
    const {x, z} = this.position;
    this.yaw = Math.atan2(worldX - x, worldZ - z);
  }

  /**
   * Yaw is the scene's orientation about the y-axis, around the rotation
   * center.
   */
  set yaw(radiansY: number) {
    this.rotation.y = radiansY;
    this.model.setShadowRotation(radiansY);
    this.isDirty = true;
  }

  get yaw(): number {
    return this.rotation.y;
  }

  /**
   * Sets the shadow's intensity, lazily creating the shadow as necessary.
   */
  setShadowIntensity(shadowIntensity: number) {
    shadowIntensity = Math.max(shadowIntensity, 0);
    this.shadowIntensity = shadowIntensity;
    if (this.model.hasModel()) {
      this.model.setShadowIntensity(shadowIntensity, this.shadowSoftness);
    }
  }

  /**
   * Sets the shadow's softness by mapping a [0, 1] softness parameter to the
   * shadow's resolution. This involves reallocation, so it should not be
   * changed frequently. Softer shadows are cheaper to render.
   */
  setShadowSoftness(softness: number) {
    this.shadowSoftness = softness;
    this.model.setShadowSoftness(softness);
  }

  /**
   * This method returns the world position and model-space normal of the point
   * on the mesh corresponding to the input pixel coordinates given relative to
   * the model-viewer element. If the mesh is not hit, the result is null.
   */
  positionAndNormalFromPoint(pixelPosition: Vector2, object: Object3D = this):
      {position: Vector3, normal: Vector3}|null {
    raycaster.setFromCamera(pixelPosition, this.getCamera());
    const hits = raycaster.intersectObject(object, true);

    if (hits.length === 0) {
      return null;
    }

    const hit = hits[0];
    if (hit.face == null) {
      return null;
    }

    hit.face.normal.applyNormalMatrix(
        new Matrix3().getNormalMatrix(hit.object.matrixWorld));

    return {position: hit.point, normal: hit.face.normal};
  }
}
