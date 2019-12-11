/* @license
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

import {Euler, Event as ThreeEvent, EventDispatcher, PerspectiveCamera, Spherical, Vector3} from 'three';

import {clamp} from '../utilities.js';

export type EventHandlingBehavior = 'prevent-all'|'prevent-handled';
export type InteractionPolicy = 'always-allow'|'allow-when-focused';
export type TouchMode = 'rotate'|'zoom';

interface Pointer {
  clientX: number, clientY: number,
}

export interface SmoothControlsOptions {
  // The closest the camera can be to the target
  minimumRadius?: number;
  // The farthest the camera can be from the target
  maximumRadius?: number;
  // The minimum angle between model-up and the camera polar position
  minimumPolarAngle?: number;
  // The maximum angle between model-up and the camera polar position
  maximumPolarAngle?: number;
  // The minimum angle between model-forward and the camera azimuthal position
  minimumAzimuthalAngle?: number;
  // The maximum angle between model-forward and the camera azimuthal position
  maximumAzimuthalAngle?: number;
  // The minimum camera field of view in degrees
  minimumFieldOfView?: number;
  // The maximum camera field of view in degrees
  maximumFieldOfView?: number;
  // Controls when events will be cancelled (always, or only when handled)
  eventHandlingBehavior?: EventHandlingBehavior;
  // Controls when interaction is allowed (always, or only when focused)
  interactionPolicy?: InteractionPolicy;
}

export const DEFAULT_OPTIONS = Object.freeze<SmoothControlsOptions>({
  minimumRadius: 0,
  maximumRadius: Infinity,
  minimumPolarAngle: Math.PI / 8,
  maximumPolarAngle: Math.PI - Math.PI / 8,
  minimumAzimuthalAngle: -Infinity,
  maximumAzimuthalAngle: Infinity,
  minimumFieldOfView: 10,
  maximumFieldOfView: 45,
  eventHandlingBehavior: 'prevent-all',
  interactionPolicy: 'always-allow'
});

const $velocity = Symbol('v');

// Internal orbital position state
const $spherical = Symbol('spherical');
const $goalSpherical = Symbol('goalSpherical');
const $thetaDamper = Symbol('thetaDamper');
const $phiDamper = Symbol('phiDamper');
const $radiusDamper = Symbol('radiusDamper');
const $logFov = Symbol('fov');
const $goalLogFov = Symbol('goalLogFov');
const $fovDamper = Symbol('fovDamper');
const $target = Symbol('target');
const $goalTarget = Symbol('goalTarget');
const $targetDamperX = Symbol('targetDamperX');
const $targetDamperY = Symbol('targetDamperY');
const $targetDamperZ = Symbol('targetDamperZ');

const $options = Symbol('options');
const $touchMode = Symbol('touchMode');
const $canInteract = Symbol('canInteract');
const $interactionEnabled = Symbol('interactionEnabled');
const $userAdjustOrbit = Symbol('userAdjustOrbit');
const $isUserChange = Symbol('isUserChange');
const $isStationary = Symbol('isMoving');
const $moveCamera = Symbol('moveCamera');

// Pointer state
const $pointerIsDown = Symbol('pointerIsDown');
const $lastPointerPosition = Symbol('lastPointerPosition');
const $lastTouches = Symbol('lastTouches');

// Value conversion methods
const $pixelLengthToSphericalAngle = Symbol('pixelLengthToSphericalAngle');
const $twoTouchDistance = Symbol('twoTouchDistance');
const $wrapAngle = Symbol('wrapAngle');

// Event handlers
const $onMouseMove = Symbol('onMouseMove');
const $onMouseDown = Symbol('onMouseDown');
const $onMouseUp = Symbol('onMouseUp');
const $onTouchStart = Symbol('onTouchStart');
const $onTouchEnd = Symbol('onTouchEnd');
const $onTouchMove = Symbol('onTouchMove');
const $onWheel = Symbol('onWheel');
const $onKeyDown = Symbol('onKeyDown');
const $handlePointerMove = Symbol('handlePointerMove');
const $handleSinglePointerMove = Symbol('handleSinglePointerMove');
const $handlePointerDown = Symbol('handlePointerDown');
const $handleSinglePointerDown = Symbol('handleSinglePointerDown');
const $handlePointerUp = Symbol('handlePointerUp');
const $handleWheel = Symbol('handleWheel');
const $handleKey = Symbol('handleKey');

// Constants
const TOUCH_EVENT_RE = /^touch(start|end|move)$/;
const KEYBOARD_ORBIT_INCREMENT = Math.PI / 8;
const ZOOM_SENSITIVITY = 0.1;
const DECAY_MILLISECONDS = 50;
const NATURAL_FREQUENCY = 1 / DECAY_MILLISECONDS;
const NIL_SPEED = 0.0002 * NATURAL_FREQUENCY;

export const KeyCode = {
  PAGE_UP: 33,
  PAGE_DOWN: 34,
  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  DOWN: 40
};

export type ChangeSource = 'user-interaction'|'none';

export const ChangeSource: {[index: string]: ChangeSource} = {
  USER_INTERACTION: 'user-interaction',
  NONE: 'none'
};

/**
 * ChangEvents are dispatched whenever the camera position or orientation has
 * changed
 */
