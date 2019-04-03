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

import {property} from 'lit-element';
import {PerspectiveCamera, Spherical, Event} from 'three';

import {deserializeSpherical} from '../conversions.js';
import ModelViewerElementBase, {$ariaLabel, $needsRender, $onModelLoad, $onResize, $scene, $tick, $onUserModelOrbit} from '../model-viewer-base.js';
import {FRAMED_HEIGHT} from '../three-components/ModelScene.js';
import {SmoothControls, ChangeEvent} from '../three-components/SmoothControls.js';
import {Constructor} from '../utilities.js';

export interface SphericalPosition {
  theta: number;
  phi: number;
  radius: number;
}


const DEFAULT_CAMERA_ORBIT = '0deg 75deg auto';

const HALF_PI = Math.PI / 2.0;
const THIRD_PI = Math.PI / 3.0;
const QUARTER_PI = HALF_PI / 2.0;
const PHI = 2.0 * Math.PI;

const AZIMUTHAL_QUADRANT_LABELS = ['front', 'right', 'back', 'left'];
const POLAR_TRIENT_LABELS = ['upper-', '', 'lower-'];

const ORBIT_CAMERA_NEAR_PLANE = FRAMED_HEIGHT / 10.0;
const ORBIT_CAMERA_FAR_PLANE = FRAMED_HEIGHT * 10.0;

export const DEFAULT_INTERACTION_PROMPT_THRESHOLD = 3000;
export const INTERACTION_PROMPT =
    'Use mouse, touch or arrow keys to control the camera!';

export const $controls = Symbol('controls');
export const $promptElement = Symbol('promptElement');

const $deferInteractionPrompt = Symbol('deferInteractionPrompt');
const $updateAria = Symbol('updateAria');
const $updateOrbitCamera = Symbol('updateOrbitCamera');
const $orbitCamera = Symbol('orbitCamera');
const $defaultCamera = Symbol('defaultCamera');

const $blurHandler = Symbol('blurHandler');
const $focusHandler = Symbol('focusHandler');
const $changeHandler = Symbol('changeHandler');
const $promptTransitionendHandler = Symbol('promptTransitionendHandler');

const $onBlur = Symbol('onBlur');
const $onFocus = Symbol('onFocus');
const $onChange = Symbol('onChange');
const $onPromptTransitionend = Symbol('onPromptTransitionend');

const $shouldPromptUserToInteract = Symbol('shouldPromptUserToInteract');
const $waitingToPromptUser = Symbol('waitingToPromptUser');
const $userPromptedOnce = Symbol('userPromptedOnce');
const $idleTime = Symbol('idleTime');

const $lastSpherical = Symbol('lastSpherical');

