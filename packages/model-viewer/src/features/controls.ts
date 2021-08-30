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
import ModelViewerElementBase, {$ariaLabel, $container, $hasTransitioned, $loadedTime, $needsRender, $onModelLoad, $onResize, $renderer, $scene, $tick, $userInputElement, toVector3D, Vector3D} from '../model-viewer-base.js';
import {degreesToRadians, normalizeUnit} from '../styles/conversions.js';
import {EvaluatedStyle, Intrinsics, SphericalIntrinsics, StyleEvaluator, Vector3Intrinsics} from '../styles/evaluators.js';
import {IdentNode, NumberNode, numberNode, parseExpressions} from '../styles/parsers.js';
import {DECAY_MILLISECONDS} from '../three-components/Damper.js';
import {SAFE_RADIUS_RATIO} from '../three-components/ModelScene.js';
import {ChangeEvent, ChangeSource, PointerChangeEvent, SmoothControls} from '../three-components/SmoothControls.js';
import {Constructor} from '../utilities.js';
import {timeline} from '../utilities/animation.js';


// NOTE(cdata): The following "animation" timing functions are deliberately
// being used in favor of CSS animations. In Safari 12.1 and 13, CSS animations
// would cause the interaction prompt to glitch unexpectedly
// @see https://github.com/google/model-viewer/issues/839
const PROMPT_ANIMATION_TIME = 5000;

// For timing purposes, a "frame" is a timing agnostic relative unit of time
// and a "value" is a target value for the keyframe.
const wiggle = timeline(0, [
  {frames: 5, value: -1},
  {frames: 1, value: -1},
  {frames: 8, value: 1},
  {frames: 1, value: 1},
  {frames: 5, value: 0},
  {frames: 18, value: 0}
]);

const fade = timeline(0, [
  {frames: 1, value: 1},
  {frames: 5, value: 1},
  {frames: 1, value: 0},
  {frames: 6, value: 0}
]);

export const DEFAULT_CAMERA_ORBIT = '0deg 75deg 105%';
const DEFAULT_CAMERA_TARGET = 'auto auto auto';
const DEFAULT_FIELD_OF_VIEW = 'auto';

const MINIMUM_RADIUS_RATIO = 1.1 * SAFE_RADIUS_RATIO;

const AZIMUTHAL_QUADRANT_LABELS = ['front', 'right', 'back', 'left'];
const POLAR_TRIENT_LABELS = ['upper-', '', 'lower-'];

export const DEFAULT_INTERACTION_PROMPT_THRESHOLD = 3000;
export const INTERACTION_PROMPT =
    'Use mouse, touch or arrow keys to control the camera!';

export interface CameraChangeDetails {
  source: ChangeSource;
}

export interface SphericalPosition {
  theta: number;  // equator angle around the y (up) axis.
  phi: number;    // polar angle from the y (up) axis.
  radius: number;
  toString(): string;
}

export type InteractionPromptStrategy = 'auto'|'when-focused'|'none';
export type InteractionPromptStyle = 'basic'|'wiggle';
export type InteractionPolicy = 'always-allow'|'allow-when-focused';
export type TouchAction = 'pan-y'|'pan-x'|'none';
export type Bounds = 'tight'|'legacy';

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

export const TouchAction: {[index: string]: TouchAction} = {
  PAN_Y: 'pan-y',
  PAN_X: 'pan-x',
  NONE: 'none'
};

export const fieldOfViewIntrinsics = (element: ModelViewerElementBase) => {
  return {
    basis: [numberNode(
        (element as any)[$zoomAdjustedFieldOfView] * Math.PI / 180, 'rad')],
    keywords: {auto: [null]}
  };
};

const minFieldOfViewIntrinsics = {
  basis: [degreesToRadians(numberNode(25, 'deg')) as NumberNode<'rad'>],
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
    const radius = element[$scene].idealCameraDistance;

    return {
      basis: [theta, phi, numberNode(radius, 'm')],
      keywords: {auto: [null, null, numberNode(105, '%')]}
    };
  };
})();

