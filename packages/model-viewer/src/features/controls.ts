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

import {property} from 'lit/decorators.js';
import {Event, PerspectiveCamera, Spherical, Vector3} from 'three';

import {style} from '../decorators.js';
import ModelViewerElementBase, {$ariaLabel, $container, $getModelIsVisible, $loadedTime, $needsRender, $onModelLoad, $onResize, $renderer, $scene, $tick, $updateStatus, $userInputElement, toVector3D, Vector3D} from '../model-viewer-base.js';
import {degreesToRadians, normalizeUnit} from '../styles/conversions.js';
import {EvaluatedStyle, Intrinsics, SphericalIntrinsics, StyleEvaluator, Vector3Intrinsics} from '../styles/evaluators.js';
import {IdentNode, NumberNode, numberNode, parseExpressions} from '../styles/parsers.js';
import {DECAY_MILLISECONDS} from '../three-components/Damper.js';
import {ChangeEvent, ChangeSource, PointerChangeEvent, SmoothControls} from '../three-components/SmoothControls.js';
import {Constructor} from '../utilities.js';
import {Path, timeline, TimingFunction} from '../utilities/animation.js';



// NOTE(cdata): The following "animation" timing functions are deliberately
// being used in favor of CSS animations. In Safari 12.1 and 13, CSS animations
// would cause the interaction prompt to glitch unexpectedly
// @see https://github.com/google/model-viewer/issues/839
const PROMPT_ANIMATION_TIME = 5000;

// For timing purposes, a "frame" is a timing agnostic relative unit of time
// and a "value" is a target value for the Frame.
const wiggle = timeline({
  initialValue: 0,
  keyframes: [
    {frames: 5, value: -1},
    {frames: 1, value: -1},
    {frames: 8, value: 1},
    {frames: 1, value: 1},
    {frames: 5, value: 0},
    {frames: 18, value: 0}
  ]
});

const fade = timeline({
  initialValue: 0,
  keyframes: [
    {frames: 1, value: 1},
    {frames: 5, value: 1},
    {frames: 1, value: 0},
    {frames: 6, value: 0}
  ]
});

export const DEFAULT_FOV_DEG = 30;
export const DEFAULT_MIN_FOV_DEG = 12;

export const DEFAULT_CAMERA_ORBIT = '0deg 75deg 105%';
const DEFAULT_CAMERA_TARGET = 'auto auto auto';
const DEFAULT_FIELD_OF_VIEW = 'auto';

const MINIMUM_RADIUS_RATIO = 2.2;

const AZIMUTHAL_QUADRANT_LABELS = ['front', 'right', 'back', 'left'];
const POLAR_TRIENT_LABELS = ['upper-', '', 'lower-'];

export const DEFAULT_INTERACTION_PROMPT_THRESHOLD = 3000;
export const INTERACTION_PROMPT = '. Use mouse, touch or arrow keys to move.';

export interface CameraChangeDetails {
  source: ChangeSource;
}

export interface SphericalPosition {
  theta: number;  // equator angle around the y (up) axis.
  phi: number;    // polar angle from the y (up) axis.
  radius: number;
  toString(): string;
}

export interface Finger {
  x: Path;
  y: Path;
}

export type InteractionPromptStrategy = 'auto'|'none';
export type InteractionPromptStyle = 'basic'|'wiggle';
export type TouchAction = 'pan-y'|'pan-x'|'none';

export const InteractionPromptStrategy:
    {[index: string]: InteractionPromptStrategy} = {
      AUTO: 'auto',
      NONE: 'none'
    };

export const InteractionPromptStyle:
    {[index: string]: InteractionPromptStyle} = {
      BASIC: 'basic',
      WIGGLE: 'wiggle'
    };

export const TouchAction: {[index: string]: TouchAction} = {
  PAN_Y: 'pan-y',
  PAN_X: 'pan-x',
  NONE: 'none'
};