export interface ChangeEvent extends ThreeEvent {
  /**
   * determines what was the originating reason for the change event eg user or
   * none
   */
  source: ChangeSource,
}

/**
 * The Damper class is a generic second-order critically damped system that does
 * one linear step of the desired length of time. The only parameter is
 * DECAY_MILLISECONDS, which should be adjustable: TODO(#580). This common
 * parameter makes all states converge at the same rate regardless of scale.
 * xNormalization is a number to provide the rough scale of x, such that
 * NIL_SPEED clamping also happens at roughly the same convergence for all
 * states.
 */
export class Damper {
  private[$velocity]: number = 0;

  update(
      x: number, xGoal: number, timeStepMilliseconds: number,
      xNormalization: number): number {
    if (x == null) {
      return xGoal;
    }
    if (x === xGoal && this[$velocity] === 0) {
      return xGoal;
    }
    if (timeStepMilliseconds < 0) {
      return x;
    }
    // Exact solution to a critically damped second-order system, where:
    // acceleration = NATURAL_FREQUENCY * NATURAL_FREQUENCY * (xGoal - x) -
    // 2 * NATURAL_FREQUENCY * this[$velocity];
    const deltaX = (x - xGoal);
    const intermediateVelocity = this[$velocity] + NATURAL_FREQUENCY * deltaX;
    const intermediateX = deltaX + timeStepMilliseconds * intermediateVelocity;
    const decay = Math.exp(-NATURAL_FREQUENCY * timeStepMilliseconds);
    const newVelocity =
        (intermediateVelocity - NATURAL_FREQUENCY * intermediateX) * decay;
    const acceleration =
        -NATURAL_FREQUENCY * (newVelocity + intermediateVelocity * decay);
    if (Math.abs(newVelocity) < NIL_SPEED * xNormalization &&
        acceleration * deltaX >= 0) {
      // This ensures the controls settle and stop calling this function instead
      // of asymptotically approaching their goal.
      this[$velocity] = 0;
      return xGoal;
    } else {
      this[$velocity] = newVelocity;
      return xGoal + intermediateX * decay;
    }
  }
}

