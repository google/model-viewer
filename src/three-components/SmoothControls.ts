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

import {Camera, EventDispatcher, Quaternion, Spherical, Vector2, Vector3} from 'three';

import {clamp, step} from '../utils.js';

export type EventHandlingBehavior = 'prevent-all'|'prevent-handled';
export type ZoomPolicy = 'always-allow'|'allow-when-focused';
export type TouchMode = 'rotate'|'zoom';

export interface SmoothControlsConstraints {
  nearOrbitRadius?: number;
  farOrbitRadius?: number;
  minimumPolarAngle?: number;
  maximumPolarAngle?: number;
  minimumAzimuthalAngle?: number;
  maximumAzimuthalAngle?: number;
  decelerationMargin?: number;
  acceleration?: number;
  dampeningScale?: number;
  eventHandlingBehavior?: EventHandlingBehavior;
  zoomPolicy?: ZoomPolicy;
}

export const DEFAULT_CONSTRAINTS = Object.freeze<SmoothControlsConstraints>({
  nearOrbitRadius: 8,
  farOrbitRadius: 32,
  minimumPolarAngle: Math.PI / 8,
  maximumPolarAngle: Math.PI - Math.PI / 8,
  minimumAzimuthalAngle: -Infinity,
  maximumAzimuthalAngle: Infinity,
  decelerationMargin: 0.25,
  acceleration: 0.15,
  dampeningScale: 0.5,
  eventHandlingBehavior: 'prevent-all',
  zoomPolicy: 'allow-when-focused'
});

const $constraints = Symbol('constraints');
const $upQuaternion = Symbol('upQuaternion');
const $upQuaternionInverse = Symbol('upQuaternionInverse');
const $spherical = Symbol('spherical');
const $targetSpherical = Symbol('targetSpherical');
const $velocity = Symbol('velocity');
const $dampeningFactor = Symbol('dampeningFactor');
const $touchMode = Symbol('touchMode');
const $previousPosition = Symbol('previousPosition');

const $pointerIsDown = Symbol('pointerIsDown');
const $lastPointerPosition = Symbol('lastPointerPosition');
const $lastTouches = Symbol('lastTouches');

const $pixelLengthToSphericalAngle = Symbol('pixelLengthToSphericalAngle');
const $positionToSpherical = Symbol('positionToSpherical');
const $sphericalToPosition = Symbol('sphericalToPosition');
const $twoTouchDistance = Symbol('twoTouchDistance');

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

const TOUCH_EVENT_RE = /^touch(start|end|move)$/;
const KEYBOARD_ORBIT_INCREMENT = Math.PI / 8;
const ORBIT_STEP_EDGE = 0.001;
const MAXIMUM_DAMPENING_FACTOR = 0.05;
const MINIMUM_DAMPENING_FACTOR = 0.3;
const FRAME_MILLISECONDS = 1000.0 / 60.0;
const TWO_PI = 2 * Math.PI;
const UP = new Vector3(0, 1, 0);

export const KeyCode = {
  PAGE_UP: 33,
  PAGE_DOWN: 34,
  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  DOWN: 40
};

const vector3 = new Vector3();

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
 */
export class SmoothControls extends EventDispatcher {
  private[$constraints]: SmoothControlsConstraints;
  private[$upQuaternion]: Quaternion = new Quaternion();
  private[$upQuaternionInverse]: Quaternion = new Quaternion();
  private[$spherical]: Spherical = new Spherical();
  private[$targetSpherical]: Spherical = new Spherical();
  private[$previousPosition]: Vector3 = new Vector3();

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

  readonly sceneOrigin: Vector3 = new Vector3();

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

    element.addEventListener('mousemove', this[$onMouseMove]);
    element.addEventListener('mousedown', this[$onMouseDown]);
    element.addEventListener('wheel', this[$onWheel]);
    element.addEventListener('keydown', this[$onKeyDown]);
    element.addEventListener('touchstart', this[$onTouchStart]);
    element.addEventListener('touchmove', this[$onTouchMove]);

    self.addEventListener('mouseup', this[$onMouseUp]);
    self.addEventListener('touchend', this[$onTouchEnd]);

    element.style.cursor = 'grab';

    this[$previousPosition].copy(this.camera.position);
    this[$positionToSpherical](this.camera.position, this[$spherical]);
    this[$targetSpherical].copy(this[$spherical]);

    this[$constraints] = Object.assign({}, DEFAULT_CONSTRAINTS);