const minCameraOrbitIntrinsics = (element: ModelViewerElementBase) => {
  const radius = MINIMUM_RADIUS_RATIO * element[$scene].idealCameraDistance;

  return {
    basis: [
      numberNode(-Infinity, 'rad'),
      numberNode(Math.PI / 8, 'rad'),
      numberNode(radius, 'm')
    ],
    keywords: {auto: [null, null, null]}
  };
};

const maxCameraOrbitIntrinsics = (element: ModelViewerElementBase) => {
  const orbitIntrinsics = cameraOrbitIntrinsics(element);
  const evaluator = new StyleEvaluator([], orbitIntrinsics);
  const defaultRadius = evaluator.evaluate()[2];

  return {
    basis: [
      numberNode(Infinity, 'rad'),
      numberNode(Math.PI - Math.PI / 8, 'rad'),
      numberNode(defaultRadius, 'm')
    ],
    keywords: {auto: [null, null, null]}
  };
};

export const cameraTargetIntrinsics = (element: ModelViewerElementBase) => {
  const center = element[$scene].boundingBox.getCenter(new Vector3());

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
const TAU = 2.0 * Math.PI;

export const $controls = Symbol('controls');
export const $promptElement = Symbol('promptElement');
export const $promptAnimatedContainer = Symbol('promptAnimatedContainer');
export const $idealCameraDistance = Symbol('idealCameraDistance');

const $deferInteractionPrompt = Symbol('deferInteractionPrompt');
const $updateAria = Symbol('updateAria');
const $updateCameraForRadius = Symbol('updateCameraForRadius');

const $onBlur = Symbol('onBlur');
const $onFocus = Symbol('onFocus');
const $onChange = Symbol('onChange');
const $onPointerChange = Symbol('onPointerChange');

const $waitingToPromptUser = Symbol('waitingToPromptUser');
const $userHasInteracted = Symbol('userHasInteracted');
const $promptElementVisibleTime = Symbol('promptElementVisibleTime');
const $lastPromptOffset = Symbol('lastPromptOffset');
const $focusedTime = Symbol('focusedTime');

const $zoomAdjustedFieldOfView = Symbol('zoomAdjustedFieldOfView');
const $lastSpherical = Symbol('lastSpherical');
const $jumpCamera = Symbol('jumpCamera');
const $initialized = Symbol('initialized');
const $maintainThetaPhi = Symbol('maintainThetaPhi');

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
  orbitSensitivity: number;
  touchAction: TouchAction;
  bounds: Bounds;
  interpolationDecay: number;
  getCameraOrbit(): SphericalPosition;
  getCameraTarget(): Vector3D;
  getFieldOfView(): number;
  getMinimumFieldOfView(): number;
  getMaximumFieldOfView(): number;
  jumpCameraToGoal(): void;
  updateFraming(): Promise<void>;
  resetInteractionPrompt(): void;
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

    @property({type: Number, attribute: 'orbit-sensitivity'})
    orbitSensitivity: number = 1;

    @property({type: String, attribute: 'touch-action'})
    touchAction: TouchAction = TouchAction.PAN_Y;

    @property({type: Boolean, attribute: 'disable-zoom'})
    disableZoom: boolean = false;

    @property({type: Number, attribute: 'interpolation-decay'})
    interpolationDecay: number = DECAY_MILLISECONDS;

    @property({type: String, attribute: 'bounds'}) bounds: Bounds = 'legacy';

    protected[$promptElement] =
        this.shadowRoot!.querySelector('.interaction-prompt') as HTMLElement;
    protected[$promptAnimatedContainer] =
        this.shadowRoot!.querySelector(
            '.interaction-prompt > .animated-container') as HTMLElement;

    protected[$focusedTime] = Infinity;
    protected[$lastPromptOffset] = 0;
    protected[$promptElementVisibleTime] = Infinity;
    protected[$userHasInteracted] = false;
    protected[$waitingToPromptUser] = false;

    protected[$controls] = new SmoothControls(
        this[$scene].camera as PerspectiveCamera, this[$userInputElement]);

    protected[$zoomAdjustedFieldOfView] = 0;
    protected[$lastSpherical] = new Spherical();
    protected[$jumpCamera] = false;
    protected[$initialized] = false;
    protected[$maintainThetaPhi] = false;

    getCameraOrbit(): SphericalPosition {
      const {theta, phi, radius} = this[$lastSpherical];
      return {
        theta,
        phi,
        radius,
        toString() {
          return `${this.theta}rad ${this.phi}rad ${this.radius}m`;
        }
      };
    }

    getCameraTarget(): Vector3D {
      return toVector3D(
          this[$renderer].isPresenting ? this[$renderer].arRenderer.target :
                                         this[$scene].getTarget());
    }

    getFieldOfView(): number {
      return this[$controls].getFieldOfView();
    }

    // Provided so user code does not have to parse these from attributes.
    getMinimumFieldOfView(): number {
      return this[$controls].options.minimumFieldOfView!;
    }

    getMaximumFieldOfView(): number {
      return this[$controls].options.maximumFieldOfView!;
    }

    jumpCameraToGoal() {
      this[$jumpCamera] = true;
      this.requestUpdate($jumpCamera, false);
    }

    resetInteractionPrompt() {
      this[$lastPromptOffset] = 0;
      this[$promptElementVisibleTime] = Infinity;
      this[$userHasInteracted] = false;
      this[$waitingToPromptUser] =
          this.interactionPrompt === InteractionPromptStrategy.AUTO &&
          this.cameraControls;
    }

    connectedCallback() {
      super.connectedCallback();

      this[$controls].addEventListener(
          'change', this[$onChange] as (event: Event) => void);
      this[$controls].addEventListener(
          'pointer-change-start',
          this[$onPointerChange] as (event: Event) => void);
      this[$controls].addEventListener(
          'pointer-change-end',
          this[$onPointerChange] as (event: Event) => void);
    }

    disconnectedCallback() {
      super.disconnectedCallback();

      this[$controls].removeEventListener(
          'change', this[$onChange] as (event: Event) => void);
      this[$controls].removeEventListener(
          'pointer-change-start',
          this[$onPointerChange] as (event: Event) => void);
      this[$controls].removeEventListener(
          'pointer-change-end',
          this[$onPointerChange] as (event: Event) => void);
    }

    updated(changedProperties: Map<string|number|symbol, unknown>) {
      super.updated(changedProperties);

      const controls = this[$controls];
      const input = this[$userInputElement];

      if (changedProperties.has('cameraControls')) {
        if (this.cameraControls) {
          controls.enableInteraction();
          if (this.interactionPrompt === InteractionPromptStrategy.AUTO) {
            this[$waitingToPromptUser] = true;
          }

          input.addEventListener('focus', this[$onFocus]);
          input.addEventListener('blur', this[$onBlur]);
        } else {
          input.removeEventListener('focus', this[$onFocus]);
          input.removeEventListener('blur', this[$onBlur]);

          controls.disableInteraction();
          this[$deferInteractionPrompt]();
        }
      }

      if (changedProperties.has('disableZoom')) {
        controls.disableZoom = this.disableZoom;
      }

      if (changedProperties.has('bounds')) {
        this[$scene].tightBounds = this.bounds === 'tight';
      }

      if (changedProperties.has('interactionPrompt') ||
          changedProperties.has('cameraControls') ||
          changedProperties.has('src')) {
        if (this.interactionPrompt === InteractionPromptStrategy.AUTO &&
            this.cameraControls && !this[$userHasInteracted]) {
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

      if (changedProperties.has('touchAction')) {
        const touchAction = this.touchAction;
        controls.applyOptions({touchAction});
        controls.updateTouchActionStyle();
      }

      if (changedProperties.has('orbitSensitivity')) {
        controls.sensitivity = this.orbitSensitivity;
      }

      if (changedProperties.has('interpolationDecay')) {
        controls.setDamperDecayTime(this.interpolationDecay);
        this[$scene].setTargetDamperDecayTime(this.interpolationDecay);
      }

      if (this[$jumpCamera] === true) {
        Promise.resolve().then(() => {
          controls.jumpToGoal();
          this[$scene].jumpToGoal();
          this[$jumpCamera] = false;
        });
      }
    }

    async updateFraming() {
      const scene = this[$scene];
      const oldFramedFieldOfView = scene.framedFieldOfView;

      await this.requestUpdate('cameraTarget');

      scene.updateFraming(
          this.bounds === 'tight' ? scene.getTarget() : undefined);
      scene.frameModel();

      const newFramedFieldOfView = scene.framedFieldOfView;
      const zoom = this[$controls].getFieldOfView() / oldFramedFieldOfView;
      this[$zoomAdjustedFieldOfView] = newFramedFieldOfView * zoom;
      this[$maintainThetaPhi] = true;

      this.requestUpdate('maxFieldOfView');
      this.requestUpdate('fieldOfView');
      this.requestUpdate('minCameraOrbit');
      this.requestUpdate('maxCameraOrbit');
      await this.requestUpdate('cameraOrbit');
    }

    [$syncFieldOfView](style: EvaluatedStyle<Intrinsics<['rad']>>) {
      this[$controls].setFieldOfView(style[0] * 180 / Math.PI);
    }

    [$syncCameraOrbit](style: EvaluatedStyle<SphericalIntrinsics>) {
      if (this[$maintainThetaPhi]) {
        const {theta, phi} = this.getCameraOrbit();
        style[0] = theta;
        style[1] = phi;
        this[$maintainThetaPhi] = false;
      }
      this[$controls].setOrbit(style[0], style[1], style[2]);
    }

    [$syncMinCameraOrbit](style: EvaluatedStyle<SphericalIntrinsics>) {
      this[$controls].applyOptions({
        minimumAzimuthalAngle: style[0],
        minimumPolarAngle: style[1],
        minimumRadius: style[2]
      });
      this.jumpCameraToGoal();
    }

    [$syncMaxCameraOrbit](style: EvaluatedStyle<SphericalIntrinsics>) {
      this[$controls].applyOptions({
        maximumAzimuthalAngle: style[0],
        maximumPolarAngle: style[1],
        maximumRadius: style[2]
      });
      this[$updateCameraForRadius](style[2]);
      this.jumpCameraToGoal();
    }

    [$syncMinFieldOfView](style: EvaluatedStyle<Intrinsics<['rad']>>) {
      this[$controls].applyOptions(
          {minimumFieldOfView: style[0] * 180 / Math.PI});
      this.jumpCameraToGoal();
    }

    [$syncMaxFieldOfView](style: EvaluatedStyle<Intrinsics<['rad']>>) {
      this[$controls].applyOptions(
          {maximumFieldOfView: style[0] * 180 / Math.PI});
      this.jumpCameraToGoal();
    }

    [$syncCameraTarget](style: EvaluatedStyle<Vector3Intrinsics>) {
      const [x, y, z] = style;
      this[$scene].setTarget(x, y, z);
      this[$renderer].arRenderer.updateTarget();
    }

    [$tick](time: number, delta: number) {
      super[$tick](time, delta);

      if (this[$renderer].isPresenting || !this[$hasTransitioned]()) {
        return;
      }

      const now = performance.now();
      if (this[$waitingToPromptUser]) {
        const thresholdTime =
            this.interactionPrompt === InteractionPromptStrategy.AUTO ?
            this[$loadedTime] :
            this[$focusedTime];

        if (this.loaded &&
            now > thresholdTime + this.interactionPromptThreshold) {
          this[$userInputElement].setAttribute(
              'aria-label', INTERACTION_PROMPT);

          this[$waitingToPromptUser] = false;
          this[$promptElementVisibleTime] = now;

          this[$promptElement].classList.add('visible');
        }
      }

      if (isFinite(this[$promptElementVisibleTime]) &&
          this.interactionPromptStyle === InteractionPromptStyle.WIGGLE) {
        const scene = this[$scene];
        const animationTime =
            ((now - this[$promptElementVisibleTime]) / PROMPT_ANIMATION_TIME) %
            1;
        const offset = wiggle(animationTime);
        const opacity = fade(animationTime);

        this[$promptAnimatedContainer].style.opacity = `${opacity}`;

        if (offset !== this[$lastPromptOffset]) {
          const xOffset = offset * scene.width * 0.05;
          const deltaTheta = (offset - this[$lastPromptOffset]) * Math.PI / 16;

          this[$promptAnimatedContainer].style.transform =
              `translateX(${xOffset}px)`;

          this[$controls].adjustOrbit(deltaTheta, 0, 0);

          this[$lastPromptOffset] = offset;
        }
      }

      this[$controls].update(time, delta);
      this[$scene].updateTarget(delta);
    }

    [$deferInteractionPrompt]() {
      // Effectively cancel the timer waiting for user interaction:
      this[$waitingToPromptUser] = false;
      this[$promptElement].classList.remove('visible');
      this[$promptElementVisibleTime] = Infinity;
    }

    /**
     * Updates the camera's near and far planes to enclose the scene when
     * orbiting at the supplied radius.
     */
    [$updateCameraForRadius](radius: number) {
      const {idealCameraDistance} = this[$scene];
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
            (4 + Math.floor(((lastTheta % TAU) + QUARTER_PI) / HALF_PI)) % 4;
        const azimuthalQuadrant =
            (4 + Math.floor(((theta % TAU) + QUARTER_PI) / HALF_PI)) % 4;

        const lastPolarTrient = Math.floor(lastPhi / THIRD_PI);
        const polarTrient = Math.floor(phi / THIRD_PI);

        if (azimuthalQuadrant !== lastAzimuthalQuadrant ||
            polarTrient !== lastPolarTrient) {
          const azimuthalQuadrantLabel =
              AZIMUTHAL_QUADRANT_LABELS[azimuthalQuadrant];
          const polarTrientLabel = POLAR_TRIENT_LABELS[polarTrient];

          const ariaLabel =
              `View from stage ${polarTrientLabel}${azimuthalQuadrantLabel}`;

          this[$userInputElement].setAttribute('aria-label', ariaLabel);
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

    [$onModelLoad]() {
      super[$onModelLoad]();

      const {framedFieldOfView} = this[$scene];
      this[$zoomAdjustedFieldOfView] = framedFieldOfView;

      if (this[$initialized]) {
        this[$maintainThetaPhi] = true;
      } else {
        this[$initialized] = true;
      }
      this.requestUpdate('maxFieldOfView', this.maxFieldOfView);
      this.requestUpdate('fieldOfView', this.fieldOfView);
      this.requestUpdate('minCameraOrbit', this.minCameraOrbit);
      this.requestUpdate('maxCameraOrbit', this.maxCameraOrbit);
      this.requestUpdate('cameraOrbit', this.cameraOrbit);
      this.requestUpdate('cameraTarget', this.cameraTarget);
      this.jumpCameraToGoal();
    }

    [$onFocus] = () => {
      const input = this[$userInputElement];

      if (!isFinite(this[$focusedTime])) {
        this[$focusedTime] = performance.now();
      }

      // NOTE(cdata): On every re-focus, we switch the aria-label back to
      // the original, non-prompt label if appropriate. If the user has
      // already interacted, they no longer need to hear the prompt.
      // Otherwise, they will hear it again after the idle prompt threshold
      // has been crossed.
      const ariaLabel = this[$ariaLabel];

      if (input.getAttribute('aria-label') !== ariaLabel) {
        input.setAttribute('aria-label', ariaLabel);
      }

      if (this.interactionPrompt === InteractionPromptStrategy.WHEN_FOCUSED &&
          !this[$userHasInteracted]) {
        this[$waitingToPromptUser] = true;
      }
    };

    [$onBlur] = () => {
      if (this.interactionPrompt !== InteractionPromptStrategy.WHEN_FOCUSED) {
        return;
      }

      this[$waitingToPromptUser] = false;
      this[$promptElement].classList.remove('visible');

      this[$promptElementVisibleTime] = Infinity;
      this[$focusedTime] = Infinity;
    };

    [$onChange] = ({source}: ChangeEvent) => {
      this[$updateAria]();
      this[$needsRender]();

      if (source === ChangeSource.USER_INTERACTION) {
        this[$userHasInteracted] = true;
        this[$deferInteractionPrompt]();
      }

      this.dispatchEvent(new CustomEvent<CameraChangeDetails>(
          'camera-change', {detail: {source}}));
    };

    [$onPointerChange] = (event: PointerChangeEvent) => {
      if (event.type === 'pointer-change-start') {
        this[$container].classList.add('pointer-tumbling');
      } else {
        this[$container].classList.remove('pointer-tumbling');
      }
    };
  }

  return ControlsModelViewerElement;
};
