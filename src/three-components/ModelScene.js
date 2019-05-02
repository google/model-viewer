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

import {Box3, Color, DirectionalLight, HemisphereLight, Mesh, MeshBasicMaterial, Object3D, PerspectiveCamera, Scene, SphereBufferGeometry, Vector3} from 'three';

import {resolveDpr} from '../utils.js';

import Model from './Model.js';
import StaticShadow from './StaticShadow.js';

// Valid types for `setScaleType` -- 'framed' scales the model
// so that it fits within its 2D plane nicely. 'lifesize' is
// unaltered scaling and uses whatever size the model provides,
// such that 1 unit === 1 meter, used in AR.
export const ScaleTypes = {
  Framed: 'framed',
  Lifesize: 'lifesize',
};

export const IlluminationRole = {
  Primary: 'primary',
  Secondary: 'secondary'
};

const ScaleTypeNames = Object.keys(ScaleTypes).map(type => ScaleTypes[type]);

// The model is sized to the room, and if too perfect of a fit,
// the front of the model becomes clipped by the near plane. Rather than
// change the near plane or camera's position (if we wanted to implement a
// visible "room" in the future where framing needs to be precise), we shrink
// the room by a little bit so it's always slightly bigger than the model.
export const ROOM_PADDING_SCALE = 1.01;

const AMBIENT_LIGHT_LOW_INTENSITY = 0.0;
const DIRECTIONAL_LIGHT_LOW_INTENSITY = 2.0;

const AMBIENT_LIGHT_HIGH_INTENSITY = 3.0;
const DIRECTIONAL_LIGHT_HIGH_INTENSITY = 4.0;

const $paused = Symbol('paused');
const $modelAlignmentMask = Symbol('modelAlignmentMask');

/**
 * A THREE.Scene object that takes a Model and CanvasHTMLElement and
 * constructs a framed scene based off of the canvas dimensions.
 * Provides lights and cameras to be used in a renderer.
 */
