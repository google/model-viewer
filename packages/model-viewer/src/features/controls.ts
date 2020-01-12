/* @license
 * Copyright 2019 Google LLC. All Rights Reserved.
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
import {Event, PerspectiveCamera, Spherical, Vector3} from 'three';

import {style} from '../decorators.js';
import ModelViewerElementBase, {$ariaLabel, $loadedTime, $needsRender, $onModelLoad, $onResize, $scene, $tick} from '../model-viewer-base.js';
import {degreesToRadians, normalizeUnit} from '../styles/conversions.js';
import {EvaluatedStyle, Intrinsics, SphericalIntrinsics, Vector3Intrinsics} from '../styles/evaluators.js';
import {IdentNode, NumberNode, numberNode, parseExpressions} from '../styles/parsers.js';
import {ChangeEvent, ChangeSource, SmoothControls} from '../three-components/SmoothControls.js';
import {Constructor} from '../utilities.js';
import {timeline} from '../utilities/animation.js';


// NOTE(cdata): The following "animation" timing functions are deliberately
// being used in favor of CSS animations. In Safari 12.1 and 13, CSS animations
// would cause the interaction prompt to glitch unexpectedly
// @see https://github.com/GoogleWebComponents/model-viewer/issues/839
const PROMPT_ANIMATION_TIME = 5000;

// For timing purposes, a "frame" is a timing agnostic relative unit of time
// and a "value" is a target value for the keyframe.
const wiggle = timeline(0, [
  {frames: 6, value: 0},
  {frames: 5, value: -1},
  {frames: 1, value: -1},
  {frames: 8, value: 1},
  {frames: 1, value: 1},
  {frames: 5, value: 0},
  {frames: 12, value: 0}
]);

const fade = timeline(0, [
  {frames: 2, value: 0},
  {frames: 1, value: 1},
  {frames: 5, value: 1},
  {frames: 1, value: 0},
  {frames: 4, value: 0}
]);

export interface CameraChangeDetails {
  source: ChangeSource;
}

export interface SphericalPosition {
  theta: number;  // equator angle around the y (up) axis.
  phi: number;    // polar angle from the y (up) axis.
  radius: number;
}

export type InteractionPromptStrategy = 'auto'|'when-focused'|'none';
export type InteractionPromptStyle = 'basic'|'wiggle';
export type InteractionPolicy = 'always-allow'|'allow-when-focused';

export const InteractionPromptStrategy:
    {[index: string]: InteractionPromptStrategy} = {
      AUTO: 'auto',
      WHEN_FOCUSED: 'when-focused',
      NONE: 'none'
    };

export const InteractionPromptStyle:
    {[index: string]: InteractionPromptStyle} = {
      BASIC: 'basic',
      WIGGLE: 'wiggle'
    };

export const InteractionPolicy: {[index: string]: InteractionPolicy} = {
  ALWAYS_ALLOW: 'always-allow',
  WHEN_FOCUSED: 'allow-when-focused'
};

export const DEFAULT_CAMERA_ORBIT = '0deg 75deg 105%';
const DEFAULT_CAMERA_TARGET = 'auto auto auto';
const DEFAULT_FIELD_OF_VIEW = 'auto';

export const fieldOfViewIntrinsics = (element: ModelViewerElementBase) => {
  return {
    basis: [numberNode(
        (element as any)[$zoomAdjustedFieldOfView] * Math.PI / 180, 'rad')],
    keywords: {auto: [null]}
  };
};

const minFieldOfViewIntrinsics = {
  basis: [degreesToRadians(numberNode(10, 'deg')) as NumberNode<'rad'>],
  keywords: {auto: [null]}
};

const maxFieldOfViewIntrinsics = (element: ModelViewerElementBase) => {
  const scene = element[$scene];

  return {
    basis: [degreesToRadians(numberNode(45, 'deg')) as NumberNode<'rad'>],
    keywords: {auto: [numberNode(scene.framedFieldOfView, 'deg')]}
  };
};

export const cameraOrbitIntrinsics = (() => {
  const defaultTerms =
      parseExpressions(DEFAULT_CAMERA_ORBIT)[0]
          .terms as [NumberNode<'rad'>, NumberNode<'rad'>, IdentNode];

  const theta = normalizeUnit(defaultTerms[0]) as NumberNode<'rad'>;
  const phi = normalizeUnit(defaultTerms[1]) as NumberNode<'rad'>;

  return (element: ModelViewerElementBase) => {
    const radius = element[$scene].model.idealCameraDistance;

    return {
      basis: [theta, phi, numberNode(radius, 'm')],
      keywords: {auto: [null, null, numberNode(105, '%')]}
    };
  };
})();

const minCameraOrbitIntrinsics = {
  basis: [
    numberNode(-Infinity, 'rad'),
    numberNode(Math.PI / 8, 'rad'),
    numberNode(0, 'm')
  ],
  keywords: {auto: [null, null, null]}
};

const maxCameraOrbitIntrinsics = {
  basis: [
    numberNode(Infinity, 'rad'),
    numberNode(Math.PI - Math.PI / 8, 'rad'),
    numberNode(Infinity, 'm')
  ],
  keywords: {auto: [null, null, null]}
};

export const cameraTargetIntrinsics = (element: ModelViewerElementBase) => {
  const center = element[$scene].model.boundingBox.getCenter(new Vector3);

  return {
    basis: [
      numberNode(center.x, 'm'),
      numberNode(center.y, 'm'),
      numberNode(center.z, 'm')
    ],
    keywords: {auto: [null, null, null]}
  };
};

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
export const $promptAnimatedContainer = Symbol('promptAnimatedContainer');
export const $idealCameraDistance = Symbol('idealCameraDistance');

const $deferInteractionPrompt = Symbol('deferInteractionPrompt');
const $updateAria = Symbol('updateAria');
const $updateCameraForRadius = Symbol('updateCameraForRadius');

const $blurHandler = Symbol('blurHandler');
const $focusHandler = Symbol('focusHandler');
const $changeHandler = Symbol('changeHandler');

const $onBlur = Symbol('onBlur');
const $onFocus = Symbol('onFocus');
const $onChange = Symbol('onChange');

const $shouldPromptUserToInteract = Symbol('shouldPromptUserToInteract');
const $waitingToPromptUser = Symbol('waitingToPromptUser');
const $userPromptedOnce = Symbol('userPromptedOnce');
const $promptElementVisibleTime = Symbol('promptElementVisibleTime');
const $lastPromptOffset = Symbol('lastPromptOffset');
const $focusedTime = Symbol('focusedTime');

const $zoomAdjustedFieldOfView = Symbol('zoomAdjustedFieldOfView');
const $lastSpherical = Symbol('lastSpherical');
const $jumpCamera = Symbol('jumpCamera');

const $syncCameraOrbit = Symbol('syncCameraOrbit');
const $syncFieldOfView = Symbol('syncFieldOfView');
const $syncCameraTarget = Symbol('syncCameraTarget');

const $syncMinCameraOrbit = Symbol('syncMinCameraOrbit');
const $syncMaxCameraOrbit = Symbol('syncMaxCameraOrbit');
const $syncMinFieldOfView = Symbol('syncMinFieldOfView');
const $syncMaxFieldOfView = Symbol('syncMaxFieldOfView');

export declare interface ControlsInterface {
  cameraControls: boolean;
  cameraOrbit: string;
  cameraTarget: string;
  fieldOfView: string;
  minCameraOrbit: string;
  maxCameraOrbit: string;
  minFieldOfView: string;
  maxFieldOfView: string;
  interactionPrompt: InteractionPromptStrategy;
  interactionPromptStyle: InteractionPromptStyle;
  interactionPolicy: InteractionPolicy;
  interactionPromptThreshold: number;
  getCameraOrbit(): SphericalPosition;
  getCameraTarget(): Vector3;
  getFieldOfView(): number;
  jumpCameraToGoal(): void;
}

export const ControlsMixin = <T extends Constructor<ModelViewerElementBase>>(
    ModelViewerElement: T): Constructor<ControlsInterface>&T => {
  class ControlsModelViewerElement extends ModelViewerElement {
    @property({type: Boolean, attribute: 'camera-controls'})
    cameraControls: boolean = false;

    @style({
      intrinsics: cameraOrbitIntrinsics,
      observeEffects: true,
      updateHandler: $syncCameraOrbit
    })
    @property({type: String, attribute: 'camera-orbit', hasChanged: () => true})
    cameraOrbit: string = DEFAULT_CAMERA_ORBIT;

    @style({
      intrinsics: cameraTargetIntrinsics,
      observeEffects: true,
      updateHandler: $syncCameraTarget
    })
    @property(
        {type: String, attribute: 'camera-target', hasChanged: () => true})
    cameraTarget: string = DEFAULT_CAMERA_TARGET;

    @style({
      intrinsics: fieldOfViewIntrinsics,
      observeEffects: true,
      updateHandler: $syncFieldOfView
    })
    @property(
        {type: String, attribute: 'field-of-view', hasChanged: () => true})
    fieldOfView: string = DEFAULT_FIELD_OF_VIEW;

    @style({
      intrinsics: minCameraOrbitIntrinsics,
      updateHandler: $syncMinCameraOrbit
    })
    @property(
        {type: String, attribute: 'min-camera-orbit', hasChanged: () => true})
    minCameraOrbit: string = 'auto';

    @style({
      intrinsics: maxCameraOrbitIntrinsics,
      updateHandler: $syncMaxCameraOrbit
    })
    @property(
        {type: String, attribute: 'max-camera-orbit', hasChanged: () => true})
    maxCameraOrbit: string = 'auto';

    @style({
      intrinsics: minFieldOfViewIntrinsics,
      updateHandler: $syncMinFieldOfView
    })
    @property(
        {type: String, attribute: 'min-field-of-view', hasChanged: () => true})
    minFieldOfView: string = 'auto';

    @style({
      intrinsics: maxFieldOfViewIntrinsics,
      updateHandler: $syncMaxFieldOfView
    })
    @property(
        {type: String, attribute: 'max-field-of-view', hasChanged: () => true})
    maxFieldOfView: string = 'auto';

    @property({type: Number, attribute: 'interaction-prompt-threshold'})
    interactionPromptThreshold: number = DEFAULT_INTERACTION_PROMPT_THRESHOLD;

    @property({type: String, attribute: 'interaction-prompt-style'})
    interactionPromptStyle: InteractionPromptStyle =
        InteractionPromptStyle.WIGGLE;

    @property({type: String, attribute: 'interaction-prompt'})
    interactionPrompt: InteractionPromptStrategy =
        InteractionPromptStrategy.AUTO;

    @property({type: String, attribute: 'interaction-policy'})
    interactionPolicy: InteractionPolicy = InteractionPolicy.ALWAYS_ALLOW;

    protected[$promptElement] =
        this.shadowRoot!.querySelector('.interaction-prompt') as HTMLElement;
    protected[$promptAnimatedContainer] =
        this.shadowRoot!.querySelector(
            '.interaction-prompt > .animated-container') as HTMLElement;

    protected[$focusedTime] = Infinity;
    protected[$lastPromptOffset] = 0;
    protected[$promptElementVisibleTime] = Infinity;
    protected[$userPromptedOnce] = false;
    protected[$waitingToPromptUser] = false;
    protected[$shouldPromptUserToInteract] = true;

    protected[$controls] = new SmoothControls(
        this[$scene].getCamera() as PerspectiveCamera, this[$scene].canvas);

    protected[$zoomAdjustedFieldOfView] = 0;
    protected[$lastSpherical] = new Spherical();
    protected[$jumpCamera] = false;

    protected[$changeHandler] = (event: Event) =>
        this[$onChange](event as ChangeEvent);

    protected[$focusHandler] = () => this[$onFocus]();
    protected[$blurHandler] = () => this[$onBlur]();

    getCameraOrbit(): SphericalPosition {
      const {theta, phi, radius} = this[$lastSpherical];
      return {theta, phi, radius};
    }

    getCameraTarget(): Vector3 {
      return this[$controls].getTarget();
    }

    getFieldOfView(): number {
      return this[$controls].getFieldOfView();
    }

    jumpCameraToGoal() {
      this[$jumpCamera] = true;
      this.requestUpdate($jumpCamera, false);
    }

    connectedCallback() {
      super.connectedCallback();

      this[$controls].addEventListener('change', this[$changeHandler]);
    }

    disconnectedCallback() {
      super.disconnectedCallback();

      this[$controls].removeEventListener('change', this[$changeHandler]);
    }

    updated(changedProperties: Map<string|number|symbol, unknown>) {
      super.updated(changedProperties);

      const controls = this[$controls];
      const scene = this[$scene];

      if (changedProperties.has('cameraControls')) {
        if (this.cameraControls) {
          controls.enableInteraction();
          if (this.interactionPrompt === InteractionPromptStrategy.AUTO) {
            this[$waitingToPromptUser] = true;
          }

          scene.canvas.addEventListener('focus', this[$focusHandler]);
          scene.canvas.addEventListener('blur', this[$blurHandler]);
        } else {
          scene.canvas.removeEventListener('focus', this[$focusHandler]);
          scene.canvas.removeEventListener('blur', this[$blurHandler]);

          controls.disableInteraction();
          this[$deferInteractionPrompt]();
        }
      }

      if (changedProperties.has('interactionPrompt') ||
          changedProperties.has('cameraControls') ||
          changedProperties.has('src')) {
        if (this.interactionPrompt === InteractionPromptStrategy.AUTO &&
            this.cameraControls) {
          this[$waitingToPromptUser] = true;
        } else {
          this[$deferInteractionPrompt]();
        }
      }

      if (changedProperties.has('interactionPromptStyle')) {
        this[$promptElement].classList.toggle(
            'wiggle',
            this.interactionPromptStyle === InteractionPromptStyle.WIGGLE);
      }

      if (changedProperties.has('interactionPolicy')) {
        const interactionPolicy = this.interactionPolicy;
        controls.applyOptions({interactionPolicy});
      }

      if (this[$jumpCamera] === true) {
        Promise.resolve().then(() => {
          this[$controls].jumpToGoal();
          this[$jumpCamera] = false;
        });
      }
    }

    [$syncFieldOfView](style: EvaluatedStyle<Intrinsics<['rad']>>) {
      this[$controls].setFieldOfView(style[0] * 180 / Math.PI);
    }

    [$syncCameraOrbit](style: EvaluatedStyle<SphericalIntrinsics>) {
      this[$updateCameraForRadius](style[2]);
      this[$controls].setOrbit(style[0], style[1], style[2]);
    }

    [$syncMinCameraOrbit](style: EvaluatedStyle<SphericalIntrinsics>) {
      this[$controls].applyOptions({
        minimumAzimuthalAngle: style[0],
        minimumPolarAngle: style[1],
        minimumRadius: style[2]
      });
    }

    [$syncMaxCameraOrbit](style: EvaluatedStyle<SphericalIntrinsics>) {
      this[$controls].applyOptions({
        maximumAzimuthalAngle: style[0],
        maximumPolarAngle: style[1],
        maximumRadius: style[2]
      });
    }

    [$syncMinFieldOfView](style: EvaluatedStyle<Intrinsics<['rad']>>) {
      this[$controls].applyOptions(
          {minimumFieldOfView: style[0] * 180 / Math.PI});
    }

    [$syncMaxFieldOfView](style: EvaluatedStyle<Intrinsics<['rad']>>) {
      this[$controls].applyOptions(
          {maximumFieldOfView: style[0] * 180 / Math.PI});
    }

    [$syncCameraTarget](style: EvaluatedStyle<Vector3Intrinsics>) {
      const [x, y, z] = style;
      const scene = this[$scene];
      this[$controls].setTarget(x, y, z);
      // TODO(#837): Mutating scene.pivotCenter should automatically adjust
      // pivot rotation
      scene.pivotCenter.set(x, y, z);
      scene.setPivotRotation(scene.getPivotRotation());
    }

    [$tick](time: number, delta: number) {
      super[$tick](time, delta);

      if (this[$waitingToPromptUser] &&
          this.interactionPrompt !== InteractionPromptStrategy.NONE) {
        const thresholdTime =
            this.interactionPrompt === InteractionPromptStrategy.AUTO ?
            this[$loadedTime] :
            this[$focusedTime];

        if (this.loaded &&
            time > thresholdTime + this.interactionPromptThreshold) {
          this[$scene].canvas.setAttribute('aria-label', INTERACTION_PROMPT);

          // NOTE(cdata): After notifying users that the controls are
          // available, we flag that the user has been prompted at least
          // once, and then effectively stop the idle timer. If the camera
          // orbit changes after this point, the user will never be prompted
          // again for this particular <model-element> instance:
          this[$userPromptedOnce] = true;
          this[$waitingToPromptUser] = false;
          this[$promptElementVisibleTime] = time;

          this[$promptElement].classList.add('visible');
        }
      }


      if (isFinite(this[$promptElementVisibleTime]) &&
          this.interactionPromptStyle === InteractionPromptStyle.WIGGLE) {
        const scene = this[$scene];
        const animationTime =
            ((time - this[$promptElementVisibleTime]) / PROMPT_ANIMATION_TIME) %
            1;
        const offset = wiggle(animationTime);
        const opacity = fade(animationTime);

        const xOffset = offset * scene.width * 0.05;
        const deltaTheta = (offset - this[$lastPromptOffset]) * Math.PI / 16;

        this[$promptAnimatedContainer].style.transform =
            `translateX(${xOffset}px)`;
        this[$promptAnimatedContainer].style.opacity = `${opacity}`;

        this[$controls].adjustOrbit(deltaTheta, 0, 0, 0);

        this[$lastPromptOffset] = offset;
        this[$needsRender]();
      }

      this[$controls].update(time, delta);
      const target = this.getCameraTarget();
      if (!this[$scene].pivotCenter.equals(target)) {
        this[$scene].pivotCenter.copy(target);
        this[$scene].setPivotRotation(this[$scene].getPivotRotation());
      }
    }

    [$deferInteractionPrompt]() {
      // Effectively cancel the timer waiting for user interaction:
      this[$waitingToPromptUser] = false;
      this[$promptElement].classList.remove('visible');
      this[$promptElementVisibleTime] = Infinity;

      // Implicitly there was some reason to defer the prompt. If the user
      // has been prompted at least once already, we no longer need to
      // prompt the user, although if they have never been prompted we
      // should probably prompt them at least once just in case.
      if (this[$userPromptedOnce]) {
        this[$shouldPromptUserToInteract] = false;
      }
    }

    /**
     * Updates the camera's near and far planes to enclose the scene when
     * orbiting at the supplied radius.
     */
    [$updateCameraForRadius](radius: number) {
      const {idealCameraDistance} = this[$scene].model;
      const maximumRadius = Math.max(idealCameraDistance, radius);

      const near = 0;
      const far = 2 * maximumRadius;
      this[$controls].updateNearFar(near, far);
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
    }

    [$onResize](event: any) {
      const controls = this[$controls];
      const oldFramedFieldOfView = this[$scene].framedFieldOfView;

      // The super of $onResize will update the scene's framedFieldOfView, so we
      // compare the before and after to calculate the proper zoom.
      super[$onResize](event);

      const newFramedFieldOfView = this[$scene].framedFieldOfView;
      const zoom = controls.getFieldOfView() / oldFramedFieldOfView;
      this[$zoomAdjustedFieldOfView] = newFramedFieldOfView * zoom;

      controls.updateAspect(this[$scene].aspect);

      this.requestUpdate('maxFieldOfView', this.maxFieldOfView);
      this.requestUpdate('fieldOfView', this.fieldOfView);
      this.jumpCameraToGoal();
    }

    [$onModelLoad](event: any) {
      super[$onModelLoad](event);

      const {framedFieldOfView} = this[$scene];
      this[$zoomAdjustedFieldOfView] = framedFieldOfView;

      this.requestUpdate('maxFieldOfView', this.maxFieldOfView);
      this.requestUpdate('fieldOfView', this.fieldOfView);
      this.requestUpdate('cameraOrbit', this.cameraOrbit);
      this.requestUpdate('cameraTarget', this.cameraTarget);
      this.jumpCameraToGoal();
    }

    [$onFocus]() {
      const {canvas} = this[$scene];

      if (!isFinite(this[$focusedTime])) {
        this[$focusedTime] = performance.now();
      }

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
      if (!isFinite(this[$promptElementVisibleTime]) &&
          this[$shouldPromptUserToInteract]) {
        this[$waitingToPromptUser] = true;
      }
    }

    [$onBlur]() {
      this[$waitingToPromptUser] = false;
      this[$promptElement].classList.remove('visible');

      this[$promptElementVisibleTime] = Infinity;
      this[$focusedTime] = Infinity;
    }

    [$onChange]({source}: ChangeEvent) {
      this[$updateAria]();
      this[$needsRender]();

      if (source === ChangeSource.USER_INTERACTION) {
        this[$deferInteractionPrompt]();
      }

      this.dispatchEvent(new CustomEvent<CameraChangeDetails>(
          'camera-change', {detail: {source}}));
    }
  }

  return ControlsModelViewerElement;
};
