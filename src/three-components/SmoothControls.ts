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

import {Camera, EventDispatcher, Quaternion, Spherical, Vector2, Vector3, Event} from 'three';

import {clamp, step} from '../utilities.js';

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
  // The distance from the target orbital position where deceleration will begin
  decelerationMargin?: number;
  // The rate of acceleration as the camera starts to change orbital position
  // The value is measured in world-meters-per-frame-per-frame
  acceleration?: number;
  // A scalar in 0..1 that changes the dampening factor, corresponding to
  // factors from 0.05..0.3
  dampeningScale?: number;
  // Controls when events will be cancelled (always, or only when handled)
  eventHandlingBehavior?: EventHandlingBehavior;
  // Controls when interaction is allowed (always, or only when focused)
  interactionPolicy?: InteractionPolicy;
}

export const DEFAULT_OPTIONS = Object.freeze<SmoothControlsOptions>({
  minimumRadius: 8,
  maximumRadius: 32,
  minimumPolarAngle: Math.PI / 8,
  maximumPolarAngle: Math.PI - Math.PI / 8,
  minimumAzimuthalAngle: -Infinity,
  maximumAzimuthalAngle: Infinity,
  decelerationMargin: 0.25,
  acceleration: 0.15,
  dampeningScale: 0.5,
  eventHandlingBehavior: 'prevent-all',
  interactionPolicy: 'allow-when-focused'
});


/**
 * This quick and dirty helper allows us to use Vector3's magnitude
 * implementation without allocating temporary Vector3 instances.
 */
const magnitude = (() => {
  const vector3 = new Vector3();

  return (x: number, y: number, z: number) => vector3.set(x, y, z).length();
})();

// A Vector3 for holding interstitial values while converting Vector3 positions
// to spherical values. Should only be used as an internal implementation detail
// of the $positionToSpherical method on SmoothControls!
const vector3 = new Vector3();

// Internal orbital position state
const $options = Symbol('options');
const $upQuaternion = Symbol('upQuaternion');
const $upQuaternionInverse = Symbol('upQuaternionInverse');
const $spherical = Symbol('spherical');
const $targetSpherical = Symbol('targetSpherical');
const $velocity = Symbol('velocity');
const $dampeningFactor = Symbol('dampeningFactor');
const $touchMode = Symbol('touchMode');
const $previousPosition = Symbol('previousPosition');
const $canInteract = Symbol('canInteract');
const $interactionEnabled = Symbol('interactionEnabled');
const $userAdjustOrbit = Symbol('userAdjustOrbit');
const $isUserChange = Symbol('isUserChange');

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
const ORBIT_STEP_EDGE = 0.001;
const MAXIMUM_DAMPENING_FACTOR = 0.05;
const MINIMUM_DAMPENING_FACTOR = 0.3;
const FRAME_MILLISECONDS = 1000.0 / 60.0;
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
 * ChangEvents are dispatched whenever the camera position or orientation has changed
 */
export interface ChangeEvent extends Event {
  /**
   * determines what was the originating reason for the change event eg user or none 
   */
  source: string,
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
  private[$upQuaternion]: Quaternion = new Quaternion();
  private[$upQuaternionInverse]: Quaternion = new Quaternion();
  private[$spherical]: Spherical = new Spherical();
  private[$targetSpherical]: Spherical = new Spherical();
  private[$previousPosition]: Vector3 = new Vector3();
  private[$isUserChange]: boolean = false;

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

  private[$velocity]: number = 0;

  // The target position that the camera will orbit around
  readonly target: Vector3 = new Vector3();

  constructor(readonly camera: Camera, readonly element: HTMLElement) {
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

    this[$previousPosition].copy(this.camera.position);
    this[$positionToSpherical](this.camera.position, this[$spherical]);
    this[$targetSpherical].copy(this[$spherical]);

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
    this[$spherical].copy(this[$targetSpherical]);
  }

  /**
   * Set the absolute orbital position of the camera relative to the configured
   * target. The change will be applied over a number of frames depending
   * on configured acceleration and dampening options.
   *
   * Returns true if invoking the method will result in the camera changing
   * position and/or rotation, otherwise false.
   */
  setOrbit(
      targetTheta: number = this[$targetSpherical].theta,
      targetPhi: number = this[$targetSpherical].phi,
      targetRadius: number = this[$targetSpherical].radius): boolean {
    const {
      minimumAzimuthalAngle,
      maximumAzimuthalAngle,
      minimumPolarAngle,
      maximumPolarAngle,
      minimumRadius,
      maximumRadius
    } = this[$options];

    const {theta, phi, radius} = this[$targetSpherical];

    const nextTheta =
        clamp(targetTheta, minimumAzimuthalAngle!, maximumAzimuthalAngle!);
    const nextPhi = clamp(targetPhi, minimumPolarAngle!, maximumPolarAngle!);
    const nextRadius = clamp(targetRadius, minimumRadius!, maximumRadius!);

    if (nextTheta === theta && nextPhi === phi && nextRadius === radius) {
      return false;
    }

    this[$targetSpherical].theta = nextTheta;
    this[$targetSpherical].phi = nextPhi;
    this[$targetSpherical].radius = nextRadius;
    this[$targetSpherical].makeSafe();

    this[$isUserChange] = false;

    return true;
  }