export default class ModelScene extends Scene {
  /**
   * @param {ModelViewerElementBase} options.element
   * @param {CanvasHTMLElement} options.canvas
   * @param {number} options.width
   * @param {number} options.height
   * @param {THREE.WebGLRenderer} options.renderer
   */
  constructor({canvas, element, width, height, renderer}) {
    super();

    this.name = 'ModelScene';

    this.onModelLoad = this.onModelLoad.bind(this);
    this[$paused] = false;

    this.element = element;
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.renderer = renderer;
    this.scaleType = ScaleTypes.Lifesize;
    this.exposure = 1;
    this[$modelAlignmentMask] = new Vector3(1, 1, 1);

    this.model = new Model();
    this.shadow = new StaticShadow();
    this.light =
        new HemisphereLight(0xBBBBBB, 0x444444, AMBIENT_LIGHT_HIGH_INTENSITY);
    this.light.name = 'HemisphereLight';
    this.light.position.set(2, 4, 2);

    // This light is only for generating (fake) shadows
    // and does not needed to be added to the scene.
    // @see StaticShadow.js
    this.shadowLight =
        new DirectionalLight(0xffffff, DIRECTIONAL_LIGHT_HIGH_INTENSITY);
    this.shadowLight.position.set(0, 10, 0);
    this.shadowLight.name = 'ShadowLight';

    this.camera = new PerspectiveCamera(45, this.aspect, 0.1, 100);
    this.camera.name = 'MainCamera';

    this.activeCamera = this.camera;
    this.pivot = new Object3D();
    this.pivot.name = 'Pivot';

    this.add(this.pivot);
    this.add(this.light);
    this.add(this.shadowLight);
    this.pivot.add(this.model);

    this.isVisible = false;
    this.isDirty = false;

    this.framedHeight = 1;
    this.modelSizeXZ = 1;
    this.setSize(width, height);

    this.background = new Color(0xffffff);

    this.model.addEventListener('model-load', this.onModelLoad);
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
   * Sets the model via URL.
   *
   * @param {String?} source
   * @param {Function?} progressCallback
   */
  async setModelSource(source, progressCallback) {
    try {
      await this.model.setSource(source, progressCallback);
    } catch (e) {
      throw new Error(
          `Could not set model source to '${source}': ${e.message}`);
    }
  }

  /**
   * Configures the alignment of the model within the frame based on value
   * "masks". By default, the model will be aligned so that the center of its
   * bounding box volume is in the center of the frame on all axes. In order to
   * center the model this way, the model is translated by the delta between
   * the world center of the bounding volume and world center of the frame.
   *
   * The alignment mask allows this translation to be scaled or eliminated
   * completely for each of the three axes. So, setModelAlignment(1, 1, 1) will
   * center the model in the frame. setModelAlignment(0, 0, 0) will align the
   * model so that its root node origin is at [0, 0, 0] in the scene.
   *
   * @param {number} x
   * @param {number} y
   * @param {number} z
   */
  setModelAlignmentMask(...alignmentMaskValues) {
    this[$modelAlignmentMask].set(...alignmentMaskValues);
    this.alignModel();
    this.isDirty = true;
  }

  /**
   * Receives the size of the 2D canvas element to make according
   * adjustments in the scene.
   *
   * @param {number} width
   * @param {number} height
   */
  setSize(width, height) {
    if (width !== this.width || height !== this.height) {
      this.width = Math.max(width, 1);
      this.height = Math.max(height, 1);
      // In practice, invocations of setSize are throttled at the element level,
      // so no need to throttle here:
      this.applyCanvasSize();
    }
  }

  applyCanvasSize() {
    const dpr = resolveDpr();
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.aspect = this.width / this.height;

    const modelSize = this.model.size;
    this.framedHeight = ROOM_PADDING_SCALE *
        Math.max(
            modelSize.y, modelSize.x / this.aspect, modelSize.z / this.aspect);
    this.modelSizeXZ = Math.max(modelSize.x, modelSize.z);
  }

  configureStageLighting(intensityScale, illuminationRole) {
    this.light.intensity = intensityScale *
        (illuminationRole === IlluminationRole.Primary ?
             AMBIENT_LIGHT_HIGH_INTENSITY :
             AMBIENT_LIGHT_LOW_INTENSITY);
    this.shadowLight.intensity = intensityScale *
        (illuminationRole === IlluminationRole.Primary ?
             DIRECTIONAL_LIGHT_HIGH_INTENSITY :
             DIRECTIONAL_LIGHT_LOW_INTENSITY);
    this.isDirty = true;
  }

  /**
   * Returns the size of the corresponding canvas element.
   * @return {Object}
   */
  getSize() {
    return {width: this.width, height: this.height};
  }

  /**
   * Moves the model to be centered at the origin, with the move scaled by
   * $modelAlignmentMask
   */
  alignModel() {
    if (!this.model.hasModel() || this.model.size.length() === 0) {
      return;
    }

    this.resetModelPose();

    const modelCenter = this.model.boundingBox.getCenter(new Vector3());
    this.model.position.copy(modelCenter)
        .multiply(this[$modelAlignmentMask])
        .multiplyScalar(-1);
  }

  resetModelPose() {
    this.model.position.set(0, 0, 0);
    this.model.rotation.set(0, 0, 0);
    this.model.scale.set(1, 1, 1);
  }

  /**
   * Returns the current camera.
   * @return {THREE.PerspectiveCamera}
   */
  getCamera() {
    return this.activeCamera;
  }

  /**
   * Sets the passed in camera to be used for rendering.
   * @param {THREE.Camera}
   */
  setCamera(camera) {
    this.activeCamera = camera;
  }

  /**
   * Called when the model's contents have loaded, or changed.
   */
  onModelLoad(event) {
    this.applyCanvasSize();
    this.alignModel();
    this.updateStaticShadow();
    this.dispatchEvent({type: 'model-load', url: event.url});
  }

  /**
   * Called to update the shadow rendering when the room or model changes.
   */
  updateStaticShadow() {
    if (!this.model.hasModel() || this.model.size.length() === 0) {
      this.pivot.remove(this.shadow);
      return;
    }

    // Remove and cache the current pivot rotation so that the shadow's
    // capture is unrotated so it can be freely rotated when applied
    // as a texture.
    const currentRotation = this.pivot.rotation.y;
    this.pivot.rotation.y = 0;

    this.shadow.position.set(0, 0, 0);
    this.shadow.scale.x = this.modelSizeXZ;
    this.shadow.scale.z = this.modelSizeXZ;

    this.shadow.render(this.renderer.renderer, this, this.shadowLight);

    // Lazily add the shadow so we're only displaying it once it has
    // a generated texture.
    this.pivot.add(this.shadow);
    this.pivot.rotation.y = currentRotation;

    // This should be ultimately user-configurable,
    // but for now, move the shadow to the bottom of the model.
    this.shadow.position.y = -this.framedHeight / 2;
  }
}
