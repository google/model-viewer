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

import DOMModelView from './DOMModelView.js';
import ARModelView from './ARModelView.js';
import Model from '../three-components/Model.js';

export default class ModelView {
  constructor({ canvas, width, height }) {
    this.width = width;
    this.height = height;

    this.mode = null;

    const model = this.model = new Model();
    this.domView = new DOMModelView({ canvas, model, width, height });
    this.arView = this.hasAR() ? new ARModelView({ canvas, model }) : null;

    this.enterDOM();
  }

  setModelSource(source, type) {
    this.model.setSource(source, type);
  }

  hasAR() {
    return navigator.xr && window.XRSession && window.XRSession.prototype.requestHitTest;
  }

  setSize(width, height) {
    this.width = width;
    this.height = height;
    this.domView.setSize(width, height);
  }

  enterDOM() {
    this.mode = 'dom';
    this.domView.start();
    if (this.arView) {
      this.arView.stop();
    }
  }

  enterAR() {
    if (!this.hasAR()) {
      return;
    }
    this.mode = 'ar';
    this.domView.stop();
    this.arView.start();
  }
}