  /**
   * Adjust the orbital position of the camera relative to its current orbital
   * position.
   */
  adjustOrbit(deltaTheta: number, deltaPhi: number, deltaRadius: number):
      boolean {
    const {theta, phi, radius} = this[$targetSpherical];

    const targetTheta = theta - deltaTheta;
    const targetPhi = phi - deltaPhi;
    const targetRadius = radius + deltaRadius;
    
    return this.setOrbit(targetTheta, targetPhi, targetRadius);
  }

  /**
   * Update controls. In most cases, this will result in the camera
   * interpolating its position and rotation until it lines up with the
   * designated target orbital position.
   *
   * Time and delta are measured in milliseconds.
   */
  update(_time: number, delta: number) {
    const deltaTheta = this[$targetSpherical].theta - this[$spherical].theta;
    const deltaPhi = this[$targetSpherical].phi - this[$spherical].phi;
    const deltaRadius = this[$targetSpherical].radius - this[$spherical].radius;
    const distance = magnitude(deltaTheta, deltaPhi, deltaRadius);
    const frames = delta / FRAME_MILLISECONDS;

    // Velocity represents a scale along [0, 1] that changes based on the
    // acceleration constraint. We only "apply" velocity when accelerating.
    // When decelerating, we apply dampening exclusively.
    const applyVelocity = distance > this[$options].decelerationMargin!;

    const nextVelocity =
        Math.min(this[$velocity] + this[$options].acceleration! * frames, 1.0);
    if (applyVelocity) {
      this[$velocity] = nextVelocity;
    } else if (this[$velocity] > 0) {
      this[$velocity] = Math.max(nextVelocity, 0.0);
    }

    const scale = this[$dampeningFactor] *
        (applyVelocity ? this[$velocity] * frames : frames);

    const scaledDeltaTheta = deltaTheta * scale;
    const scaledDeltaPhi = deltaPhi * scale;
    const scaledDeltaRadius = deltaRadius * scale;

    let incrementTheta =
        step(ORBIT_STEP_EDGE, Math.abs(scaledDeltaTheta)) * scaledDeltaTheta;
    let incrementPhi =
        step(ORBIT_STEP_EDGE, Math.abs(scaledDeltaPhi)) * scaledDeltaPhi;
    let incrementRadius =
        step(ORBIT_STEP_EDGE, Math.abs(scaledDeltaRadius)) * scaledDeltaRadius;

    // NOTE(cdata): If we evaluate enough frames at once, then there is the
    // possibility that the next incremental step will overshoot the target.
    // If that is the case, we just jump straight to the target:
    if (magnitude(incrementTheta, incrementPhi, incrementRadius) > distance) {
      incrementTheta = deltaTheta;
      incrementPhi = deltaPhi;
      incrementRadius = deltaRadius;
    }

    this[$spherical].theta += incrementTheta;
    this[$spherical].phi += incrementPhi;
    this[$spherical].radius += incrementRadius;

    // Derive the new camera position from the updated spherical:
    this[$spherical].makeSafe();
    this[$sphericalToPosition](this[$spherical], this.camera.position);

    this.camera.lookAt(this.target);

    // Dispatch change events only when the camera position changes due to
    // the spherical->position derivation:
    if (!this[$previousPosition].equals(this.camera.position)) {
      this[$previousPosition].copy(this.camera.position);

      const source = this[$isUserChange] ? USER_INTERACTION_CHANGE_SOURCE : DEFAULT_INTERACTION_CHANGE_SOURCE;

      this.dispatchEvent({type: 'change', source});
    } else {
      this[$targetSpherical].copy(this[$spherical]);
    }
  }

  private get[$canInteract](): boolean {
    if (this[$options].interactionPolicy == 'allow-when-focused') {
      const rootNode = this.element.getRootNode() as Document | ShadowRoot;
      return rootNode.activeElement === this.element;
    }

    return this[$options].interactionPolicy === 'always-allow';
  }

  private get[$dampeningFactor](): number {
    return MINIMUM_DAMPENING_FACTOR -
        this[$options].dampeningScale! *
        (MINIMUM_DAMPENING_FACTOR - MAXIMUM_DAMPENING_FACTOR)
  }

  private[$userAdjustOrbit](deltaTheta: number, deltaPhi: number, deltaRadius: number): boolean {
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
            const radiusDelta = -1 * (touchDistance - lastTouchDistance) / 10.0;

            handled = this[$userAdjustOrbit](0, 0, radiusDelta);
          }

          break;
        case 'rotate':
          const {clientX: xOne, clientY: yOne} = this[$lastTouches][0];
          const {clientX: xTwo, clientY: yTwo} = touches[0];

          const deltaTheta = this[$pixelLengthToSphericalAngle](xTwo - xOne);
          const deltaPhi = this[$pixelLengthToSphericalAngle](yTwo - yOne);

          handled = this[$userAdjustOrbit](deltaTheta, deltaPhi, 0)

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

    const deltaRadius = (event as WheelEvent).deltaY / 10.0;

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
        handled = this[$userAdjustOrbit](0, 0, 1);
        break;
      case KeyCode.PAGE_DOWN:
        relevantKey = true;
        handled = this[$userAdjustOrbit](0, 0, -1);
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