/**
 * SmoothControls is a Three.js helper for adding delightful pointer and
 * keyboard-based input to a staged Three.js scene. Its API is very similar to
 * OrbitControls, but it offers more opinionated (subjectively more delightful)
 * defaults, easy extensibility and subjectively better out-of-the-box keyboard
 * support.
 *
 * One important change compared to OrbitControls is that the `update` method
 * of SmoothControls must be invoked on every frame, otherwise the controls
 * will not have an effect.
 *
 * Another notable difference compared to OrbitControls is that SmoothControls
 * does not currently support panning (but probably will in a future revision).
 *
 * Like OrbitControls, SmoothControls assumes that the orientation of the camera
 * has been set in terms of position, rotation and scale, so it is important to
 * ensure that the camera's matrixWorld is in sync before using SmoothControls.
 */
export class SmoothControls extends EventDispatcher {
  private[$interactionEnabled]: boolean = false;

  private[$options]: SmoothControlsOptions;
  private[$isUserChange] = false;

  private[$spherical] = new Spherical();
  private[$goalSpherical] = new Spherical();
  private[$thetaDamper] = new Damper();
  private[$phiDamper] = new Damper();
  private[$radiusDamper] = new Damper();
  private[$logFov]: number;
  private[$goalLogFov]: number;
  private[$fovDamper] = new Damper();
  private[$target] = new Vector3();
  private[$goalTarget] = new Vector3();
  private[$targetDamperX] = new Damper();
  private[$targetDamperY] = new Damper();
  private[$targetDamperZ] = new Damper();

  private[$pointerIsDown] = false;
  private[$lastPointerPosition]: Pointer = {
    clientX: 0,
    clientY: 0,
  };
  private[$lastTouches]: TouchList;
  private[$touchMode]: TouchMode;

  private[$onMouseMove]: (event: Event) => void;
  private[$onMouseDown]: (event: Event) => void;
  private[$onMouseUp]: (event: Event) => void;
  private[$onWheel]: (event: Event) => void;
  private[$onKeyDown]: (event: Event) => void;

  private[$onTouchStart]: (event: Event) => void;
  private[$onTouchEnd]: (event: Event) => void;
  private[$onTouchMove]: (event: Event) => void;

  constructor(
      readonly camera: PerspectiveCamera, readonly element: HTMLElement) {
    super();

    this[$onMouseMove] = (event: Event) =>
        this[$handlePointerMove](event as MouseEvent);
    this[$onMouseDown] = (event: Event) =>
        this[$handlePointerDown](event as MouseEvent);
    this[$onMouseUp] = (event: Event) =>
        this[$handlePointerUp](event as MouseEvent);
    this[$onWheel] = (event: Event) => this[$handleWheel](event as WheelEvent);
    this[$onKeyDown] = (event: Event) =>
        this[$handleKey](event as KeyboardEvent);
    this[$onTouchStart] = (event: Event) =>
        this[$handlePointerDown](event as TouchEvent);
    this[$onTouchEnd] = (event: Event) =>
        this[$handlePointerUp](event as TouchEvent);
    this[$onTouchMove] = (event: Event) =>
        this[$handlePointerMove](event as TouchEvent);

    this[$options] = Object.assign({}, DEFAULT_OPTIONS);

    this.setOrbit(0, Math.PI / 2, 1);
    this.setFieldOfView(100);
    this.jumpToGoal();
  }

  get interactionEnabled(): boolean {
    return this[$interactionEnabled];
  }

  enableInteraction() {
    if (this[$interactionEnabled] === false) {
      const {element} = this;
      element.addEventListener('mousemove', this[$onMouseMove]);
      element.addEventListener('mousedown', this[$onMouseDown]);
      element.addEventListener('wheel', this[$onWheel]);
      element.addEventListener('keydown', this[$onKeyDown]);
      element.addEventListener('touchstart', this[$onTouchStart]);
      element.addEventListener('touchmove', this[$onTouchMove]);

      self.addEventListener('mouseup', this[$onMouseUp]);
      self.addEventListener('touchend', this[$onTouchEnd]);

      this.element.style.cursor = 'grab';
      this[$interactionEnabled] = true;
    }
  }

