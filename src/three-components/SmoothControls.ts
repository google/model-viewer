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

import {Event, EventDispatcher, PerspectiveCamera, Quaternion, Spherical, Vector2, Vector3} from 'three';

import {clamp} from '../utilities.js';

export type EventHandlingBehavior = 'prevent-all'|'prevent-handled';
export type InteractionPolicy = 'always-allow'|'allow-when-focused';
export type TouchMode = 'rotate'|'zoom';

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
  minimumFov?: number;
  // The maximum camera field of view in degrees
  maximumFov?: number;
  // Controls when events will be cancelled (always, or only when handled)
  eventHandlingBehavior?: EventHandlingBehavior;
  // Controls when interaction is allowed (always, or only when focused)
  interactionPolicy?: InteractionPolicy;
}

export const DEFAULT_OPTIONS = Object.freeze<SmoothControlsOptions>({
  minimumRadius: 0.5,
  maximumRadius: 2,
  minimumPolarAngle: Math.PI / 8,
  maximumPolarAngle: Math.PI - Math.PI / 8,
  minimumAzimuthalAngle: -Infinity,
  maximumAzimuthalAngle: Infinity,
  minimumFov: 20,
  maximumFov: 45,
  eventHandlingBehavior: 'prevent-all',
  interactionPolicy: 'allow-when-focused'
});

export const $idealCameraDistance = Symbol('idealCameraDistance');

// A Vector3 for holding interstitial values while converting Vector3 positions
// to spherical values. Should only be used as an internal implementation detail
// of the $positionToSpherical method on SmoothControls!
const vector3 = new Vector3();
const $velocity = Symbol('v');

// Internal orbital position state
const $spherical = Symbol('spherical');
const $destSpherical = Symbol('destSpherical');
const $thetaDamper = Symbol('thetaDamper');
const $phiDamper = Symbol('phiDamper');
const $radiusDamper = Symbol('radiusDamper');
const $fov = Symbol('fov');
const $destFov = Symbol('destFov');
const $fovDamper = Symbol('fovDamper');

const $options = Symbol('options');
const $upQuaternion = Symbol('upQuaternion');
const $upQuaternionInverse = Symbol('upQuaternionInverse');
const $touchMode = Symbol('touchMode');
const $canInteract = Symbol('canInteract');
const $interactionEnabled = Symbol('interactionEnabled');
const $zoomMeters = Symbol('zoomMeters');
const $userAdjustOrbit = Symbol('userAdjustOrbit');
const $isUserChange = Symbol('isUserChange');
const $isMoving = Symbol('isMoving');
const $moveCamera = Symbol('moveCamera');

// Pointer state
const $pointerIsDown = Symbol('pointerIsDown');
const $lastPointerPosition = Symbol('lastPointerPosition');
const $lastTouches = Symbol('lastTouches');

// Value conversion methods
const $pixelLengthToSphericalAngle = Symbol('pixelLengthToSphericalAngle');
const $positionToSpherical = Symbol('positionToSpherical');
const $sphericalToPosition = Symbol('sphericalToPosition');
const $twoTouchDistance = Symbol('twoTouchDistance');

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
const $handlePointerDown = Symbol('handlePointerDown');
const $handlePointerUp = Symbol('handlePointerUp');
const $handleWheel = Symbol('handleWheel');
const $handleKey = Symbol('handleKey');

// Constants
const USER_INTERACTION_CHANGE_SOURCE = 'user-interaction';
const DEFAULT_INTERACTION_CHANGE_SOURCE = 'none';
const TOUCH_EVENT_RE = /^touch(start|end|move)$/;
const KEYBOARD_ORBIT_INCREMENT = Math.PI / 8;
const DECAY_MILLISECONDS = 50;
const NATURAL_FREQ = 1 / DECAY_MILLISECONDS;
const NIL_SPEED = 0.0002 * NATURAL_FREQ;
const TAU = 2 * Math.PI;
const UP = new Vector3(0, 1, 0);

export const KeyCode = {
  PAGE_UP: 33,
  PAGE_DOWN: 34,
  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  DOWN: 40
};

/**
 * ChangEvents are dispatched whenever the camera position or orientation has
 * changed
 */
export interface ChangeEvent extends Event {
  /**
   * determines what was the originating reason for the change event eg user or
   * none
   */
  source: string,
}

class Damper {
  private[$velocity]: number = 0;

