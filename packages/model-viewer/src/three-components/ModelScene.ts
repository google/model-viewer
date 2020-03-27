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

import {Camera, Event as ThreeEvent, Matrix4, PerspectiveCamera, Raycaster, Scene, Vector2} from 'three';

import {USE_OFFSCREEN_CANVAS} from '../constants.js';
import ModelViewerElementBase, {$needsRender, $renderer, toVector3D, Vector3D} from '../model-viewer-base.js';

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

const pixelPosition = new Vector2();
const raycaster = new Raycaster();

const $paused = Symbol('paused');

/**
 * A THREE.Scene object that takes a Model and CanvasHTMLElement and
 * constructs a framed scene based off of the canvas dimensions.
 * Provides lights and cameras to be used in a renderer.
 */
export class ModelScene extends Scene {
  private[$paused]: boolean = false;

  public aspect = 1;
  public canvas: HTMLCanvasElement;
  public shadowIntensity = 0;
  public shadowSoftness = 1;
  public width = 1;
  public height = 1;
  public isDirty: boolean = false;
  public element: ModelViewerElementBase;
  public context: CanvasRenderingContext2D|ImageBitmapRenderingContext|null =
      null;
  public exposure = 1;
  public model: Model;
  public framedFieldOfView = DEFAULT_FOV_DEG;
  public activeCamera: Camera;
  // These default camera values are never used, as they are reset once the
  // model is loaded and framing is computed.
  public camera = new PerspectiveCamera(45, 1, 0.1, 100);

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

  get paused() {
    return this[$paused];
  }

  pause() {
    this[$paused] = true;
  }

  resume() {
    this[$paused] = false;
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
      await this.model.setSource(source, progressCallback);
    } catch (e) {
      throw new Error(
          `Could not set model source to '${source}': ${e.message}`);
    }
  }

  /**
   * Receives the size of the 2D canvas element to make according
   * adjustments in the scene.
   */
  setSize(width: number, height: number) {
    if (width !== this.width || height !== this.height) {
      this.width = Math.max(width, 1);
      this.height = Math.max(height, 1);

      this.aspect = this.width / this.height;
      this.frameModel();

      const renderer = this.element[$renderer];
      renderer.expandTo(this.width, this.height);
      this.canvas.width = renderer.width;
      this.canvas.height = renderer.height;

      // Immediately queue a render to happen at microtask timing. This is
      // necessary because setting the width and height of the canvas has the
      // side-effect of clearing it, and also if we wait for the next rAF to
      // render again we might get hit with yet-another-resize, or worse we
      // may not actually be marked as dirty and so render will just not
      // happen. Queuing a render to happen here means we will render twice on
      // a resize frame, but it avoids most of the visual artifacts associated
      // with other potential mitigations for this problem. See discussion in
      // https://github.com/GoogleWebComponents/model-viewer/pull/619 for
      // additional considerations.
      Promise.resolve().then(() => {
        renderer.render(performance.now());
      });
    }
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
    this.element[$needsRender]();
    this.dispatchEvent({type: 'model-load', url: event.url});
  }

  /**
   * Sets the point in model coordinates the model should model around. The
   * height of the floor is recorded in pivotCenter.y.
   */
  setRotationCenter(x: number, z: number) {
    const floorHeight = this.model.boundingBox.min.y;
    this.model.position.set(-x, -floorHeight, -z);
  }

  pointTowards(worldX: number, worldZ: number) {
    const {x, z} = this.position;
    this.setRotation(Math.atan2(worldX - x, worldZ - z));
  }

  setRotation(radiansY: number) {
    this.rotation.y = radiansY;
    this.model.setShadowRotation(radiansY)
  }

  getRotation(): number {
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
   * This method returns the world position and normal of the point on the
   * mesh corresponding to the input pixel coordinates given relative to the
   * model-viewer element. The position and normal are returned as strings in
   * the format suitable for putting in a hotspot's data-position and
   * data-normal attributes. If the mesh is not hit, position returns the
   * empty string.
   */
  positionAndNormalFromPoint(pixelX: number, pixelY: number):
      {position: Vector3D, normal: Vector3D}|null {
    pixelPosition.set(pixelX / this.width, pixelY / this.height)
        .multiplyScalar(2)
        .subScalar(1);
    pixelPosition.y *= -1;
    raycaster.setFromCamera(pixelPosition, this.getCamera());
    const hits = raycaster.intersectObject(this, true);

    if (hits.length === 0) {
      return null;
    }

    const hit = hits[0];
    if (hit.face == null) {
      return null;
    }

    const worldToPivot = new Matrix4().getInverse(this.model.matrixWorld);
    const position = toVector3D(hit.point.applyMatrix4(worldToPivot));
    const normal =
        toVector3D(hit.face.normal.transformDirection(hit.object.matrixWorld)
                       .transformDirection(worldToPivot));
    return {position: position, normal: normal};
  }
}
