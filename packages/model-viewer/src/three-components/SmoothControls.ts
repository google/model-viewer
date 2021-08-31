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

import {Euler, Event as ThreeEvent, EventDispatcher, PerspectiveCamera, Spherical} from 'three';

import {TouchAction} from '../features/controls.js';
import {clamp} from '../utilities.js';

import {Damper, SETTLING_TIME} from './Damper.js';


export type InteractionPolicy = 'always-allow'|'allow-when-focused';
export type TouchMode = null|((event: TouchEvent) => void);

export interface Pointer {
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
  // Controls when interaction is allowed (always, or only when focused)
  interactionPolicy?: InteractionPolicy;
  // Controls scrolling behavior
  touchAction?: TouchAction;
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
  interactionPolicy: 'always-allow',
  touchAction: 'pan-y'
});

// Constants
const KEYBOARD_ORBIT_INCREMENT = Math.PI / 8;
const ZOOM_SENSITIVITY = 0.04;

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

export interface PointerChangeEvent extends ThreeEvent {
  type: 'pointer-change-start'|'pointer-change-end';
  pointer: Pointer;
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
  public sensitivity = 1;

  private _interactionEnabled: boolean = false;
  private _options: SmoothControlsOptions;
  private _disableZoom = false;
  private isUserChange = false;
  private isUserPointing = false;

  // Internal orbital position state
  private spherical = new Spherical();
  private goalSpherical = new Spherical();
  private thetaDamper = new Damper();
  private phiDamper = new Damper();
  private radiusDamper = new Damper();
  private logFov = Math.log(DEFAULT_OPTIONS.maximumFieldOfView!);
  private goalLogFov = this.logFov;
  private fovDamper = new Damper();

  // Pointer state
  private touchMode: TouchMode = null;
  private lastPointerPosition: Pointer = {
    clientX: 0,
    clientY: 0,
  };
  private lastTouches!: TouchList;
  private touchDecided = false;

  constructor(
      readonly camera: PerspectiveCamera, readonly element: HTMLElement) {
    super();

    this._options = Object.assign({}, DEFAULT_OPTIONS);

    this.setOrbit(0, Math.PI / 2, 1);
    this.setFieldOfView(100);
    this.jumpToGoal();
  }

  get interactionEnabled(): boolean {
    return this._interactionEnabled;
  }

  enableInteraction() {
    if (this._interactionEnabled === false) {
      const {element} = this;
      element.addEventListener('mousedown', this.onMouseDown);
      if (!this._disableZoom) {
        element.addEventListener('wheel', this.onWheel);
      }
      element.addEventListener('keydown', this.onKeyDown);
      element.addEventListener(
          'touchstart', this.onTouchStart, {passive: true});
      element.addEventListener('touchmove', this.onTouchMove, {passive: false});

      element.addEventListener('touchend', this.onTouchEnd);

      this.element.style.cursor = 'grab';
      this._interactionEnabled = true;

      this.updateTouchActionStyle();
    }
  }

  disableInteraction() {
    if (this._interactionEnabled === true) {
      const {element} = this;

      self.removeEventListener('mousemove', this.onMouseMove);
      element.removeEventListener('mousedown', this.onMouseDown);
      if (!this._disableZoom) {
        element.removeEventListener('wheel', this.onWheel);
      }
      element.removeEventListener('keydown', this.onKeyDown);
      element.removeEventListener('touchstart', this.onTouchStart);
      element.removeEventListener('touchmove', this.onTouchMove);

      self.removeEventListener('mouseup', this.onMouseUp);
      element.removeEventListener('touchend', this.onTouchEnd);

      element.style.cursor = '';
      this.touchMode = null;
      this._interactionEnabled = false;

      this.updateTouchActionStyle();
    }
  }

  /**
   * The options that are currently configured for the controls instance.
   */
  get options() {
    return this._options;
  }

