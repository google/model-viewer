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

import {$needsRender, $onModelLoad, $onResize, $scene} from '../model-viewer-base.js';
import {FRAMED_HEIGHT} from '../three-components/ModelScene.js';
import {PatchedOrbitControls} from '../three-components/PatchedOrbitControls.js';

const ORBIT_NEAR_PLANE = 0.01;
const ORBIT_FAR_PLANE = 1000;

export const $controls = Symbol('controls');
const $updateOrbitCamera = Symbol('updateOrbitCamera');
const $onControlsChange = Symbol('onControlsChange');
const $orbitCamera = Symbol('orbitCamera');
const $defaultCamera = Symbol('defaultCamera');

export const ControlsMixin = (ModelViewerElement) => {
  return class extends ModelViewerElement {
    static get properties() {
      return {...super.properties, controls: {type: Boolean}};
    }

    constructor() {
      super();
      this[$onControlsChange] = this[$onControlsChange].bind(this);

      this[$defaultCamera] = this[$scene].getCamera();

      this[$orbitCamera] = this[$scene].camera.clone();
      this[$orbitCamera].near = ORBIT_NEAR_PLANE;
      this[$orbitCamera].far = ORBIT_FAR_PLANE;
      this[$orbitCamera].updateProjectionMatrix();
      this[$controls] = null;
    }

    update(changedProperties) {
      super.update(changedProperties);

      if (!changedProperties.has('controls')) {
        return;
      }

      if (this.controls) {
        this[$scene].setCamera(this[$orbitCamera]);

        this[$controls] =
            new PatchedOrbitControls(this[$orbitCamera], this[$scene].canvas);
        this[$controls].target.set(0, FRAMED_HEIGHT / 2, 0);
        this[$controls].enabled = true;
        // Panning performed via right click, two finger move
        this[$controls].enablePan = false;
        // Panning performed via arrow keys; possibly redundant with `enablePan`
        this[$controls].enableKeys = false;
        this[$controls].addEventListener('change', this[$onControlsChange]);

        this[$updateOrbitCamera]();

      } else {
        this[$scene].setCamera(this[$defaultCamera]);

        if (this[$controls]) {
          this[$controls].dispose();
          this[$controls].removeEventListener(
              'change', this[$onControlsChange]);
          this[$controls] = null;
        }
      }
    }

    /**
     * Copies over the default camera's values in order to frame
     * the scene correctly.
     */
    [$updateOrbitCamera]() {
      // The default camera already has positioned itself correctly
      // to frame the canvas. Copy its values.
      this[$orbitCamera].position.copy(this[$defaultCamera].position);
      this[$orbitCamera].aspect = this[$defaultCamera].aspect;
      this[$orbitCamera].rotation.set(0, 0, 0);
      this[$orbitCamera].updateProjectionMatrix();

      if (this[$controls]) {
        // Zooming out beyond the 'frame' doesn't serve much purpose
        // and will only end up showing the skysphere if zoomed out enough
        this[$controls].maxDistance = this[$orbitCamera].position.z;
      }
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
