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

export default class ModelView extends EventDispatcher {
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

    // DEBUG
    window.view = this;
  }

  setModelSource(source, type) {
    this.model.setSource(source, type);
  }

  hasAR() {
    return this.arView.hasAR();
  }

  whenARReady() {
    return this.arView.whenARReady();
  }

  setSize(width, height) {
    this.width = width;
    this.height = height;
    this.domView.setSize(width, height);
  }

  enterDOM() {
    this.mode = 'dom';
    this.arView.stop();
    this.resetModel();
    this.domView.start();
    this.domView.setSize(this.width, this.height);
    this.dispatchEvent({ type: 'enter-dom' });
  }

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
   * Called when AR mode is shut down.
   */
  onAREnd() {
    this.enterDOM();
  }

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

  resetModel() {
    this.model.position.set(0, 0, 0);
    this.model.rotation.set(0, 0, 0);
    this.updateModelScale();
  }
}