    this.setOrbit();
  }

  /**
   * Clean up event handlers that are added to the configured element. Invoke
   * this when getting rid of the controls, otherwise listeners will leak!
   */
  dispose() {
    this.element.removeEventListener('mousemove', this[$onMouseMove]);
    this.element.removeEventListener('mousedown', this[$onMouseDown]);
    this.element.removeEventListener('wheel', this[$onWheel]);
    this.element.removeEventListener('keydown', this[$onKeyDown]);
    this.element.removeEventListener('touchstart', this[$onTouchStart]);
    this.element.removeEventListener('touchmove', this[$onTouchMove]);

    self.removeEventListener('mouseup', this[$onMouseUp]);
    self.removeEventListener('touchend', this[$onTouchEnd]);
  }

  /**
   * The constraints that are currently configured for the controls instance.
   */
  get constraints() {
    return this[$constraints];
  }

  /**
   * A copy of the spherical that represents the current camera position
   * relative to the configured scene origin.
   */
  get cameraSpherical() {
    return this[$spherical].clone();
  }

  /**
   * Configure the constraints of the controls. Configured constraints will be
   * merged with whatever constraints have already been configured for this
   * controls instance.
   */
  applyConstraints(constraints: SmoothControlsConstraints) {
    Object.assign(this[$constraints], constraints);
    // Re-evaluates clamping based on potentially new values for min/max
    // polar, azimuth and radius:
    this.setOrbit();
    // Prevent interpolation in the case that any target spherical values
    // changed (preserving OrbitalControls behavior):
    this[$spherical].copy(this[$targetSpherical]);
  }

  /**
   * Set the absolute orbital position of the camera relative to the configured
   * scene origin. The change will be applied over a number of frames depending
   * on configured acceleration and dampening constraints.
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
      nearOrbitRadius,
      farOrbitRadius
    } = this[$constraints];

    const {theta, phi, radius} = this[$targetSpherical];

    const nextTheta =
        clamp(targetTheta, minimumAzimuthalAngle!, maximumAzimuthalAngle!);
    const nextPhi = clamp(targetPhi, minimumPolarAngle!, maximumPolarAngle!);
    const nextRadius = clamp(targetRadius, nearOrbitRadius!, farOrbitRadius!);

    if (nextTheta === theta && nextPhi === phi && nextRadius === radius) {
      return false;
    }

    this[$targetSpherical].theta = nextTheta;
    this[$targetSpherical].phi = nextPhi;
    this[$targetSpherical].radius = nextRadius;
    this[$targetSpherical].makeSafe();

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
   */
  update(_time: number, delta: number) {
    const deltaTheta = this[$targetSpherical].theta - this[$spherical].theta;
    const deltaPhi = this[$targetSpherical].phi - this[$spherical].phi;
    const deltaRadius = this[$targetSpherical].radius - this[$spherical].radius;
    const distance = vector3.set(deltaTheta, deltaPhi, deltaRadius).length();
    const frames = delta / FRAME_MILLISECONDS;

    // Velocity represents a scale along [0, 1] that changes based on the
    // acceleration constraint. We only "apply" velocity when accelerating.
    // When decelerating, we apply dampening exclusively.
    const applyVelocity = distance > this[$constraints].decelerationMargin!;

    if (applyVelocity) {
      this[$velocity] = Math.min(
          this[$velocity] + this[$constraints].acceleration! * frames, 1.0);
    } else if (this[$velocity] > 0) {
      this[$velocity] = Math.max(
          this[$velocity] - this[$constraints].acceleration! * frames, 0.0);
    }

    const scale = this[$dampeningFactor] *
        (applyVelocity ? this[$velocity] * frames : frames);

    const scaledDeltaTheta = deltaTheta * scale;
    const scaledDeltaPhi = deltaPhi * scale;
    const scaledDeltaRadius = deltaRadius * scale;

    vector3.set(
        step(ORBIT_STEP_EDGE, Math.abs(scaledDeltaTheta)) * scaledDeltaTheta,
        step(ORBIT_STEP_EDGE, Math.abs(scaledDeltaPhi)) * scaledDeltaPhi,
        step(ORBIT_STEP_EDGE, Math.abs(scaledDeltaRadius)) * scaledDeltaRadius);

    // NOTE(cdata): If we evaluate enough frames at once, then there is the
    // possibility that the next incremental step will overshoot the target.
    // If that is the case, we just jump straight to the target:
    if (vector3.length() > distance) {
      vector3.set(deltaTheta, deltaPhi, deltaRadius);
    }

    this[$spherical].theta += vector3.x;
    this[$spherical].phi += vector3.y;
    this[$spherical].radius += vector3.z;

    // Derive the new camera position from the updated spherical:
    this[$spherical].makeSafe();
    this[$sphericalToPosition](this[$spherical], vector3);

    this.camera.position.copy(this.sceneOrigin).add(vector3);
    this.camera.lookAt(this.sceneOrigin);

    // Dispatch change events only when the camera position changes due to
    // the spherical->position derivation:
    if (!this[$previousPosition].equals(this.camera.position)) {
      this[$previousPosition].copy(this.camera.position);
      this.dispatchEvent({type: 'change'});
    } else {
      this[$targetSpherical].copy(this[$spherical]);
    }
  }

  private get[$dampeningFactor](): number {
    return MINIMUM_DAMPENING_FACTOR -
        this[$constraints].dampeningScale! *
        (MINIMUM_DAMPENING_FACTOR - MAXIMUM_DAMPENING_FACTOR)
  }

  private[$pixelLengthToSphericalAngle](pixelLength: number): number {
    return TWO_PI * pixelLength / this.element.clientHeight;
  }

  private[$positionToSpherical](position: Vector3, spherical: Spherical) {
    vector3.copy(position).sub(this.sceneOrigin);
    vector3.applyQuaternion(this[$upQuaternion]);

    spherical.setFromVector3(vector3);
    spherical.radius = vector3.length();
  }

  private[$sphericalToPosition](spherical: Spherical, position: Vector3) {
    position.setFromSpherical(spherical);
    position.applyQuaternion(this[$upQuaternionInverse]);
  }

  private[$twoTouchDistance](touchOne: Touch, touchTwo: Touch): number {
    const {clientX: xOne, clientY: yOne} = touchOne;
    const {clientX: xTwo, clientY: yTwo} = touchTwo;
    const xDelta = xTwo - xOne;
    const yDelta = yTwo - yOne;

    return Math.sqrt(xDelta * xDelta + yDelta * yDelta);
  }

  private[$handlePointerMove](event: MouseEvent|TouchEvent) {
    if (!this[$pointerIsDown]) {
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

            handled = this.adjustOrbit(0, 0, radiusDelta);
          }

          break;
        case 'rotate':
          const {clientX: xOne, clientY: yOne} = this[$lastTouches][0];
          const {clientX: xTwo, clientY: yTwo} = touches[0];

          const deltaTheta = this[$pixelLengthToSphericalAngle](xTwo - xOne);
          const deltaPhi = this[$pixelLengthToSphericalAngle](yTwo - yOne);

          handled = this.adjustOrbit(deltaTheta, deltaPhi, 0)

          break;
      }

      this[$lastTouches] = touches;
    } else {
      const {clientX: x, clientY: y} = event as MouseEvent;

      const deltaTheta =
          this[$pixelLengthToSphericalAngle](x - this[$lastPointerPosition].x);
      const deltaPhi =
          this[$pixelLengthToSphericalAngle](y - this[$lastPointerPosition].y);

      handled = this.adjustOrbit(deltaTheta, deltaPhi, 0.0);

      this[$lastPointerPosition].set(x, y);
    }

    if ((handled ||
         this[$constraints].eventHandlingBehavior === 'prevent-all') &&
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
    const rootNode = this.element.getRootNode() as Document | ShadowRoot;

    if (this[$constraints].zoomPolicy === 'allow-when-focused' &&
        rootNode.activeElement !== this.element) {
      return;
    }

    const deltaRadius = (event as WheelEvent).deltaY / 10.0;

    if ((this.adjustOrbit(0, 0, deltaRadius) ||
         this[$constraints].eventHandlingBehavior === 'prevent-all') &&
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
        handled = this.adjustOrbit(0, 0, 1);
        break;
      case KeyCode.PAGE_DOWN:
        relevantKey = true;
        handled = this.adjustOrbit(0, 0, -1);
        break;
      case KeyCode.UP:
        relevantKey = true;
        handled = this.adjustOrbit(0, -KEYBOARD_ORBIT_INCREMENT, 0);
        break;
      case KeyCode.DOWN:
        relevantKey = true;
        handled = this.adjustOrbit(0, KEYBOARD_ORBIT_INCREMENT, 0);
        break;
      case KeyCode.LEFT:
        relevantKey = true;
        handled = this.adjustOrbit(-KEYBOARD_ORBIT_INCREMENT, 0, 0);
        break;
      case KeyCode.RIGHT:
        relevantKey = true;
        handled = this.adjustOrbit(KEYBOARD_ORBIT_INCREMENT, 0, 0);
        break;
    }

    if (relevantKey &&
        (handled ||
         this[$constraints].eventHandlingBehavior === 'prevent-all') &&
        event.cancelable) {
      event.preventDefault();
    }
  }
}