  disableInteraction() {
    if (this[$interactionEnabled] === true) {
      const {element} = this;

      element.removeEventListener('mousemove', this[$onMouseMove]);
      element.removeEventListener('mousedown', this[$onMouseDown]);
      element.removeEventListener('wheel', this[$onWheel]);
      element.removeEventListener('keydown', this[$onKeyDown]);
      element.removeEventListener('touchstart', this[$onTouchStart]);
      element.removeEventListener('touchmove', this[$onTouchMove]);

      self.removeEventListener('mouseup', this[$onMouseUp]);
      self.removeEventListener('touchend', this[$onTouchEnd]);

      element.style.cursor = '';
      this[$interactionEnabled] = false;
    }
  }

  /**
   * The options that are currently configured for the controls instance.
   */
  get options() {
    return this[$options];
  }

  /**
   * Copy the spherical values that represent the current camera orbital
   * position relative to the configured target into a provided Spherical
   * instance. If no Spherical is provided, a new Spherical will be allocated
   * to copy the values into. The Spherical that values are copied into is
   * returned.
   */
  getCameraSpherical(target: Spherical = new Spherical()) {
    return target.copy(this[$spherical]);
  }

  /**
   * Returns the camera's current vertical field of view in degrees.
   */
  getFieldOfView(): number {
    return this.camera.fov;
  }

  /**
   * Configure the options of the controls. Configured options will be
   * merged with whatever options have already been configured for this
   * controls instance.
   */
  applyOptions(options: SmoothControlsOptions) {
    Object.assign(this[$options], options);
    // Re-evaluates clamping based on potentially new values for min/max
    // polar, azimuth and radius:
    this.setOrbit();
    this.setFieldOfView(Math.exp(this[$goalLogFov]));
    // Prevent interpolation in the case that any target spherical values
    // changed (preserving OrbitalControls behavior):
    this.jumpToGoal();
  }