export const fieldOfViewIntrinsics = () => {
  return {
    basis:
        [degreesToRadians(numberNode(DEFAULT_FOV_DEG, 'deg')) as
         NumberNode<'rad'>],
    keywords: {auto: [null]}
  };
};

const minFieldOfViewIntrinsics = () => {
  return {
    basis:
        [degreesToRadians(numberNode(DEFAULT_MIN_FOV_DEG, 'deg')) as
         NumberNode<'rad'>],
    keywords: {auto: [null]}
  };
};

export const cameraOrbitIntrinsics = (() => {
  const defaultTerms =
      parseExpressions(DEFAULT_CAMERA_ORBIT)[0]
          .terms as [NumberNode<'rad'>, NumberNode<'rad'>, IdentNode];

  const theta = normalizeUnit(defaultTerms[0]) as NumberNode<'rad'>;
  const phi = normalizeUnit(defaultTerms[1]) as NumberNode<'rad'>;

  return (element: ModelViewerElementBase) => {
    const radius = element[$scene].idealCameraDistance();

    return {
      basis: [theta, phi, numberNode(radius, 'm')],
      keywords: {auto: [null, null, numberNode(105, '%')]}
    };
  };
})();

const minCameraOrbitIntrinsics = (element: ModelViewerElementBase&
                                  ControlsInterface) => {
  const radius = MINIMUM_RADIUS_RATIO * element[$scene].boundingSphere.radius;

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
export const $panElement = Symbol('panElement');
export const $promptElement = Symbol('promptElement');
export const $promptAnimatedContainer = Symbol('promptAnimatedContainer');
export const $fingerAnimatedContainers = Symbol('fingerAnimatedContainers');

const $deferInteractionPrompt = Symbol('deferInteractionPrompt');
const $updateAria = Symbol('updateAria');
const $updateCameraForRadius = Symbol('updateCameraForRadius');

const $onChange = Symbol('onChange');
const $onPointerChange = Symbol('onPointerChange');

const $waitingToPromptUser = Symbol('waitingToPromptUser');
const $userHasInteracted = Symbol('userHasInteracted');
const $promptElementVisibleTime = Symbol('promptElementVisibleTime');
const $lastPromptOffset = Symbol('lastPromptOffset');

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
  interactionPromptThreshold: number;
  orbitSensitivity: number;
  touchAction: TouchAction;
  interpolationDecay: number;
  disableZoom: boolean;
  disablePan: boolean;
  disableTap: boolean;
  getCameraOrbit(): SphericalPosition;
  getCameraTarget(): Vector3D;
  getFieldOfView(): number;
  getMinimumFieldOfView(): number;
  getMaximumFieldOfView(): number;
  getIdealAspect(): number;
  jumpCameraToGoal(): void;
  updateFraming(): Promise<void>;
  resetInteractionPrompt(): void;
  zoom(keyPresses: number): void;
  interact(duration: number, finger0: Finger, finger1?: Finger): void;
  inputSensitivity: number;
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

    @style(
        {intrinsics: fieldOfViewIntrinsics, updateHandler: $syncMaxFieldOfView})
    @property(
        {type: String, attribute: 'max-field-of-view', hasChanged: () => true})
    maxFieldOfView: string = 'auto';

    @property({type: Number, attribute: 'interaction-prompt-threshold'})
    interactionPromptThreshold: number = DEFAULT_INTERACTION_PROMPT_THRESHOLD;

    @property({type: String, attribute: 'interaction-prompt'})
    interactionPrompt: InteractionPromptStrategy =
        InteractionPromptStrategy.AUTO;

    @property({type: String, attribute: 'interaction-prompt-style'})
    interactionPromptStyle: InteractionPromptStyle =
        InteractionPromptStyle.WIGGLE;

    @property({type: Number, attribute: 'orbit-sensitivity'})
    orbitSensitivity: number = 1;

    @property({type: String, attribute: 'touch-action'})
    touchAction: TouchAction = TouchAction.NONE;

    @property({type: Boolean, attribute: 'disable-zoom'})
    disableZoom: boolean = false;

    @property({type: Boolean, attribute: 'disable-pan'})
    disablePan: boolean = false;

    @property({type: Boolean, attribute: 'disable-tap'})
    disableTap: boolean = false;

    @property({type: Number, attribute: 'interpolation-decay'})
    interpolationDecay: number = DECAY_MILLISECONDS;

    protected[$promptElement] =
        this.shadowRoot!.querySelector('.interaction-prompt') as HTMLElement;
    protected[$promptAnimatedContainer] =
        this.shadowRoot!.querySelector('#prompt') as HTMLElement;
    protected[$fingerAnimatedContainers]: HTMLElement[] = [
      this.shadowRoot!.querySelector('#finger0')!,
      this.shadowRoot!.querySelector('#finger1')!
    ];
    protected[$panElement] =
        this.shadowRoot!.querySelector('.pan-target') as HTMLElement;

    protected[$lastPromptOffset] = 0;
    protected[$promptElementVisibleTime] = Infinity;
    protected[$userHasInteracted] = false;
    protected[$waitingToPromptUser] = false;

    protected[$controls] = new SmoothControls(
        this[$scene].camera as PerspectiveCamera, this[$userInputElement],
        this[$scene]);

    protected[$lastSpherical] = new Spherical();
    protected[$jumpCamera] = false;
    protected[$initialized] = false;
    protected[$maintainThetaPhi] = false;

    get inputSensitivity(): number {
      return this[$controls].inputSensitivity;
    }

    set inputSensitivity(value: number) {
      this[$controls].inputSensitivity = value;
    }

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

    getIdealAspect(): number {
      return this[$scene].idealAspect;
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

    zoom(keyPresses: number) {
      const event = new WheelEvent('wheel', {deltaY: -30 * keyPresses});
      this[$userInputElement].dispatchEvent(event);
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
      const scene = this[$scene];

      if (changedProperties.has('cameraControls')) {
        if (this.cameraControls) {
          controls.enableInteraction();
          if (this.interactionPrompt === InteractionPromptStrategy.AUTO) {
            this[$waitingToPromptUser] = true;
          }
        } else {
          controls.disableInteraction();
          this[$deferInteractionPrompt]();
        }
        this[$userInputElement].setAttribute('aria-label', this[$ariaLabel]);
      }

      if (changedProperties.has('disableZoom')) {
        controls.disableZoom = this.disableZoom;
      }

      if (changedProperties.has('disablePan')) {
        controls.enablePan = !this.disablePan;
      }

      if (changedProperties.has('disableTap')) {
        controls.enableTap = !this.disableTap;
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
        this[$promptAnimatedContainer].style.opacity =
            this.interactionPromptStyle == InteractionPromptStyle.BASIC ? '1' :
                                                                          '0';
      }

      if (changedProperties.has('touchAction')) {
        const touchAction = this.touchAction;
        controls.applyOptions({touchAction});
        controls.updateTouchActionStyle();
      }

      if (changedProperties.has('orbitSensitivity')) {
        controls.orbitSensitivity = this.orbitSensitivity;
      }

      if (changedProperties.has('interpolationDecay')) {
        controls.setDamperDecayTime(this.interpolationDecay);
        scene.setTargetDamperDecayTime(this.interpolationDecay);
      }

      if (this[$jumpCamera] === true) {
        Promise.resolve().then(() => {
          controls.jumpToGoal();
          scene.jumpToGoal();
          this[$jumpCamera] = false;
        });
      }
    }

    async updateFraming() {
      const scene = this[$scene];
      const oldFramedFoV = scene.adjustedFoV(scene.framedFoVDeg);

      await scene.updateFraming();

      const newFramedFoV = scene.adjustedFoV(scene.framedFoVDeg);
      const zoom = this[$controls].getFieldOfView() / oldFramedFoV;
      this[$controls].setFieldOfView(newFramedFoV * zoom);
      this[$maintainThetaPhi] = true;

      this.requestUpdate('maxFieldOfView');
      this.requestUpdate('fieldOfView');
      this.requestUpdate('minCameraOrbit');
      this.requestUpdate('maxCameraOrbit');
      this.requestUpdate('cameraOrbit');
      await this.updateComplete;
    }

    interact(duration: number, finger0: Finger, finger1?: Finger) {
      const inputElement = this[$userInputElement];
      const fingerElements = this[$fingerAnimatedContainers];

      if (fingerElements[0].style.opacity === '1') {
        console.warn(
            'interact() failed because an existing interaction is running.')
        return;
      }

      const xy = new Array<{x: TimingFunction, y: TimingFunction}>();
      xy.push({x: timeline(finger0.x), y: timeline(finger0.y)});
      const positions = [{x: xy[0].x(0), y: xy[0].y(0)}];

      if (finger1 != null) {
        xy.push({x: timeline(finger1.x), y: timeline(finger1.y)});
        positions.push({x: xy[1].x(0), y: xy[1].y(0)});
      }

      let startTime = performance.now();
      const {width, height} = this[$scene];

      const dispatchTouches = (type: string) => {
        for (const [i, position] of positions.entries()) {
          const {style} = fingerElements[i];
          style.transform = `translateX(${width * position.x}px) translateY(${
              height * position.y}px)`;
          if (type === 'pointerdown') {
            style.opacity = '1';
          } else if (type === 'pointerup') {
            style.opacity = '0';
          }

          const init = {
            pointerId: i - 5678,  // help ensure uniqueness
            pointerType: 'touch',
            target: inputElement,
            clientX: width * position.x,
            clientY: height * position.y,
            altKey: true  // flag that this is not a user interaction
          } as PointerEventInit;

          inputElement.dispatchEvent(new PointerEvent(type, init));
        }
      };

      const moveTouches = () => {
        // Cancel interaction if something else moves the camera or input is
        // removed from the DOM.
        const {changeSource} = this[$controls];
        if (changeSource !== ChangeSource.AUTOMATIC ||
            !inputElement.isConnected) {
          for (const fingerElement of this[$fingerAnimatedContainers]) {
            fingerElement.style.opacity = '0';
          }
          dispatchTouches('pointercancel');
          this.dispatchEvent(new CustomEvent<CameraChangeDetails>(
              'interact-stopped', {detail: {source: changeSource}}));
          document.removeEventListener('visibilitychange', onVisibilityChange);
          return;
        }

        const time = Math.min(1, (performance.now() - startTime) / duration);
        for (const [i, position] of positions.entries()) {
          position.x = xy[i].x(time);
          position.y = xy[i].y(time);
        }
        dispatchTouches('pointermove');

        if (time < 1) {
          requestAnimationFrame(moveTouches);
        } else {
          dispatchTouches('pointerup');
          this.dispatchEvent(new CustomEvent<CameraChangeDetails>(
              'interact-stopped', {detail: {source: changeSource}}));
          document.removeEventListener('visibilitychange', onVisibilityChange);
        }
      };

      const onVisibilityChange = () => {
        let elapsed = 0;
        if (document.visibilityState === 'hidden') {
          elapsed = performance.now() - startTime;
        } else {
          startTime = performance.now() - elapsed;
        }
      };

      document.addEventListener('visibilitychange', onVisibilityChange);

      dispatchTouches('pointerdown');

      requestAnimationFrame(moveTouches);
    }

    [$syncFieldOfView](style: EvaluatedStyle<Intrinsics<['rad']>>) {
      const scene = this[$scene];
      scene.framedFoVDeg = style[0] * 180 / Math.PI;
      this[$controls].setFieldOfView(scene.adjustedFoV(scene.framedFoVDeg));
    }

    [$syncCameraOrbit](style: EvaluatedStyle<SphericalIntrinsics>) {
      const controls = this[$controls];
      if (this[$maintainThetaPhi]) {
        const {theta, phi} = this.getCameraOrbit();
        style[0] = theta;
        style[1] = phi;
        this[$maintainThetaPhi] = false;
      }
      controls.changeSource = ChangeSource.NONE;
      controls.setOrbit(style[0], style[1], style[2]);
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
      const fov = this[$scene].adjustedFoV(style[0] * 180 / Math.PI);
      this[$controls].applyOptions({maximumFieldOfView: fov});
      this.jumpCameraToGoal();
    }

    [$syncCameraTarget](style: EvaluatedStyle<Vector3Intrinsics>) {
      const [x, y, z] = style;
      if (!this[$renderer].arRenderer.isPresenting) {
        this[$scene].setTarget(x, y, z);
      }
      this[$controls].changeSource = ChangeSource.NONE;
      this[$renderer].arRenderer.updateTarget();
    }

    [$tick](time: number, delta: number) {
      super[$tick](time, delta);

      if (this[$renderer].isPresenting || !this[$getModelIsVisible]()) {
        return;
      }

      const controls = this[$controls];
      const scene = this[$scene];

      const now = performance.now();
      if (this[$waitingToPromptUser]) {
        if (this.loaded &&
            now > this[$loadedTime] + this.interactionPromptThreshold) {
          this[$waitingToPromptUser] = false;
          this[$promptElementVisibleTime] = now;

          this[$promptElement].classList.add('visible');
        }
      }

      if (isFinite(this[$promptElementVisibleTime]) &&
          this.interactionPromptStyle === InteractionPromptStyle.WIGGLE) {
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

          controls.changeSource = ChangeSource.AUTOMATIC;
          controls.adjustOrbit(deltaTheta, 0, 0);

          this[$lastPromptOffset] = offset;
        }
      }

      controls.update(time, delta);
      if (scene.updateTarget(delta)) {
        this[$onChange]({type: 'change', source: controls.changeSource});
      }
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
      const maximumRadius =
          Math.max(this[$scene].boundingSphere.radius, radius);

      const near = 0;
      const far = 2 * maximumRadius;
      this[$controls].updateNearFar(near, far);
    }

    [$updateAria]() {
      const {theta, phi} =
          this[$controls]!.getCameraSpherical(this[$lastSpherical]);

      const azimuthalQuadrant =
          (4 + Math.floor(((theta % TAU) + QUARTER_PI) / HALF_PI)) % 4;

      const polarTrient = Math.floor(phi / THIRD_PI);

      const azimuthalQuadrantLabel =
          AZIMUTHAL_QUADRANT_LABELS[azimuthalQuadrant];
      const polarTrientLabel = POLAR_TRIENT_LABELS[polarTrient];

      this[$updateStatus](
          `View from stage ${polarTrientLabel}${azimuthalQuadrantLabel}`);
    }

    get[$ariaLabel]() {
      return super[$ariaLabel] +
          (this.cameraControls ? INTERACTION_PROMPT : '');
    }

    async[$onResize](event: any) {
      const controls = this[$controls];
      const scene = this[$scene];
      const oldFramedFoV = scene.adjustedFoV(scene.framedFoVDeg);

      // The super of $onResize may update the scene's adjustedFoV, so we
      // compare the before and after to calculate the proper zoom.
      super[$onResize](event);

      const fovRatio = scene.adjustedFoV(scene.framedFoVDeg) / oldFramedFoV;
      const fov =
          controls.getFieldOfView() * (isFinite(fovRatio) ? fovRatio : 1);

      controls.updateAspect(this[$scene].aspect);

      this.requestUpdate('maxFieldOfView', this.maxFieldOfView);
      await this.updateComplete;
      this[$controls].setFieldOfView(fov);

      this.jumpCameraToGoal();
    }

    [$onModelLoad]() {
      super[$onModelLoad]();

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
