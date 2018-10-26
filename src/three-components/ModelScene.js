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

import {
  AmbientLight,
  DirectionalLight,
  Scene,
  Object3D,
  PerspectiveCamera,
} from 'three';
import Model from './Model.js';
import Shadow from './Shadow.js';
import {setScaleFromLimit} from '../utils.js';

// Valid types for `setScaleType` -- 'framed' scales the model
// so that it fits within its 2D plane nicely. 'lifesize' is
// unaltered scaling and uses whatever size the model provides,
// such that 1 unit === 1 meter, used in AR.
export const ScaleTypes = {
  Framed: 'framed',
  Lifesize: 'lifesize',
};
const ScaleTypeNames = Object.keys(ScaleTypes).map(type => ScaleTypes[type]);

// The max size (width or height) of the canvas in meters.
// This normalizes all of our scaling and camera positions to
// properly frame the model within view. For example, if
// the containing canvas is 800px x 400px, then the scene
// would be 10m x 5m if FRAMED_SIZE === 10.
export const FRAMED_SIZE = 10;

// Vertical field of view of camera, in degrees.
const FOV = 45;

const DPR = window.devicePixelRatio;

/**
 * A THREE.Scene object that takes a Model and CanvasHTMLElement and
 * constructs a framed scene based off of the canvas dimensions.
 * Provides lights and cameras to be used in a renderer.
 */
export default class ModelScene extends Scene {
  /**
   * @param {XRModelElement} options.element
   * @param {CanvasHTMLElement} options.canvas
   * @param {number} options.width
   * @param {number} options.height
   */
  constructor({canvas, element, width, height}) {
    super();

    this.onModelLoad = this.onModelLoad.bind(this);

    this.element = element;
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.scaleType = ScaleTypes.Framed;

    this.model = new Model();
    this.shadow = new Shadow();
    this.light = new AmbientLight(0xffffff, 0.9);
    this.directionalLight = new DirectionalLight(0xffffff, 2);
    this.directionalLight.position.set(0, 10, 1);
    this.directionalLight.castShadow = true;

    this.camera = new PerspectiveCamera(FOV, this.aspect, 0.1, 100);
    this.camera.position.z = 15;
    this.camera.position.y = 5;
    this.activeCamera = this.camera;
    this.pivot = new Object3D();

    this.add(this.pivot);
    this.add(this.shadow);
    this.add(this.light);
    this.add(this.directionalLight);
    this.pivot.add(this.model);

    this.isDirty = false;
    this.hasLoaded = false;
    this.model.addEventListener('model-load', this.onModelLoad);

    this.setSize(width, height);
  }

  /**
   * Sets the model via URL.
   *
   * @param {String} source
   */
  async setModelSource(source) {
    try {
      await this.model.setSource(source);
    } catch (e) {
      console.error(`Could not set model source: ${source}`);
    }
  }

  /**
   * Receives the size of the 2D canvas element to make according
   * adjustments in the scene.
   *
   * @param {number} width
   * @param {number} height
   */
  setSize(width, height) {
    this.width = Math.max(width, 1);
    this.height = Math.max(height, 1);
    this.aspect = this.width / this.height;
    this.canvas.width = this.width * DPR;
    this.canvas.height = this.height * DPR;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.camera.aspect = this.aspect;
    this.camera.updateProjectionMatrix();
    this.setScaleType(this.scaleType);
  }

  /**
   * Returns the size of the corresponding canvas element.
   * @return {Object}
   */
  getSize() {
    return { width: this.width, height: this.height };
  }

  /**
   * Sets the type of scaling that should be performed on the model.
   * @see ScaleTypes
   *
   * @param {ScaleTypes} type
   */
  setScaleType(type) {
    if (ScaleTypeNames.indexOf(type) === -1) {
      throw new Error(`Unknown scale type ${type}.`);
    }

    if (!this.hasLoaded) {
      return;
    }

    // Always reset
    this.model.position.set(0, 0, 0);
    this.model.rotation.set(0, 0, 0);
    this.model.scale.set(1, 1, 1);

    if (type === ScaleTypes.Framed) {
      setScaleFromLimit(FRAMED_SIZE, this.model);
    }
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
  onModelLoad() {
    this.hasLoaded = true;
    this.setScaleType(this.scaleType);
    this.dispatchEvent({ type: 'model-load' });
  }
}
