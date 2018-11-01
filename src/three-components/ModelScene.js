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

import {AmbientLight, Box3, DirectionalLight, Object3D, PerspectiveCamera, Scene, Vector3} from 'three';

import {fitWithinBox} from '../utils.js';

import Model from './Model.js';
import Shadow from './Shadow.js';

// Valid types for `setScaleType` -- 'framed' scales the model
// so that it fits within its 2D plane nicely. 'lifesize' is
// unaltered scaling and uses whatever size the model provides,
// such that 1 unit === 1 meter, used in AR.
export const ScaleTypes = {
  Framed: 'framed',
  Lifesize: 'lifesize',
};
const ScaleTypeNames = Object.keys(ScaleTypes).map(type => ScaleTypes[type]);

// This (arbitrary) value represents the height of the scene in
// meters. With a fixed dimension, we can scale everything accordingly
// to fit within this space and properly frame the model within view.
// For example, if the containing canvas is 800px x 400px, then the scene
// would be 20m x 10m if FRAMED_HEIGHT === 10.
export const FRAMED_HEIGHT = 10;

// Vertical field of view of camera, in degrees.
const FOV = 45;

const DPR = window.devicePixelRatio;

const $paused = Symbol('paused');

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
    this[$paused] = false;

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

    this.roomBox = new Box3();
    this.modelSize = new Vector3();
    this.setSize(width, height);

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

    // Use the room width as the room depth as well, since
    // the model can rotate on its Y axis
    const roomWidth = this.aspect * FRAMED_HEIGHT;
    this.roomBox.min.set(roomWidth / -2, 0, roomWidth / -2);
    this.roomBox.max.set(roomWidth / 2, FRAMED_HEIGHT, roomWidth / 2);

    // Scale the model accordingly to the new room size
    this.setScaleType(this.scaleType);

    // Abort if our model is invalid or not yet loaded.
    if (this.modelSize.length() === 0) {
      return;
    }

    // Now we can reduce the depth of the room if we can
    // so we can get a closer shot. We take the larger of the x and z sizes
    // due to the rotation on the Y axis.
    this.roomBox.min.z = Math.max(this.modelSize.x, this.modelSize.z) / -2;
    this.roomBox.max.z = Math.max(this.modelSize.x, this.modelSize.z) / 2;

    // Position the camera such that the element is perfectly framed
    this.camera.near =
        (FRAMED_HEIGHT / 2) / Math.tan((FOV / 2) * Math.PI / 180);
    this.camera.aspect = this.aspect;
    this.camera.position.z = (this.roomBox.max.z) + this.camera.near;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Returns the size of the corresponding canvas element.
   * @return {Object}
   */
  getSize() {
    return {width: this.width, height: this.height};
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
      try {
        fitWithinBox(this.roomBox, this.model, this.modelSize);
      } catch (e) {
        console.warn('Could not scale model that does not contain geometry.');
      }
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
    this.setSize(this.width, this.height);
    this.dispatchEvent({type: 'model-load'});
  }
}