  /**
   * Sets the near and far planes of the camera.
   */
  updateNearFar(nearPlane: number, farPlane: number) {
    this.camera.near = Math.max(nearPlane, farPlane / 1000);
    this.camera.far = farPlane;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Sets the aspect ratio of the camera
   */
  updateAspect(aspect: number) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Set the absolute orbital goal of the camera. The change will be
   * applied over a number of frames depending on configured acceleration and
   * dampening options.
   *
   * Returns true if invoking the method will result in the camera changing
   * position and/or rotation, otherwise false.
   */
  setOrbit(
      goalTheta: number = this[$goalSpherical].theta,
      goalPhi: number = this[$goalSpherical].phi,
      goalRadius: number = this[$goalSpherical].radius): boolean {
    const {
      minimumAzimuthalAngle,
      maximumAzimuthalAngle,
      minimumPolarAngle,
      maximumPolarAngle,
      minimumRadius,
      maximumRadius
    } = this[$options];

    const {theta, phi, radius} = this[$goalSpherical];

    const nextTheta =
        clamp(goalTheta, minimumAzimuthalAngle!, maximumAzimuthalAngle!);
    if (!isFinite(minimumAzimuthalAngle!) &&
        !isFinite(maximumAzimuthalAngle!)) {
      this[$spherical].theta =
          this[$wrapAngle](this[$spherical].theta - nextTheta) + nextTheta;
    }

    const nextPhi = clamp(goalPhi, minimumPolarAngle!, maximumPolarAngle!);
    const nextRadius = clamp(goalRadius, minimumRadius!, maximumRadius!);

    if (nextTheta === theta && nextPhi === phi && nextRadius === radius) {
      return false;
    }

    this[$goalSpherical].theta = nextTheta;
    this[$goalSpherical].phi = nextPhi;
    this[$goalSpherical].radius = nextRadius;
    this[$goalSpherical].makeSafe();

    this[$isUserChange] = false;

    return true;
  }

  /**
   * Subset of setOrbit() above, which only sets the camera's radius.
   */
  setRadius(radius: number) {
    this[$goalSpherical].radius = radius;
    this.setOrbit();
  }

  /**
   * Sets the goal field of view for the camera
   */
  setFieldOfView(fov: number) {
    const {minimumFieldOfView, maximumFieldOfView} = this[$options];
    fov = clamp(fov, minimumFieldOfView!, maximumFieldOfView!);
    this[$goalLogFov] = Math.log(fov);
  }

  /**
   * Sets the target the camera is pointing toward
   */
  setTarget(x: number, y: number, z: number) {
    this[$goalTarget].set(x, y, z);
  }

  /**
   * Returns a copy of the target position the camera is pointed toward
   */
  getTarget(): Vector3 {
    return this[$target].clone();
  }

  /**
   * Adjust the orbital position of the camera relative to its current orbital
   * position. Does not let the theta goal get more than pi ahead of the current
   * theta, which ensures interpolation continues in the direction of the delta.
   */
  adjustOrbit(
      deltaTheta: number, deltaPhi: number, deltaRadius: number,
      deltaFov: number): boolean {
    const {theta, phi, radius} = this[$goalSpherical];

    const dTheta = this[$spherical].theta - theta;
    const dThetaLimit = Math.PI - 0.001;
    const goalTheta =
        theta - clamp(deltaTheta, -dThetaLimit - dTheta, dThetaLimit - dTheta);
    const goalPhi = phi - deltaPhi;
    const goalRadius = radius + deltaRadius;
    let handled = this.setOrbit(goalTheta, goalPhi, goalRadius);

    if (deltaFov !== 0) {
      const goalLogFov = this[$goalLogFov] + deltaFov;
      this.setFieldOfView(Math.exp(goalLogFov));
      handled = true;
    }

    return handled;
  }

  /**
   * Move the camera instantly instead of accelerating toward the goal
   * parameters.
   */
  jumpToGoal() {
    this.update(0, 100 * DECAY_MILLISECONDS);
  }

  /**
   * Update controls. In most cases, this will result in the camera
   * interpolating its position and rotation until it lines up with the
   * designated goal orbital position.
   *
   * Time and delta are measured in milliseconds.
   */
  update(_time: number, delta: number) {
    if (this[$isStationary]()) {
      return;
    }
    const {maximumPolarAngle, maximumRadius, maximumFieldOfView} =
        this[$options];

    const dTheta = this[$spherical].theta - this[$goalSpherical].theta;
    if (Math.abs(dTheta) > Math.PI &&
        !isFinite(this[$options].minimumAzimuthalAngle!) &&
        !isFinite(this[$options].maximumAzimuthalAngle!)) {
      this[$spherical].theta -= Math.sign(dTheta) * 2 * Math.PI;
    }

    this[$spherical].theta = this[$thetaDamper].update(
        this[$spherical].theta, this[$goalSpherical].theta, delta, Math.PI);

    this[$spherical].phi = this[$phiDamper].update(
        this[$spherical].phi,
        this[$goalSpherical].phi,
        delta,
        maximumPolarAngle!);

    this[$spherical].radius = this[$radiusDamper].update(
        this[$spherical].radius,
        this[$goalSpherical].radius,
        delta,
        maximumRadius!);

    this[$logFov] = this[$fovDamper].update(
        this[$logFov], this[$goalLogFov], delta, maximumFieldOfView!);

    this[$target].x = this[$targetDamperX].update(
        this[$target].x, this[$goalTarget].x, delta, maximumRadius!);
    this[$target].y = this[$targetDamperY].update(
        this[$target].y, this[$goalTarget].y, delta, maximumRadius!);
    this[$target].z = this[$targetDamperZ].update(
        this[$target].z, this[$goalTarget].z, delta, maximumRadius!);

    this[$moveCamera]();
  }

  private[$isStationary](): boolean {
    return this[$goalSpherical].theta === this[$spherical].theta &&
        this[$goalSpherical].phi === this[$spherical].phi &&
        this[$goalSpherical].radius === this[$spherical].radius &&
        this[$goalLogFov] === this[$logFov] &&
        this[$goalTarget].equals(this[$target]);
  }

  private[$moveCamera]() {
    // Derive the new camera position from the updated spherical:
    this[$spherical].makeSafe();
    this.camera.position.setFromSpherical(this[$spherical]);
    this.camera.position.add(this[$target]);
    this.camera.setRotationFromEuler(new Euler(
        this[$spherical].phi - Math.PI / 2, this[$spherical].theta, 0, 'YXZ'));

    if (this.camera.fov !== Math.exp(this[$logFov])) {
      this.camera.fov = Math.exp(this[$logFov]);
      this.camera.updateProjectionMatrix();
    }

    const source =
        this[$isUserChange] ? ChangeSource.USER_INTERACTION : ChangeSource.NONE;

    this.dispatchEvent({type: 'change', source});
  }

  private get[$canInteract](): boolean {
    if (this[$options].interactionPolicy == 'allow-when-focused') {
      const rootNode = this.element.getRootNode() as Document | ShadowRoot;
      return rootNode.activeElement === this.element;
    }

    return this[$options].interactionPolicy === 'always-allow';
  }

  private[$userAdjustOrbit](
      deltaTheta: number, deltaPhi: number, deltaRadius: number,
      deltaFov: number): boolean {
    const handled =
        this.adjustOrbit(deltaTheta, deltaPhi, deltaRadius, deltaFov);

    this[$isUserChange] = true;
    // Always make sure that an initial event is triggered in case there is
    // contention between user interaction and imperative changes. This initial
    // event will give external observers that chance to observe that
    // interaction occurred at all:
    this.dispatchEvent({type: 'change', source: ChangeSource.USER_INTERACTION});

    return handled;
  }

  // Wraps to bewteen -pi and pi
  private[$wrapAngle](radians: number): number {
    const normalized = (radians + Math.PI) / (2 * Math.PI);
    const wrapped = normalized - Math.floor(normalized);
    return wrapped * 2 * Math.PI - Math.PI;
  }

  private[$pixelLengthToSphericalAngle](pixelLength: number): number {
    return 2 * Math.PI * pixelLength / this.element.clientHeight;
  }

  private[$twoTouchDistance](touchOne: Touch, touchTwo: Touch): number {
    const {clientX: xOne, clientY: yOne} = touchOne;
    const {clientX: xTwo, clientY: yTwo} = touchTwo;
    const xDelta = xTwo - xOne;
    const yDelta = yTwo - yOne;

    return Math.sqrt(xDelta * xDelta + yDelta * yDelta);
  }

  private[$handlePointerMove](event: MouseEvent|TouchEvent) {
    if (!this[$pointerIsDown] || !this[$canInteract]) {
      return;
    }

    let handled = false;

    // NOTE(cdata): We test event.type as some browsers do not have a global
    // TouchEvent contructor.
    if (TOUCH_EVENT_RE.test(event.type)) {
      const {touches} = event as TouchEvent;

      switch (this[$touchMode]) {
        case 'zoom':
          if (this[$lastTouches].length > 1 && touches.length > 1) {
            const lastTouchDistance = this[$twoTouchDistance](
                this[$lastTouches][0], this[$lastTouches][1]);
            const touchDistance =
                this[$twoTouchDistance](touches[0], touches[1]);
            const deltaFov = -1 * ZOOM_SENSITIVITY *
                (touchDistance - lastTouchDistance) / 10.0;

            handled = this[$userAdjustOrbit](0, 0, 0, deltaFov);
          }

          break;
        case 'rotate':
          handled = this[$handleSinglePointerMove](touches[0]);
          break;
      }

      this[$lastTouches] = touches;
    } else {
      handled = this[$handleSinglePointerMove](event as MouseEvent);
    }

    if ((handled || this[$options].eventHandlingBehavior === 'prevent-all') &&
        event.cancelable) {
      event.preventDefault();
    };
  }

  private[$handleSinglePointerMove](pointer: Pointer): boolean {
    const {clientX, clientY} = pointer;
    const deltaTheta = this[$pixelLengthToSphericalAngle](
        clientX - this[$lastPointerPosition].clientX);
    const deltaPhi = this[$pixelLengthToSphericalAngle](
        clientY - this[$lastPointerPosition].clientY);

    this[$lastPointerPosition].clientX = clientX;
    this[$lastPointerPosition].clientY = clientY;

    return this[$userAdjustOrbit](deltaTheta, deltaPhi, 0, 0);
  }

  private[$handlePointerDown](event: MouseEvent|TouchEvent) {
    this[$pointerIsDown] = true;

    if (TOUCH_EVENT_RE.test(event.type)) {
      const {touches} = event as TouchEvent;

      switch (touches.length) {
        default:
        case 1:
          this[$touchMode] = 'rotate';
          this[$handleSinglePointerDown](touches[0]);
          break;
        case 2:
          this[$touchMode] = 'zoom';
          break;
      }

      this[$lastTouches] = touches;
    } else {
      this[$handleSinglePointerDown](event as MouseEvent);
    }
  }

  private[$handleSinglePointerDown](pointer: Pointer) {
    this[$lastPointerPosition].clientX = pointer.clientX;
    this[$lastPointerPosition].clientY = pointer.clientY;
    this.element.style.cursor = 'grabbing';
  }

  private[$handlePointerUp](_event: MouseEvent|TouchEvent) {
    this.element.style.cursor = 'grab';
    this[$pointerIsDown] = false;
  }

  private[$handleWheel](event: Event) {
    if (!this[$canInteract]) {
      return;
    }

    const deltaFov = (event as WheelEvent).deltaY * ZOOM_SENSITIVITY / 30;

    if ((this[$userAdjustOrbit](0, 0, 0, deltaFov) ||
         this[$options].eventHandlingBehavior === 'prevent-all') &&
        event.cancelable) {
      event.preventDefault();
    }
  }

  private[$handleKey](event: KeyboardEvent) {
    // We track if the key is actually one we respond to, so as not to
    // accidentally clober unrelated key inputs when the <model-viewer> has
    // focus and eventHandlingBehavior is set to 'prevent-all'.
    let relevantKey = false;
    let handled = false;

    switch (event.keyCode) {
      case KeyCode.PAGE_UP:
        relevantKey = true;
        handled = this[$userAdjustOrbit](0, 0, 0, ZOOM_SENSITIVITY);
        break;
      case KeyCode.PAGE_DOWN:
        relevantKey = true;
        handled = this[$userAdjustOrbit](0, 0, 0, -1 * ZOOM_SENSITIVITY);
        break;
      case KeyCode.UP:
        relevantKey = true;
        handled = this[$userAdjustOrbit](0, -KEYBOARD_ORBIT_INCREMENT, 0, 0);
        break;
      case KeyCode.DOWN:
        relevantKey = true;
        handled = this[$userAdjustOrbit](0, KEYBOARD_ORBIT_INCREMENT, 0, 0);
        break;
      case KeyCode.LEFT:
        relevantKey = true;
        handled = this[$userAdjustOrbit](-KEYBOARD_ORBIT_INCREMENT, 0, 0, 0);
        break;
      case KeyCode.RIGHT:
        relevantKey = true;
        handled = this[$userAdjustOrbit](KEYBOARD_ORBIT_INCREMENT, 0, 0, 0);
        break;
    }

    if (relevantKey &&
        (handled || this[$options].eventHandlingBehavior === 'prevent-all') &&
        event.cancelable) {
      event.preventDefault();
    }
  }
}