  update(
      x: number, xDest: number, timeStepMilliseconds: number,
      xNormalization: number): number {
    if (timeStepMilliseconds > DECAY_MILLISECONDS)
      // This clamps at the point where a large time step would cause the
      // discrete step to overshoot.
      return xDest;
    if (timeStepMilliseconds < 0)
      return x;
    // Critically damped
    const acceleration = NATURAL_FREQ * NATURAL_FREQ * (xDest - x) -
        2 * NATURAL_FREQ * this[$velocity];
    this[$velocity] += acceleration * timeStepMilliseconds;
    if (Math.abs(this[$velocity]) < NIL_SPEED * xNormalization &&
        acceleration * (xDest - x) <= 0)
      // This ensures the controls settle and stop calling this function instead
      // of asymptotically approaching their destination.
      return xDest;
    else
      return x + this[$velocity] * timeStepMilliseconds;
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
  protected[$idealCameraDistance]: number = 1.0;

  private[$interactionEnabled]: boolean = false;

  private[$options]: SmoothControlsOptions;
  private[$upQuaternion]: Quaternion = new Quaternion();
  private[$upQuaternionInverse]: Quaternion = new Quaternion();
  private[$isUserChange]: boolean = false;

  private[$spherical]: Spherical = new Spherical();
  private[$destSpherical]: Spherical = new Spherical();
  private[$thetaDamper]: Damper = new Damper();
  private[$phiDamper]: Damper = new Damper();
  private[$radiusDamper]: Damper = new Damper();
  private[$fov]: number;
  private[$destFov]: number;
  private[$fovDamper]: Damper = new Damper();

  private[$pointerIsDown]: boolean = false;
  private[$lastPointerPosition]: Vector2 = new Vector2();
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

  private[$zoomMeters]: number = 1;

  // The target position that the camera will orbit around
  readonly target: Vector3 = new Vector3();

  constructor(
      readonly camera: PerspectiveCamera, readonly element: HTMLElement) {
    super();

    this[$upQuaternion].setFromUnitVectors(camera.up, UP);
    this[$upQuaternionInverse].copy(this[$upQuaternion]).inverse();

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

    this[$positionToSpherical](this.camera.position, this[$spherical]);
    this[$destSpherical].copy(this[$spherical]);

    this[$options] = Object.assign({}, DEFAULT_OPTIONS);

    this.setOrbit();
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
   * Configure the options of the controls. Configured options will be
   * merged with whatever options have already been configured for this
   * controls instance.
   */
  applyOptions(options: SmoothControlsOptions) {
    Object.assign(this[$options], options);
    // Re-evaluates clamping based on potentially new values for min/max
    // polar, azimuth and radius:
    this.setOrbit();
    // Prevent interpolation in the case that any target spherical values
    // changed (preserving OrbitalControls behavior):
    this[$spherical].copy(this[$destSpherical]);
  }

  /**
   *
   */
  updateFraming(framedHeight: number, modelDepth: number, aspect: number) {
    const camera = this.camera;
    // Make zoom sensitivity scale with model size:
    this[$zoomMeters] = framedHeight / 10;
    const near =
        (framedHeight / 2) / Math.tan((camera.fov / 2) * Math.PI / 180);
    camera.near = framedHeight / 10.0;
    camera.far = framedHeight * 10.0;

    // When we update the idealCameraDistance due to reframing, we want to
    // maintain the user's zoom level (how they have changed the camera
    // radius), which we represent here as a ratio.
    const zoom = this[$spherical].radius / this[$idealCameraDistance];
    this[$idealCameraDistance] = near + modelDepth / 2;

    camera.aspect = aspect;
    camera.updateProjectionMatrix();

    // Zooming out beyond the 'frame' doesn't serve much purpose
    // and will only end up showing the skysphere if zoomed out enough
    const minimumRadius = camera.near + framedHeight / 2.0;
    const maximumRadius = this[$idealCameraDistance];

    this.applyOptions({minimumRadius, maximumRadius});

    this.target.set(0, 0, 0);

    this.setRadius(zoom * this[$idealCameraDistance]);
    this.jumpToDestination();
  }

  /**
   * Set the absolute orbital destination of the camera. The change will be
   * applied over a number of frames depending on configured acceleration and
   * dampening options.
   *
   * Returns true if invoking the method will result in the camera changing
   * position and/or rotation, otherwise false.
   */
  setOrbit(
      destTheta: number = this[$destSpherical].theta,
      destPhi: number = this[$destSpherical].phi,
      destRadius: string|number = this[$destSpherical].radius): boolean {
    const {
      minimumAzimuthalAngle,
      maximumAzimuthalAngle,
      minimumPolarAngle,
      maximumPolarAngle,
      minimumRadius,
      maximumRadius
    } = this[$options];

    const {theta, phi, radius} = this[$destSpherical];

    if (typeof destRadius === 'string') {
      switch (destRadius) {
        default:
        case 'auto':
          destRadius = this[$idealCameraDistance];
          break;
      }
    }

    const nextTheta =
        clamp(destTheta, minimumAzimuthalAngle!, maximumAzimuthalAngle!);
    const nextPhi = clamp(destPhi, minimumPolarAngle!, maximumPolarAngle!);
    const nextRadius = clamp(destRadius, minimumRadius!, maximumRadius!);

    if (nextTheta === theta && nextPhi === phi && nextRadius === radius) {
      return false;
    }

    this[$destSpherical].theta = nextTheta;
    this[$destSpherical].phi = nextPhi;
    this[$destSpherical].radius = nextRadius;
    this[$destSpherical].makeSafe();

    this[$isUserChange] = false;

    return true;
  }

  /**
   * Subset of setOrbit() above, which only sets the camera's radius.
   * @param radius
   */
  setRadius(radius: number) {
    this[$destSpherical].radius = radius;
    this.setOrbit();
  }

  /**
   * Sets the destination field of view for the camera
   * @param fov
   */
  setFov(fov: number) {
    const {minimumFov, maximumFov} = this[$options];
    this[$destFov] = clamp(fov, minimumFov!, maximumFov!);
  }

  /**
   * Adjust the orbital position of the camera relative to its current orbital
   * position.
   */
  adjustOrbit(deltaTheta: number, deltaPhi: number, deltaRadius: number):
      boolean {
    const {theta, phi, radius} = this[$destSpherical];

    const destTheta = theta - deltaTheta;
    const destPhi = phi - deltaPhi;
    const destRadius = radius + deltaRadius;

    return this.setOrbit(destTheta, destPhi, destRadius);
  }

  /**
   * Move the camera instantly instead of accelerating toward the setOrbit()
   * parameters.
   */
  jumpToDestination() {
    if (this[$isMoving]) {
      this[$spherical].copy(this[$destSpherical]);
      this[$fov] = this[$destFov];
      this[$moveCamera]();
    }
  }

  /**
   * Update controls. In most cases, this will result in the camera
   * interpolating its position and rotation until it lines up with the
   * designated destination orbital position.
   *
   * Time and delta are measured in milliseconds.
   */
  update(_time: number, delta: number) {
    if (this[$isMoving]) {
      const {maximumPolarAngle, maximumRadius, maximumFov} = this[$options];

      this[$spherical].theta = this[$thetaDamper].update(
          this[$spherical].theta, this[$destSpherical].theta, delta, Math.PI);

      this[$spherical].phi = this[$phiDamper].update(
          this[$spherical].phi,
          this[$destSpherical].phi,
          delta,
          maximumPolarAngle!);

      this[$spherical].radius = this[$radiusDamper].update(
          this[$spherical].radius,
          this[$destSpherical].radius,
          delta,
          maximumRadius!);

      this[$fov] = this[$fovDamper].update(
          this[$fov], this[$destFov], delta, maximumFov!);

      this[$moveCamera]();
    }
  }

  private[$isMoving](): boolean {
    return this[$destSpherical].theta !== this[$spherical].theta ||
        this[$destSpherical].phi !== this[$spherical].phi ||
        this[$destSpherical].radius !== this[$spherical].radius ||
        this[$destFov] !== this[$fov];
  }

  private[$moveCamera]() {
    // Derive the new camera position from the updated spherical:
    this[$spherical].makeSafe();
    this[$sphericalToPosition](this[$spherical], this.camera.position);
    if (this.camera.fov !== this[$fov]) {
      this.camera.fov = this[$fov];
      this.camera.updateProjectionMatrix();
    }

    this.camera.lookAt(this.target);

    const source = this[$isUserChange] ? USER_INTERACTION_CHANGE_SOURCE :
                                         DEFAULT_INTERACTION_CHANGE_SOURCE;

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
      deltaTheta: number, deltaPhi: number, deltaRadius: number): boolean {
    const handled = this.adjustOrbit(deltaTheta, deltaPhi, deltaRadius);

    this[$isUserChange] = true;

    return handled;
  }

  private[$pixelLengthToSphericalAngle](pixelLength: number): number {
    return TAU * pixelLength / this.element.clientHeight;
  }

  private[$positionToSpherical](position: Vector3, spherical: Spherical) {
    vector3.copy(position).sub(this.target);
    vector3.applyQuaternion(this[$upQuaternion]);

    spherical.setFromVector3(vector3);
    spherical.radius = vector3.length();
  }

  private[$sphericalToPosition](spherical: Spherical, position: Vector3) {
    position.setFromSpherical(spherical);
    position.applyQuaternion(this[$upQuaternionInverse]);
    position.add(this.target);
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
            const radiusDelta = -1 * this[$zoomMeters] *
                (touchDistance - lastTouchDistance) / 10.0;

            handled = this[$userAdjustOrbit](0, 0, radiusDelta);
          }

          break;
        case 'rotate':
          const {clientX: xOne, clientY: yOne} = this[$lastTouches][0];
          const {clientX: xTwo, clientY: yTwo} = touches[0];

          const deltaTheta = this[$pixelLengthToSphericalAngle](xTwo - xOne);
          const deltaPhi = this[$pixelLengthToSphericalAngle](yTwo - yOne);

          handled = this[$userAdjustOrbit](deltaTheta, deltaPhi, 0);
          break;
      }

      this[$lastTouches] = touches;
    } else {
      const {clientX: x, clientY: y} = event as MouseEvent;

      const deltaTheta =
          this[$pixelLengthToSphericalAngle](x - this[$lastPointerPosition].x);
      const deltaPhi =
          this[$pixelLengthToSphericalAngle](y - this[$lastPointerPosition].y);

      handled = this[$userAdjustOrbit](deltaTheta, deltaPhi, 0.0);

      this[$lastPointerPosition].set(x, y);
    }

