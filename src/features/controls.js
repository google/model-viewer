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

import {PerspectiveCamera, Spherical, Vector3} from 'three';

import {$ariaLabel, $needsRender, $onModelLoad, $onResize, $scene, $tick} from '../model-viewer-base.js';
import {FRAMED_HEIGHT} from '../three-components/ModelScene.js';
import {SmoothControls} from '../three-components/SmoothControls.js';

const HALF_PI = Math.PI / 2.0;
const THIRD_PI = Math.PI / 3.0;
const QUARTER_PI = HALF_PI / 2.0;
const PHI = 2.0 * Math.PI;

const AZIMUTHAL_QUADRANT_LABELS = ['front', 'right', 'back', 'left'];
const POLAR_TRIENT_LABELS = ['upper-', '', 'lower-'];

const ORBIT_NEAR_PLANE = 0.01;
const ORBIT_FAR_PLANE = 100;

export const IDLE_PROMPT_THRESHOLD_MS = 3000;
export const IDLE_PROMPT =
    'Use mouse, touch or arrow keys to control the camera!';

export const $controls = Symbol('controls');
const $updateOrbitCamera = Symbol('updateOrbitCamera');
const $orbitCamera = Symbol('orbitCamera');
const $defaultCamera = Symbol('defaultCamera');

const $blurHandler = Symbol('blurHandler');
const $focusHandler = Symbol('focusHandler');
const $changeHandler = Symbol('changeHandler');
const $onBlur = Symbol('onBlur');
const $onFocus = Symbol('onFocus');
const $onChange = Symbol('onChange');

const $shouldPromptUserToInteract = Symbol('shouldPromptUserToInteract');
const $waitingToPromptUser = Symbol('waitingToPromptUser');
const $userPromptedOnce = Symbol('userPromptedOnce');
const $idleTime = Symbol('idleTime');

const $lastSpherical = Symbol('lastSpherical');

export const $promptElement = Symbol('promptElement');

export const ControlsMixin = (ModelViewerElement) => {
  return class extends ModelViewerElement {
    static get properties() {
      return {...super.properties, controls: {type: Boolean}};
    }

    constructor() {
      super();

      this[$defaultCamera] = this[$scene].getCamera();

      this[$idleTime] = 0;
      this[$userPromptedOnce] = false;
      this[$waitingToPromptUser] = false;
      this[$shouldPromptUserToInteract] = true;

      this[$promptElement] = this.shadowRoot.querySelector('.controls-prompt');

      this[$orbitCamera] = this[$scene].camera.clone();
      this[$orbitCamera].near = ORBIT_NEAR_PLANE;
      this[$orbitCamera].far = ORBIT_FAR_PLANE;
      this[$orbitCamera].updateProjectionMatrix();
      this[$controls] = null;

      this[$lastSpherical] = new Spherical();

      this[$changeHandler] = () => this[$onChange]();
      this[$focusHandler] = () => this[$onFocus]();
      this[$blurHandler] = () => this[$onBlur]();
    }

    update(changedProperties) {
      super.update(changedProperties);

      if (!changedProperties.has('controls')) {
        return;
      }

      if (this.controls) {
        this[$scene].setCamera(this[$orbitCamera]);

        this[$controls] =
            new SmoothControls(this[$orbitCamera], this[$scene].canvas);
        this[$controls].target.set(0, FRAMED_HEIGHT / 2, 0);

        this[$controls].addEventListener('change', this[$changeHandler]);
        this[$scene].canvas.addEventListener('focus', this[$focusHandler]);
        this[$scene].canvas.addEventListener('blur', this[$blurHandler]);

        this[$updateOrbitCamera]();
      } else {
        this[$scene].setCamera(this[$defaultCamera]);

        if (this[$controls]) {
          this[$controls].removeEventListener('change', this[$changeHandler]);
          this[$scene].canvas.removeEventListener('focus', this[$focusHandler]);
          this[$scene].canvas.removeEventListener('blur', this[$blurHandler]);

          this[$controls].dispose();
          this[$controls] = null;
        }
      }
    }

    [$tick](time, delta) {
      super[$tick](time, delta);

      if (this[$waitingToPromptUser]) {
        this[$idleTime] += delta;

        if (this[$idleTime] > IDLE_PROMPT_THRESHOLD_MS) {
          this[$scene].canvas.setAttribute('aria-label', IDLE_PROMPT);

          // NOTE(cdata): After notifying users that the controls are available,
          // we flag that the user has been prompted at least once, and then
          // effectively stop the idle timer. If the camera orbit changes after
          // this point, the user will never be prompted again for this
          // particular <model-element> instance:
          this[$userPromptedOnce] = true;
          this[$waitingToPromptUser] = false;

          this[$promptElement].classList.add('visible');
        }
      }

      if (this[$controls]) {
        this[$controls].update(time, delta);
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
        this[$controls].applyOptions(
            {maximumRadius: this[$orbitCamera].position.z});
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

    [$onFocus]() {
      const {canvas} = this[$scene];

      // NOTE(cdata): On every re-focus, we switch the aria-label back to the
      // original, non-prompt label if appropriate. If the user has already
      // interacted, they no longer need to hear the prompt. Otherwise, they
      // will hear it again after the idle prompt threshold has been crossed.
      const ariaLabel = this[$ariaLabel];

      if (canvas.getAttribute('aria-label') !== ariaLabel) {
        canvas.setAttribute('aria-label', ariaLabel);
      }

      // NOTE(cdata): When focused, if the user has yet to interact with the
      // camera controls (that is, we "should" prompt the user), we begin the
      // idle timer and indicate that we are waiting for it to cross the
      // prompt threshold:
      if (this[$shouldPromptUserToInteract]) {
        this[$waitingToPromptUser] = true;
        this[$idleTime] = 0;
      }
    }

    [$onBlur]() {
      this[$waitingToPromptUser] = false;
      this[$promptElement].classList.remove('visible');
    }

    [$onChange](e) {
      this[$needsRender]();

      // Effectively cancel the timer waiting for user interaction:
      this[$waitingToPromptUser] = false;
      this[$promptElement].classList.remove('visible');

      // NOTE(cdata): On change (in other words, the camera has adjusted its
      // orbit), if the user has been prompted at least once already, we no
      // longer need to prompt the user in the future.
      if (this[$userPromptedOnce]) {
        this[$shouldPromptUserToInteract] = false;
      }

      const {theta: lastTheta, phi: lastPhi} = this[$lastSpherical];
      const {theta, phi} =
          this[$controls].getCameraSpherical(this[$lastSpherical]);

      const lastAzimuthalQuadrant =
          (4 + Math.floor(((lastTheta % PHI) + QUARTER_PI) / HALF_PI)) % 4;
      const azimuthalQuadrant =
          (4 + Math.floor(((theta % PHI) + QUARTER_PI) / HALF_PI)) % 4;

      const lastPolarTrient = Math.floor(lastPhi / THIRD_PI);
      const polarTrient = Math.floor(phi / THIRD_PI);

      if (azimuthalQuadrant !== lastAzimuthalQuadrant ||
          polarTrient !== lastPolarTrient) {
        const {canvas} = this[$scene];
        const azimuthalQuadrantLabel =
            AZIMUTHAL_QUADRANT_LABELS[azimuthalQuadrant];
        const polarTrientLabel = POLAR_TRIENT_LABELS[polarTrient];

        const ariaLabel =
            `View from stage ${polarTrientLabel}${azimuthalQuadrantLabel}`;

        canvas.setAttribute('aria-label', ariaLabel);
      }
    }
  };
};