export const ControlsMixin = (ModelViewerElement:
                                  Constructor<ModelViewerElementBase>):
    Constructor<ModelViewerElementBase> => {
      class ControlsModelViewerElement extends ModelViewerElement {
        @property({type: Boolean, attribute: 'camera-controls'})
        cameraControls: boolean = false;

        @property(
            {type: String, attribute: 'camera-orbit', hasChanged: () => true})
        cameraOrbit: string = DEFAULT_CAMERA_ORBIT;

        @property({type: Number, attribute: 'interaction-prompt-threshold'})
        interactionPromptThreshold: number =
            DEFAULT_INTERACTION_PROMPT_THRESHOLD;

        protected[$promptElement]: Element;

        protected[$defaultCamera]: PerspectiveCamera;
        protected[$orbitCamera]: PerspectiveCamera;

        protected[$idleTime]: number = 0;
        protected[$userPromptedOnce]: boolean = false;
        protected[$waitingToPromptUser]: boolean = false;
        protected[$shouldPromptUserToInteract]: boolean = true;

        protected[$controls]: SmoothControls;

        protected[$lastSpherical]: Spherical = new Spherical();

        protected[$changeHandler]: (event: Event) => void = (event: Event) => this[$onChange](event as ChangeEvent);

        protected[$focusHandler]: () => void = () => this[$onFocus]();
        protected[$blurHandler]: () => void = () => this[$onBlur]();

        protected[$promptTransitionendHandler]:
            () => void = () => this[$onPromptTransitionend]();

        constructor() {
          super();
          const scene = (this as any)[$scene];

          this[$promptElement] =
              this.shadowRoot!.querySelector('.controls-prompt')!;

          this[$defaultCamera] = scene.getCamera();
          this[$orbitCamera] = this[$defaultCamera].clone();

          this[$orbitCamera].near = ORBIT_CAMERA_NEAR_PLANE;
          this[$orbitCamera].far = ORBIT_CAMERA_FAR_PLANE;
          this[$orbitCamera].updateProjectionMatrix();

          this[$controls] =
              new SmoothControls(this[$orbitCamera], scene.canvas);
          this[$controls].target.set(0, FRAMED_HEIGHT / 2, 0);

          scene.setCamera(this[$orbitCamera]);
        }

        getCameraOrbit(): SphericalPosition {
          const {theta, phi, radius} = this[$lastSpherical];
          return {theta, phi, radius: radius / FRAMED_HEIGHT};
        }

        connectedCallback() {
          super.connectedCallback();

          this[$promptTransitionendHandler]();
          this[$promptElement].addEventListener(
              'transitionend', this[$promptTransitionendHandler]);
              
          this[$controls].addEventListener('change', this[$changeHandler]);
        }

        disconnectedCallback() {
          super.disconnectedCallback();

          this[$promptElement].removeEventListener(
              'transitionend', this[$promptTransitionendHandler]);
          this[$controls].removeEventListener('change', this[$changeHandler]);
        }

        updated(changedProperties: Map<string, any>) {
          super.updated(changedProperties);

          const controls = this[$controls];
          const scene = (this as any)[$scene];

          if (changedProperties.has('cameraControls')) {
            if (this.cameraControls) {
              controls.enableInteraction();

              scene.canvas.addEventListener('focus', this[$focusHandler]);
              scene.canvas.addEventListener('blur', this[$blurHandler]);

              this[$updateOrbitCamera]();
            } else {
              scene.canvas.removeEventListener('focus', this[$focusHandler]);
              scene.canvas.removeEventListener('blur', this[$blurHandler]);

              controls.disableInteraction();
            }
          }

          if (changedProperties.has('cameraOrbit')) {
            let sphericalValues = deserializeSpherical(this.cameraOrbit);

            if (sphericalValues == null) {
              sphericalValues = deserializeSpherical(DEFAULT_CAMERA_ORBIT)!;
            }

            let [theta, phi, radius] = sphericalValues;

            if (typeof radius === 'string') {
              switch (radius) {
                default:
                case 'auto':
                  radius = scene.idealCameraDistance;
                  break;
              }
            } else {
              // TODO(#450): We are using FRAMED_HEIGHT as a proxy for 1 unit
              // distance in world space. In other words, 1 * FRAMED_HEIGHT =
              // 1m. It's possible that this is not ideal.
              radius *= FRAMED_HEIGHT;
            }

            controls.setOrbit(theta, phi, radius as number);
          }
        }

        [$tick](time: number, delta: number) {
          super[$tick](time, delta);

          if (this[$waitingToPromptUser]) {
            if (this.loaded) {
              this[$idleTime] += delta;
            }

            if (this[$idleTime] > this.interactionPromptThreshold) {
              (this as any)[$scene].canvas.setAttribute(
                  'aria-label', INTERACTION_PROMPT);

              // NOTE(cdata): After notifying users that the controls are
              // available, we flag that the user has been prompted at least
              // once, and then effectively stop the idle timer. If the camera
              // orbit changes after this point, the user will never be prompted
              // again for this particular <model-element> instance:
              this[$userPromptedOnce] = true;
              this[$waitingToPromptUser] = false;

              this[$promptElement].classList.add('visible');
            }
          }

          this[$controls].update(time, delta);
        }

        [$deferInteractionPrompt]() {
          // Effectively cancel the timer waiting for user interaction:
          this[$waitingToPromptUser] = false;
          this[$promptElement]!.classList.remove('visible');

          // Implicitly there was some reason to defer the prompt. If the user
          // has been prompted at least once already, we no longer need to
          // prompt the user, although if they have never been prompted we
          // should probably prompt them at least once just in case.
          if (this[$userPromptedOnce]) {
            this[$shouldPromptUserToInteract] = false;
          }
        }

        /**
         * Copies over the default camera's values in order to frame
         * the scene correctly.
         */
        [$updateOrbitCamera]() {
          const camera = this[$orbitCamera];
          const controls = this[$controls];
          const scene = (this as any)[$scene];

          // The default camera already has positioned itself correctly
          // to frame the canvas. Copy its values.
          camera.position.copy(this[$defaultCamera].position);
          camera.aspect = this[$defaultCamera].aspect;
          camera.rotation.set(0, 0, 0);
          camera.updateProjectionMatrix();

          // Zooming out beyond the 'frame' doesn't serve much purpose
          // and will only end up showing the skysphere if zoomed out enough
          const minimumRadius = ORBIT_CAMERA_NEAR_PLANE + FRAMED_HEIGHT / 2.0;
          const maximumRadius = scene.idealCameraDistance;

          controls.applyOptions({minimumRadius, maximumRadius});

          controls.target.set(0, FRAMED_HEIGHT / 2, 0);
        }

        [$updateAria]() {
          // NOTE(cdata): It is possible that we might want to record the
          // last spherical when the label actually changed. Right now, the
          // side-effect the current implementation is that we will only
          // announce the first view change that occurs after the element
          // becomes focused.
          const {theta: lastTheta, phi: lastPhi} = this[$lastSpherical];
          const {theta, phi} =
              this[$controls]!.getCameraSpherical(this[$lastSpherical]);

          const rootNode = this.getRootNode() as Document | ShadowRoot | null;

          // Only change the aria-label if <model-viewer> is currently focused:
          if (rootNode != null && rootNode.activeElement === this) {
            const lastAzimuthalQuadrant =
                (4 + Math.floor(((lastTheta % PHI) + QUARTER_PI) / HALF_PI)) %
                4;
            const azimuthalQuadrant =
                (4 + Math.floor(((theta % PHI) + QUARTER_PI) / HALF_PI)) % 4;

            const lastPolarTrient = Math.floor(lastPhi / THIRD_PI);
            const polarTrient = Math.floor(phi / THIRD_PI);

            if (azimuthalQuadrant !== lastAzimuthalQuadrant ||
                polarTrient !== lastPolarTrient) {
              const {canvas} = (this as any)[$scene];
              const azimuthalQuadrantLabel =
                  AZIMUTHAL_QUADRANT_LABELS[azimuthalQuadrant];
              const polarTrientLabel = POLAR_TRIENT_LABELS[polarTrient];

              const ariaLabel = `View from stage ${polarTrientLabel}${
                  azimuthalQuadrantLabel}`;

              canvas.setAttribute('aria-label', ariaLabel);
            }
          }
        }

        [$onPromptTransitionend]() {
          const svg = this[$promptElement].querySelector('svg');

          if (svg == null) {
            return;
          }

          // NOTE(cdata): We need to make sure that SVG animations are paused
          // when the prompt is not visible, otherwise we may a significant
          // compositing cost even while the prompt is at opacity 0.
          if (this[$promptElement].classList.contains('visible')) {
            svg.unpauseAnimations();
          } else {
            svg.pauseAnimations();
          }
        }

        [$onResize](event: any) {
          super[$onResize](event);
          this[$updateOrbitCamera]();
        }

        [$onModelLoad](event: any) {
          super[$onModelLoad](event);
          this[$updateOrbitCamera]();
        }

        [$onFocus]() {
          const {canvas} = (this as any)[$scene];

          // NOTE(cdata): On every re-focus, we switch the aria-label back to
          // the original, non-prompt label if appropriate. If the user has
          // already interacted, they no longer need to hear the prompt.
          // Otherwise, they will hear it again after the idle prompt threshold
          // has been crossed.
          const ariaLabel = this[$ariaLabel];

          if (canvas.getAttribute('aria-label') !== ariaLabel) {
            canvas.setAttribute('aria-label', ariaLabel);
          }

          // NOTE(cdata): When focused, if the user has yet to interact with the
          // camera controls (that is, we "should" prompt the user), we begin
          // the idle timer and indicate that we are waiting for it to cross the
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

        [$onChange]({source}: ChangeEvent) {
          this[$deferInteractionPrompt]();
          this[$updateAria]();
          this[$needsRender]();

          if (source === 'user-interaction') {
            this[$onUserModelOrbit]();
          }
        }
      }

      return ControlsModelViewerElement;
    };
