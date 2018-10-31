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

import {PerspectiveCamera, Vector3} from 'three';

import OrbitControls from '../third_party/three/OrbitControls.js';
import {$onResize, $onModelLoad, $scene, $needsRender} from '../xr-model-element-base.js';

const $updateOrbitCamera = Symbol('updateOrbitCamera');
const $controls = Symbol('controls');
const $onControlsChange = Symbol('onControlsChange');
const $orbitCamera = Symbol('orbitCamera');
const $defaultCamera = Symbol('defaultCamera');

export const ControlsMixin = (XRModelElement) => {
  return class extends XRModelElement {
    static get properties() {
      return {...super.properties, controls: {type: Boolean}};
    }

    constructor() {
      super();
      this[$onControlsChange] = this[$onControlsChange].bind(this);

      const {width, height} = this.getBoundingClientRect();

      const scene = this[$scene];
      this[$defaultCamera] = scene.getCamera();

      this[$orbitCamera] = scene.camera.clone();
      this[$controls] = new OrbitControls(this[$orbitCamera], scene.canvas);
      this[$controls].enabled = false;
    }

    connectedCallback() {
      super.connectedCallback();
      this[$controls].addEventListener('change', this[$onControlsChange]);
    }

    disconnectedCallback() {
      super.disconnectedCallback();
      this[$controls].removeEventListener('change', this[$onControlsChange]);
    }

    update(changedProperties) {
      super.update(changedProperties);

      const enabled = this.controls;

      this[$controls].enabled = enabled;

      if (enabled) {
        this[$scene].setCamera(this[$orbitCamera]);
      } else {
        this[$scene].setCamera(this[$defaultCamera]);
      }
    }

    /**
     * Copies over the default camera's values in order to frame
     * the scene correctly.
     */
    [$updateOrbitCamera]() {
      // The default camera already has positioned itself correctly
      // to frame the canvas. Copy its values.
      this[$controls].target.set(0, 5, 0);
      this[$orbitCamera].position.copy(this[$defaultCamera].position);
      this[$orbitCamera].aspect = this[$defaultCamera].aspect;
      this[$orbitCamera].rotation.set(0, 0, 0);
      this[$orbitCamera].updateProjectionMatrix();
    }

    [$onResize](e) {
      super[$onResize](e);
      this[$updateOrbitCamera]();
    }

    [$onModelLoad](e) {
      super[$onModelLoad](e);
      this[$updateOrbitCamera]();
    }

    [$onControlsChange](e) {
      this[$needsRender]();
    }
  };
};