  set disableZoom(disable: boolean) {
    if (this._disableZoom != disable) {
      this._disableZoom = disable;
      if (disable === true) {
        this.element.removeEventListener('wheel', this.onWheel);
      } else {
        this.element.addEventListener('wheel', this.onWheel);
      }

      this.updateTouchActionStyle();
    }
  }

  /**
   * Copy the spherical values that represent the current camera orbital
   * position relative to the configured target into a provided Spherical
   * instance. If no Spherical is provided, a new Spherical will be allocated
   * to copy the values into. The Spherical that values are copied into is
   * returned.
   */
  getCameraSpherical(target: Spherical = new Spherical()) {
    return target.copy(this.spherical);
  }

  /**
   * Returns the camera's current vertical field of view in degrees.
   */
  getFieldOfView(): number {
    return this.camera.fov;
  }

  /**
   * Configure the _options of the controls. Configured _options will be
   * merged with whatever _options have already been configured for this
   * controls instance.
   */
  applyOptions(_options: SmoothControlsOptions) {
    Object.assign(this._options, _options);
    // Re-evaluates clamping based on potentially new values for min/max
    // polar, azimuth and radius:
    this.setOrbit();
    this.setFieldOfView(Math.exp(this.goalLogFov));
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
   * dampening _options.
   *
   * Returns true if invoking the method will result in the camera changing
   * position and/or rotation, otherwise false.
   */
  setOrbit(
      goalTheta: number = this.goalSpherical.theta,
      goalPhi: number = this.goalSpherical.phi,
      goalRadius: number = this.goalSpherical.radius): boolean {
    const {
      minimumAzimuthalAngle,
      maximumAzimuthalAngle,
      minimumPolarAngle,
      maximumPolarAngle,
      minimumRadius,
      maximumRadius
    } = this._options;

    const {theta, phi, radius} = this.goalSpherical;

    const nextTheta =
        clamp(goalTheta, minimumAzimuthalAngle!, maximumAzimuthalAngle!);
    if (!isFinite(minimumAzimuthalAngle!) &&
        !isFinite(maximumAzimuthalAngle!)) {
      this.spherical.theta =
          this.wrapAngle(this.spherical.theta - nextTheta) + nextTheta;
    }

    const nextPhi = clamp(goalPhi, minimumPolarAngle!, maximumPolarAngle!);
    const nextRadius = clamp(goalRadius, minimumRadius!, maximumRadius!);

    if (nextTheta === theta && nextPhi === phi && nextRadius === radius) {
      return false;
    }

    this.goalSpherical.theta = nextTheta;
    this.goalSpherical.phi = nextPhi;
    this.goalSpherical.radius = nextRadius;
    this.goalSpherical.makeSafe();

    this.isUserChange = false;

    return true;
  }

  /**
   * Subset of setOrbit() above, which only sets the camera's radius.
   */
  setRadius(radius: number) {
    this.goalSpherical.radius = radius;
    this.setOrbit();
  }

  /**
   * Sets the goal field of view for the camera
   */
  setFieldOfView(fov: number) {
    const {minimumFieldOfView, maximumFieldOfView} = this._options;
    fov = clamp(fov, minimumFieldOfView!, maximumFieldOfView!);
    this.goalLogFov = Math.log(fov);
  }

  /**
   * Sets the smoothing decay time.
   */
  setDamperDecayTime(decayMilliseconds: number) {
    this.thetaDamper.setDecayTime(decayMilliseconds);
    this.phiDamper.setDecayTime(decayMilliseconds);
    this.radiusDamper.setDecayTime(decayMilliseconds);
    this.fovDamper.setDecayTime(decayMilliseconds);
  }

  /**
   * Adjust the orbital position of the camera relative to its current orbital
   * position. Does not let the theta goal get more than pi ahead of the current
   * theta, which ensures interpolation continues in the direction of the delta.
   * The deltaZoom parameter adjusts both the field of view and the orbit radius
   * such that they progress across their allowed ranges in sync.
   */
  adjustOrbit(deltaTheta: number, deltaPhi: number, deltaZoom: number) {
    const {theta, phi, radius} = this.goalSpherical;
    const {
      minimumRadius,
      maximumRadius,
      minimumFieldOfView,
      maximumFieldOfView
    } = this._options;

    const dTheta = this.spherical.theta - theta;
    const dThetaLimit = Math.PI - 0.001;
    const goalTheta =
        theta - clamp(deltaTheta, -dThetaLimit - dTheta, dThetaLimit - dTheta);
    const goalPhi = phi - deltaPhi;

    const deltaRatio = deltaZoom === 0 ?
        0 :
        ((deltaZoom > 0 ? maximumRadius! : minimumRadius!) - radius) /
            (Math.log(
                 deltaZoom > 0 ? maximumFieldOfView! : minimumFieldOfView!) -
             this.goalLogFov);

    const goalRadius = radius +
        deltaZoom *
            Math.min(
                isFinite(deltaRatio) ? deltaRatio : Infinity,
                maximumRadius! - minimumRadius!);
    this.setOrbit(goalTheta, goalPhi, goalRadius);

    if (deltaZoom !== 0) {
      const goalLogFov = this.goalLogFov + deltaZoom;
      this.setFieldOfView(Math.exp(goalLogFov));
    }
  }

  /**
   * Move the camera instantly instead of accelerating toward the goal
   * parameters.
   */
  jumpToGoal() {
    this.update(0, SETTLING_TIME);
  }

  /**
   * Update controls. In most cases, this will result in the camera
   * interpolating its position and rotation until it lines up with the
   * designated goal orbital position.
   *
   * Time and delta are measured in milliseconds.
   */
  update(_time: number, delta: number) {
    if (this.isStationary()) {
      return;
    }
    const {maximumPolarAngle, maximumRadius} = this._options;

    const dTheta = this.spherical.theta - this.goalSpherical.theta;
    if (Math.abs(dTheta) > Math.PI &&
        !isFinite(this._options.minimumAzimuthalAngle!) &&
        !isFinite(this._options.maximumAzimuthalAngle!)) {
      this.spherical.theta -= Math.sign(dTheta) * 2 * Math.PI;
    }

    this.spherical.theta = this.thetaDamper.update(
        this.spherical.theta, this.goalSpherical.theta, delta, Math.PI);

    this.spherical.phi = this.phiDamper.update(
        this.spherical.phi, this.goalSpherical.phi, delta, maximumPolarAngle!);

    this.spherical.radius = this.radiusDamper.update(
        this.spherical.radius, this.goalSpherical.radius, delta, maximumRadius!
    );

    this.logFov = this.fovDamper.update(this.logFov, this.goalLogFov, delta, 1);

    this.moveCamera();
  }

  updateTouchActionStyle() {
    const {style} = this.element;

    if (this._interactionEnabled) {
      const {touchAction} = this._options;
      if (this._disableZoom && touchAction !== 'none') {
        style.touchAction = 'manipulation';
      } else {
        style.touchAction = touchAction!;
      }
    } else {
      style.touchAction = '';
    }
  }

  private isStationary(): boolean {
    return this.goalSpherical.theta === this.spherical.theta &&
        this.goalSpherical.phi === this.spherical.phi &&
        this.goalSpherical.radius === this.spherical.radius &&
        this.goalLogFov === this.logFov;
  }

  private moveCamera() {
    // Derive the new camera position from the updated spherical:
    this.spherical.makeSafe();
    this.camera.position.setFromSpherical(this.spherical);
    this.camera.setRotationFromEuler(new Euler(
        this.spherical.phi - Math.PI / 2, this.spherical.theta, 0, 'YXZ'));

    if (this.camera.fov !== Math.exp(this.logFov)) {
      this.camera.fov = Math.exp(this.logFov);
      this.camera.updateProjectionMatrix();
    }

    const source =
        this.isUserChange ? ChangeSource.USER_INTERACTION : ChangeSource.NONE;

    this.dispatchEvent({type: 'change', source});
  }

  private get canInteract(): boolean {
    if (this._options.interactionPolicy == 'allow-when-focused') {
      const rootNode = this.element.getRootNode() as Document | ShadowRoot;
      return rootNode.activeElement === this.element;
    }

    return this._options.interactionPolicy === 'always-allow';
  }

  private userAdjustOrbit(
      deltaTheta: number, deltaPhi: number, deltaZoom: number) {
    this.adjustOrbit(
        deltaTheta * this.sensitivity, deltaPhi * this.sensitivity, deltaZoom);

    this.isUserChange = true;
    // Always make sure that an initial event is triggered in case there is
    // contention between user interaction and imperative changes. This initial
    // event will give external observers that chance to observe that
    // interaction occurred at all:
    this.dispatchEvent({type: 'change', source: ChangeSource.USER_INTERACTION});
  }

  // Wraps to bewteen -pi and pi
  private wrapAngle(radians: number): number {
    const normalized = (radians + Math.PI) / (2 * Math.PI);
    const wrapped = normalized - Math.floor(normalized);
    return wrapped * 2 * Math.PI - Math.PI;
  }

  private pixelLengthToSphericalAngle(pixelLength: number): number {
    return 2 * Math.PI * pixelLength / this.element.clientHeight;
  }

  private twoTouchDistance(touchOne: Touch, touchTwo: Touch): number {
    const {clientX: xOne, clientY: yOne} = touchOne;
    const {clientX: xTwo, clientY: yTwo} = touchTwo;
    const xDelta = xTwo - xOne;
    const yDelta = yTwo - yOne;

    return Math.sqrt(xDelta * xDelta + yDelta * yDelta);
  }

  private onMouseMove = (event: MouseEvent) => {
    this.handleSinglePointerMove(event);

    if (event.cancelable) {
      event.preventDefault();
    }
  };

  private onTouchMove = (event: TouchEvent) => {
    if (this.touchMode !== null) {
      this.touchMode(event);

      if (this.touchMode !== null && event.cancelable) {
        event.preventDefault();
      }
    }
  };

  private touchModeZoom: TouchMode = (event) => {
    const {targetTouches} = event;
    if (this.lastTouches.length > 1 && targetTouches.length > 1) {
      const lastTouchDistance =
          this.twoTouchDistance(this.lastTouches[0], this.lastTouches[1]);
      const touchDistance =
          this.twoTouchDistance(targetTouches[0], targetTouches[1]);
      const deltaZoom =
          ZOOM_SENSITIVITY * (lastTouchDistance - touchDistance) / 10.0;

      this.userAdjustOrbit(0, 0, deltaZoom);

      this.lastTouches = targetTouches;
    }
  };
  private touchModeRotate: TouchMode = (event) => {
    const {targetTouches} = event;
    const {touchAction} = this._options;
    if (!this.touchDecided && touchAction !== 'none') {
      this.touchDecided = true;
      const {clientX, clientY} = targetTouches[0];
      const dx = Math.abs(clientX - this.lastPointerPosition.clientX);
      const dy = Math.abs(clientY - this.lastPointerPosition.clientY);
      // If motion is mostly vertical, assume scrolling is the intent.
      if ((touchAction === 'pan-y' && dy > dx) ||
          (touchAction === 'pan-x' && dx > dy)) {
        this.touchMode = null;
        return;
      }
    }
    this.handleSinglePointerMove(targetTouches[0]);

    this.lastTouches = targetTouches;
  };

  private handleSinglePointerMove(pointer: Pointer) {
    const {clientX, clientY} = pointer;
    const deltaTheta = this.pixelLengthToSphericalAngle(
        clientX - this.lastPointerPosition.clientX);
    const deltaPhi = this.pixelLengthToSphericalAngle(
        clientY - this.lastPointerPosition.clientY);

    this.lastPointerPosition.clientX = clientX;
    this.lastPointerPosition.clientY = clientY;

    if (this.isUserPointing === false) {
      this.isUserPointing = true;
      this.dispatchEvent({type: 'pointer-change-start', pointer: {...pointer}});
    }

    this.userAdjustOrbit(deltaTheta, deltaPhi, 0);
  }

  private onPointerDown(fn: () => void) {
    if (!this.canInteract) {
      return;
    }

    this.isUserPointing = false;

    fn();
  }

  private onMouseDown = (event: MouseEvent) => {
    this.onPointerDown(() => {
      self.addEventListener('mousemove', this.onMouseMove);
      self.addEventListener('mouseup', this.onMouseUp, {once: true});
      this.handleSinglePointerDown(event);
    });
  };

  private onTouchStart = (event: TouchEvent) => {
    this.onPointerDown(() => {
      const {targetTouches, changedTouches, touches} = event;
      if (targetTouches.length === changedTouches.length) {
        this.touchMode = null;
        this.touchDecided = false;
      }

      if (targetTouches.length === touches.length) {
        this.onTouchChange(event);
      }
    });
  };

  private onTouchChange(event: TouchEvent) {
    const {targetTouches} = event;

    switch (targetTouches.length) {
      default:
      case 1:
        this.touchMode = this.touchModeRotate;
        this.handleSinglePointerDown(targetTouches[0]);
        break;
      case 2:
        this.touchMode = this._disableZoom ||
                (this.touchDecided && this.touchMode === null) ?
            null :
            this.touchModeZoom;
        this.touchDecided = true;
        break;
    }

    this.lastTouches = targetTouches;
  }

  private handleSinglePointerDown(pointer: Pointer) {
    this.lastPointerPosition.clientX = pointer.clientX;
    this.lastPointerPosition.clientY = pointer.clientY;
    this.element.style.cursor = 'grabbing';
  }

  private onPointerUp() {
    this.element.style.cursor = 'grab';

    if (this.isUserPointing) {
      this.dispatchEvent(
          {type: 'pointer-change-end', pointer: {...this.lastPointerPosition}});
    }
  }

  private onMouseUp = (_event: MouseEvent) => {
    self.removeEventListener('mousemove', this.onMouseMove);

    this.onPointerUp();
  };

  private onTouchEnd = (event: TouchEvent) => {
    if (event.targetTouches.length > 0 && this.touchMode !== null) {
      this.onTouchChange(event);
    }

    this.onPointerUp();
  };

  private onWheel = (event: Event) => {
    if (!this.canInteract) {
      return;
    }

    const deltaZoom = (event as WheelEvent).deltaY *
        ((event as WheelEvent).deltaMode == 1 ? 18 : 1) * ZOOM_SENSITIVITY / 30;
    this.userAdjustOrbit(0, 0, deltaZoom);

    if (event.cancelable) {
      event.preventDefault();
    }
  };

  private onKeyDown = (event: KeyboardEvent) => {
    // We track if the key is actually one we respond to, so as not to
    // accidentally clober unrelated key inputs when the <model-viewer> has
    // focus.
    let relevantKey = false;

    switch (event.keyCode) {
      case KeyCode.PAGE_UP:
        relevantKey = true;
        this.userAdjustOrbit(0, 0, ZOOM_SENSITIVITY);
        break;
      case KeyCode.PAGE_DOWN:
        relevantKey = true;
        this.userAdjustOrbit(0, 0, -1 * ZOOM_SENSITIVITY);
        break;
      case KeyCode.UP:
        relevantKey = true;
        this.userAdjustOrbit(0, -KEYBOARD_ORBIT_INCREMENT, 0);
        break;
      case KeyCode.DOWN:
        relevantKey = true;
        this.userAdjustOrbit(0, KEYBOARD_ORBIT_INCREMENT, 0);
        break;
      case KeyCode.LEFT:
        relevantKey = true;
        this.userAdjustOrbit(-KEYBOARD_ORBIT_INCREMENT, 0, 0);
        break;
      case KeyCode.RIGHT:
        relevantKey = true;
        this.userAdjustOrbit(KEYBOARD_ORBIT_INCREMENT, 0, 0);
        break;
      default:
        break;
    }

    if (relevantKey && event.cancelable) {
      event.preventDefault();
    }
  };
}
