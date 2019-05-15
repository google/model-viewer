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
import {Event, PerspectiveCamera, Spherical} from 'three';

import {deserializeSpherical} from '../conversions.js';
import ModelViewerElementBase, {$ariaLabel, $needsRender, $onModelLoad, $onResize, $onUserModelOrbit, $scene, $tick} from '../model-viewer-base.js';
import {ChangeEvent, SmoothControls} from '../three-components/SmoothControls.js';
import {Constructor} from '../utilities.js';

export interface SphericalPosition {
  theta: number;  // equator angle around the y (up) axis.
  phi: number;    // polar angle from the y (up) axis.
  radius: number;
}


const DEFAULT_CAMERA_ORBIT = '0deg 75deg auto';
// Vertical field of view of camera, in degrees.
const DEFAULT_FOV = 45;

const HALF_PI = Math.PI / 2.0;
const THIRD_PI = Math.PI / 3.0;
const QUARTER_PI = HALF_PI / 2.0;
const PHI = 2.0 * Math.PI;

const AZIMUTHAL_QUADRANT_LABELS = ['front', 'right', 'back', 'left'];
const POLAR_TRIENT_LABELS = ['upper-', '', 'lower-'];

export const DEFAULT_INTERACTION_PROMPT_THRESHOLD = 3000;
export const INTERACTION_PROMPT =
    'Use mouse, touch or arrow keys to control the camera!';

export const $controls = Symbol('controls');
export const $promptElement = Symbol('promptElement');
export const $idealCameraDistance = Symbol('idealCameraDistance');

const $deferInteractionPrompt = Symbol('deferInteractionPrompt');
const $updateAria = Symbol('updateAria');
const $updateCamera = Symbol('updateCamera');
const $updateCameraOrbit = Symbol('applyCameraOrbit');
const $camera = Symbol('camera');
const $fov = Symbol('fov');

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

        protected[$camera]: PerspectiveCamera;
        protected[$fov]: number = DEFAULT_FOV;
        protected[$idealCameraDistance] = 1.0;

        protected[$idleTime]: number = 0;
        protected[$userPromptedOnce]: boolean = false;
        protected[$waitingToPromptUser]: boolean = false;
        protected[$shouldPromptUserToInteract]: boolean = true;

        protected[$controls]: SmoothControls;

        protected[$lastSpherical]: Spherical = new Spherical();

        protected[$changeHandler]: (event: Event) => void = (event: Event) =>
            this[$onChange](event as ChangeEvent);

        protected[$focusHandler]: () => void = () => this[$onFocus]();
        protected[$blurHandler]: () => void = () => this[$onBlur]();

        protected[$promptTransitionendHandler]:
            () => void = () => this[$onPromptTransitionend]();

        constructor() {
          super();
          const scene = (this as any)[$scene];

          this[$promptElement] =
              this.shadowRoot!.querySelector('.controls-prompt')!;

          this[$camera] = scene.getCamera();

          this[$controls] = new SmoothControls(this[$camera], scene.canvas);
          this[$controls].target.set(0, 0, 0);
        }

        getCameraOrbit(): SphericalPosition {
          const {theta, phi, radius} = this[$lastSpherical];
          return {theta, phi, radius};
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
            } else {
              scene.canvas.removeEventListener('focus', this[$focusHandler]);
              scene.canvas.removeEventListener('blur', this[$blurHandler]);

              controls.disableInteraction();
            }
          }

          if (changedProperties.has('cameraOrbit')) {
            this[$updateCameraOrbit]();
          }
        }

        [$updateCameraOrbit]() {
          let sphericalValues = deserializeSpherical(this.cameraOrbit);

          if (sphericalValues == null) {
            sphericalValues = deserializeSpherical(DEFAULT_CAMERA_ORBIT)!;
          }

          let [theta, phi, radius] = sphericalValues;

          if (typeof radius === 'string') {
            switch (radius) {
              default:
              case 'auto':
                radius = this[$idealCameraDistance];
                break;
            }
          }
          this[$controls].setOrbit(theta, phi, radius as number);
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
         * Changes the camera's radius to properly frame the scene based on
         * changes to framedHeight or fov, and maintains relative camera zoom
         * state.
         */
        [$updateCamera]() {
          const camera = this[$camera];
          const controls = this[$controls];
          const scene = (this as any)[$scene];

          camera.fov = this[$fov];
          let near = (scene.framedHeight / 2) /
              Math.tan((camera.fov / 2) * Math.PI / 180);
          camera.near = scene.framedHeight / 10.0;
          camera.far = scene.framedHeight * 10.0;

          // When we update the idealCameraDistance due to reframing, we want to
          // maintain the user's zoom level (how they have changed the camera
          // radius), which we represent here as a ratio.
          const zoom = controls ? controls.getCameraSpherical().radius /
                  this[$idealCameraDistance] :
                                  1;
          this[$idealCameraDistance] = near + scene.modelDepth / 2;

          camera.aspect = scene.aspect;
          camera.updateProjectionMatrix();

          // Zooming out beyond the 'frame' doesn't serve much purpose
          // and will only end up showing the skysphere if zoomed out enough
          const minimumRadius = camera.near + scene.framedHeight / 2.0;
          const maximumRadius = this[$idealCameraDistance];

          controls.applyOptions({minimumRadius, maximumRadius});
          controls.updateFramedHeight(scene.framedHeight);

          controls.target.copy(scene.target);

          controls.setRadius(zoom * this[$idealCameraDistance]);
          controls.jumpToDestination();
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
          this[$updateCamera]();
        }

        [$onModelLoad](event: any) {
          super[$onModelLoad](event);
          this[$updateCamera]();
          this[$updateCameraOrbit]();
          this[$controls].jumpToDestination();
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