    if ((handled || this[$options].eventHandlingBehavior === 'prevent-all') &&
        event.cancelable) {
      event.preventDefault();
    };
  }

  private[$handlePointerDown](event: MouseEvent|TouchEvent) {
    this[$pointerIsDown] = true;

    if (TOUCH_EVENT_RE.test(event.type)) {
      const {touches} = event as TouchEvent;

      switch (touches.length) {
        default:
        case 1:
          this[$touchMode] = 'rotate';
          break;
        case 2:
          this[$touchMode] = 'zoom';
          break;
      }

      this[$lastTouches] = touches;
    } else {
      const {clientX: x, clientY: y} = event as MouseEvent;
      this[$lastPointerPosition].set(x, y);
      this.element.style.cursor = 'grabbing';
    }
  }

  private[$handlePointerUp](_event: MouseEvent|TouchEvent) {
    this.element.style.cursor = 'grab';
    this[$pointerIsDown] = false;
  }

  private[$handleWheel](event: Event) {
    if (!this[$canInteract]) {
      return;
    }

    const deltaRadius = (event as WheelEvent).deltaY * this[$zoomMeters] / 10.0;

    if ((this[$userAdjustOrbit](0, 0, deltaRadius) ||
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
        handled = this[$userAdjustOrbit](0, 0, this[$zoomMeters]);
        break;
      case KeyCode.PAGE_DOWN:
        relevantKey = true;
        handled = this[$userAdjustOrbit](0, 0, -1 * this[$zoomMeters]);
        break;
      case KeyCode.UP:
        relevantKey = true;
        handled = this[$userAdjustOrbit](0, -KEYBOARD_ORBIT_INCREMENT, 0);
        break;
      case KeyCode.DOWN:
        relevantKey = true;
        handled = this[$userAdjustOrbit](0, KEYBOARD_ORBIT_INCREMENT, 0);
        break;
      case KeyCode.LEFT:
        relevantKey = true;
        handled = this[$userAdjustOrbit](-KEYBOARD_ORBIT_INCREMENT, 0, 0);
        break;
      case KeyCode.RIGHT:
        relevantKey = true;
        handled = this[$userAdjustOrbit](KEYBOARD_ORBIT_INCREMENT, 0, 0);
        break;
    }

    if (relevantKey &&
        (handled || this[$options].eventHandlingBehavior === 'prevent-all') &&
        event.cancelable) {
      event.preventDefault();
    }
  }
}
