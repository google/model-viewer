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

import { EventDispatcher } from 'three';
import DOMModelView from './DOMModelView.js';
import ARModelView from './ARModelView.js';
import Model from '../three-components/Model.js';
import { setScaleFromLimit } from '../utils.js';

const BOUNDING_BOX_SIZE = 10;

/**
 * Wrapper around the underlying DOMModelView and ARModelView
 * and coordinates between the two determining when they should
 * be enabled and rendered.
 */
export default class ModelView extends EventDispatcher {
  /**
   * @param {Object} config
   * @param {HTMLCanvasElement} config.canvas
   * @param {number} config.width
   * @param {number} config.height
   */
  constructor({ canvas, width, height }) {
    super();

    this.width = width;
    this.height = height;

    this.mode = null;
    this.updateModelScale = this.updateModelScale.bind(this);
    this.onAREnd = this.onAREnd.bind(this);
    this.onARStabilized = this.onARStabilized.bind(this);

    const model = this.model = new Model();
    const context = canvas.getContext('webgl', {
      preserveDrawingBuffer: true,
      antialias: true,
    });
    this.domView = new DOMModelView({ canvas, context, model, width, height });
    this.arView = new ARModelView({ canvas, context, model });

    this.arView.addEventListener('end', this.onAREnd);
    this.arView.addEventListener('stabilized', this.onARStabilized);
    this.model.addEventListener('model-load', this.updateModelScale);
    this.enterDOM();
  }

  /**
   * Sets the model via URL.
   *
   * @param {String} source
   * @param {?String} type
   */
  setModelSource(source, type) {
    this.model.setSource(source, type);
  }

  /**
   * Whether or not this platform supports WebXR AR features.
   *
   * @return {Boolean}
   */
  hasAR() {
    return this.arView.hasAR();
  }

  /**
   * Returns a promise that is resolved once WebXR can start
   * an AR experience. Rejects if platform does not support AR.
   *
   * @return {Promise<XRDevice>}
   */
  whenARReady() {
    return this.arView.whenARReady();
  }

  /**
   * Sets the size of the DOMModelView.
   *
   * @param {number} width
   * @param {number} height
   */
  setSize(width, height) {
    this.width = width;
    this.height = height;
    this.domView.setSize(width, height);
    this.updateModelScale();
  }

  /**
   * Returns the width/height of DOMModelView.
   *
   * @return {Object}
   */
  getSize() {
    return {
      width: this.width,
      height: this.height,
    };
  }

  /**
   * Starts the DOM player, disables other views.
   */
  enterDOM() {
    this.mode = 'dom';
    this.arView.stop();
    this.resetModel();
    this.domView.start();
    this.domView.setSize(this.width, this.height);
    this.dispatchEvent({ type: 'enter-dom' });
  }

  /**
   * Starts the AR player, disables other views.
   */
  enterAR() {
    if (!this.hasAR()) {
      return;
    }

    this.mode = 'ar';
    this.domView.stop();
    this.resetModel();
    this.arView.start();
    this.dispatchEvent({ type: 'enter-ar' });
  }

  /**
   * Sets the auto rotation option via boolean.
   *
   * @param {Boolean} isEnabled
   */
  setRotate(isEnabled) {
    this.domView.setRotate(isEnabled);
  }

  /**
   * Sets orbit controls via boolean.
   *
   * @param {Boolean} isEnabled
   */
  setControls(isEnabled) {
    this.domView.setControls(isEnabled);
  }

  /**
   * Sets background color of DOMModelView.
   *
   * @param {String} color
   */
  setBackgroundColor(color) {
    this.domView.setBackgroundColor(color);
  }

  /**
   * Enables or disables vignette post processing for DOMModelView.
   *
   * @param {Boolean} isEnabled
   */
  setVignette(isEnabled) {
    this.domView.setVignette(isEnabled);
  }

  /**
   * Called when AR mode is shut down.
   */
  onAREnd() {
    this.enterDOM();
  }

  /**
   * Called when a plane is found in AR mode.
   */
  onARStabilized() {
    this.dispatchEvent({ type: 'stabilized' });
  }

  /**
   * Updates the scale of the model, called when a new model is loaded,
   * or when switching modes. In the DOM view, we want it to fit as large
   * as it can within a cube of BOUNDING_BOX_SIZE, and for AR, we want it
   * to be the original scale.
   */
  updateModelScale() {
    if (this.mode === 'dom') {
      setScaleFromLimit(BOUNDING_BOX_SIZE, this.model);
    } else {
      this.model.scale.set(1, 1, 1);
    }
  }

  /**
   * Resets the models scale, position and rotation.
   */
  resetModel() {
    this.model.position.set(0, 0, 0);
    this.model.rotation.set(0, 0, 0);
    this.updateModelScale();
  }
}
