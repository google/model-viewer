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

import {Euler, Event as ThreeEvent, EventDispatcher, Matrix3, PerspectiveCamera, Spherical, Vector2, Vector3} from 'three';

import {$panElement, TouchAction} from '../features/controls.js';
import {clamp} from '../utilities.js';

import {Damper, SETTLING_TIME} from './Damper.js';
import {ModelScene} from './ModelScene.js';

const PAN_SENSITIVITY = 0.018;
const TAP_DISTANCE = 2;
const TAP_MS = 300;
const vector2 = new Vector2();
const vector3 = new Vector3();

export type TouchMode = null|((dx: number, dy: number) => void);

export interface Pointer {
  clientX: number;
  clientY: number;
  id: number;
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
  touchAction: 'none'
});

// Constants
const KEYBOARD_ORBIT_INCREMENT = Math.PI / 8;
const ZOOM_SENSITIVITY = 0.04;

// The move size on pan key event
const PAN_KEY_INCREMENT = 10;

export const KeyCode = {
  PAGE_UP: 33,
  PAGE_DOWN: 34,
  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  DOWN: 40
};

export type ChangeSource = 'user-interaction'|'none'|'automatic';

export const ChangeSource: {[index: string]: ChangeSource} = {
  USER_INTERACTION: 'user-interaction',
  NONE: 'none',
  AUTOMATIC: 'automatic'
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
  public orbitSensitivity = 1;
  public inputSensitivity = 1;
  public changeSource = ChangeSource.NONE;

  private _interactionEnabled: boolean = false;
  private _options: SmoothControlsOptions;
  private _disableZoom = false;
  private isUserPointing = false;

  // Pan state
  public enablePan = true;
  public enableTap = true;
  private panProjection = new Matrix3();
  private panPerPixel = 0;

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
  private pointers: Pointer[] = [];
  private startTime = 0;
  private startPointerPosition = {clientX: 0, clientY: 0};
  private lastSeparation = 0;
  private touchDecided = false;

  constructor(
      readonly camera: PerspectiveCamera, readonly element: HTMLElement,
      readonly scene: ModelScene) {
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
      element.addEventListener('pointerdown', this.onPointerDown);
      element.addEventListener('pointercancel', this.onPointerUp);

      if (!this._disableZoom) {
        element.addEventListener('wheel', this.onWheel);
      }
      element.addEventListener('keydown', this.onKeyDown);
      // This little beauty is to work around a WebKit bug that otherwise makes
      // touch events randomly not cancelable.
      element.addEventListener('touchmove', () => {}, {passive: false});
      element.addEventListener('contextmenu', this.onContext);

      this.element.style.cursor = 'grab';
      this._interactionEnabled = true;

      this.updateTouchActionStyle();
    }
  }

  disableInteraction() {
    if (this._interactionEnabled === true) {
      const {element} = this;

      element.removeEventListener('pointerdown', this.onPointerDown);
      element.removeEventListener('pointermove', this.onPointerMove);
      element.removeEventListener('pointerup', this.onPointerUp);
      element.removeEventListener('pointercancel', this.onPointerUp);
      element.removeEventListener('wheel', this.onWheel);
      element.removeEventListener('keydown', this.onKeyDown);
      element.removeEventListener('contextmenu', this.onContext);

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

  onContext = (event: MouseEvent) => {
    if (this.enablePan) {
      event.preventDefault();
    } else {
      for (const pointer of this.pointers) {
        // Required because of a common browser bug where the context menu never
        // fires a pointercancel event.
        this.onPointerUp(new PointerEvent(
            'pointercancel',
            {...this.startPointerPosition, pointerId: pointer.id}));
      }
    }
  };

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
    this.camera.far = farPlane === 0 ? 2 : farPlane;
    this.camera.near = Math.max(nearPlane, this.camera.far / 1000);
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

    if (!isFinite(nextTheta) || !isFinite(nextPhi) || !isFinite(nextRadius)) {
      return false;
    }

    this.goalSpherical.theta = nextTheta;
    this.goalSpherical.phi = nextPhi;
    this.goalSpherical.radius = nextRadius;
    this.goalSpherical.makeSafe();

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
            (isFinite(deltaRatio) ? deltaRatio :
                                    (maximumRadius! - minimumRadius!) * 2);
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
   * designated goal orbital position. Returns false if the camera did not move.
   *
   * Time and delta are measured in milliseconds.
   */
  update(_time: number, delta: number): boolean {
    if (this.isStationary()) {
      return false;
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
    return true;
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
  }

  private userAdjustOrbit(
      deltaTheta: number, deltaPhi: number, deltaZoom: number) {
    this.adjustOrbit(
        deltaTheta * this.orbitSensitivity * this.inputSensitivity,
        deltaPhi * this.orbitSensitivity * this.inputSensitivity,
        deltaZoom * this.inputSensitivity);
  }

  // Wraps to between -pi and pi
  private wrapAngle(radians: number): number {
    const normalized = (radians + Math.PI) / (2 * Math.PI);
    const wrapped = normalized - Math.floor(normalized);
    return wrapped * 2 * Math.PI - Math.PI;
  }

  private pixelLengthToSphericalAngle(pixelLength: number): number {
    return 2 * Math.PI * pixelLength / this.scene.height;
  }

  private twoTouchDistance(touchOne: Pointer, touchTwo: Pointer): number {
    const {clientX: xOne, clientY: yOne} = touchOne;
    const {clientX: xTwo, clientY: yTwo} = touchTwo;
    const xDelta = xTwo - xOne;
    const yDelta = yTwo - yOne;

    return Math.sqrt(xDelta * xDelta + yDelta * yDelta);
  }

  private touchModeZoom: TouchMode = (dx: number, dy: number) => {
    if (!this._disableZoom) {
      const touchDistance =
          this.twoTouchDistance(this.pointers[0], this.pointers[1]);
      const deltaZoom = ZOOM_SENSITIVITY *
          (this.lastSeparation - touchDistance) * 50 / this.scene.height;
      this.lastSeparation = touchDistance;

      this.userAdjustOrbit(0, 0, deltaZoom);
    }

    if (this.panPerPixel > 0) {
      this.movePan(dx, dy);
    }
  };

  // We implement our own version of the browser's CSS touch-action, enforced by
  // this function, because the iOS implementation of pan-y is bad and doesn't
  // match Android. Specifically, even if a touch gesture begins by panning X,
  // iOS will switch to scrolling as soon as the gesture moves in the Y, rather
  // than staying in the same mode until the end of the gesture.
  private disableScroll = (event: TouchEvent) => {
    event.preventDefault();
  };

  private touchModeRotate: TouchMode = (dx: number, dy: number) => {
    const {touchAction} = this._options;
    if (!this.touchDecided && touchAction !== 'none') {
      this.touchDecided = true;
      const dxMag = Math.abs(dx);
      const dyMag = Math.abs(dy);
      // If motion is mostly vertical, assume scrolling is the intent.
      if (this.changeSource === ChangeSource.USER_INTERACTION &&
          ((touchAction === 'pan-y' && dyMag > dxMag) ||
           (touchAction === 'pan-x' && dxMag > dyMag))) {
        this.touchMode = null;
        return;
      } else {
        this.element.addEventListener(
            'touchmove', this.disableScroll, {passive: false});
      }
    }
    this.handleSinglePointerMove(dx, dy);
  };

  private handleSinglePointerMove(dx: number, dy: number) {
    const deltaTheta = this.pixelLengthToSphericalAngle(dx);
    const deltaPhi = this.pixelLengthToSphericalAngle(dy);

    if (this.isUserPointing === false) {
      this.isUserPointing = true;
      this.dispatchEvent({type: 'pointer-change-start'});
    }

    this.userAdjustOrbit(deltaTheta, deltaPhi, 0);
  }

  private initializePan() {
    const {theta, phi} = this.spherical;
    const psi = theta - this.scene.yaw;
    this.panPerPixel = PAN_SENSITIVITY / this.scene.height;
    this.panProjection.set(
        -Math.cos(psi),
        -Math.cos(phi) * Math.sin(psi),
        0,
        0,
        Math.sin(phi),
        0,
        Math.sin(psi),
        -Math.cos(phi) * Math.cos(psi),
        0);
  }

  private movePan(dx: number, dy: number) {
    const {scene} = this;
    const dxy = vector3.set(dx, dy, 0).multiplyScalar(this.inputSensitivity);
    const metersPerPixel =
        this.spherical.radius * Math.exp(this.logFov) * this.panPerPixel;
    dxy.multiplyScalar(metersPerPixel);

    const target = scene.getTarget();
    target.add(dxy.applyMatrix3(this.panProjection));
    scene.boundingSphere.clampPoint(target, target);
    scene.setTarget(target.x, target.y, target.z);
  }

  private recenter(pointer: PointerEvent) {
    if (performance.now() > this.startTime + TAP_MS ||
        Math.abs(pointer.clientX - this.startPointerPosition.clientX) >
            TAP_DISTANCE ||
        Math.abs(pointer.clientY - this.startPointerPosition.clientY) >
            TAP_DISTANCE) {
      return;
    }
    const {scene} = this;

    const hit = scene.positionAndNormalFromPoint(
        scene.getNDC(pointer.clientX, pointer.clientY));

    if (hit == null) {
      const {cameraTarget} = scene.element;
      scene.element.cameraTarget = '';
      scene.element.cameraTarget = cameraTarget;
      // Zoom all the way out.
      this.userAdjustOrbit(0, 0, 1);
    } else {
      scene.target.worldToLocal(hit.position);
      scene.setTarget(hit.position.x, hit.position.y, hit.position.z);
    }
  }

  private resetRadius() {
    const {scene} = this;

    const hit = scene.positionAndNormalFromPoint(vector2.set(0, 0));
    if (hit == null) {
      return;
    }

    scene.target.worldToLocal(hit.position);
    const goalTarget = scene.getTarget();
    const {theta, phi} = this.spherical;

    // Set target to surface hit point, except the target is still settling,
    // so offset the goal accordingly so the transition is smooth even though
    // this will drift the target slightly away from the hit point.
    const psi = theta - scene.yaw;
    const n = vector3.set(
        Math.sin(phi) * Math.sin(psi),
        Math.cos(phi),
        Math.sin(phi) * Math.cos(psi));
    const dr = n.dot(hit.position.sub(goalTarget));
    goalTarget.add(n.multiplyScalar(dr));

    scene.setTarget(goalTarget.x, goalTarget.y, goalTarget.z);
    // Change the camera radius to match the change in target so that the
    // camera itself does not move, unless it hits a radius bound.
    this.setOrbit(undefined, undefined, this.goalSpherical.radius - dr);
  }

  private onPointerDown = (event: PointerEvent) => {
    if (this.pointers.length > 2) {
      return;
    }
    const {element} = this;

    if (this.pointers.length === 0) {
      element.addEventListener('pointermove', this.onPointerMove);
      element.addEventListener('pointerup', this.onPointerUp);
      this.touchMode = null;
      this.touchDecided = false;
      this.startPointerPosition.clientX = event.clientX;
      this.startPointerPosition.clientY = event.clientY;
      this.startTime = performance.now();
    }

    try {
      element.setPointerCapture(event.pointerId);
    } catch {
    }
    this.pointers.push(
        {clientX: event.clientX, clientY: event.clientY, id: event.pointerId});

    this.isUserPointing = false;

    if (event.pointerType === 'touch') {
      this.changeSource = event.altKey ?  // set by interact() in controls.ts
          ChangeSource.AUTOMATIC :
          ChangeSource.USER_INTERACTION;
      this.onTouchChange(event);
    } else {
      this.changeSource = ChangeSource.USER_INTERACTION;
      this.onMouseDown(event);
    }

    if (this.changeSource === ChangeSource.USER_INTERACTION) {
      this.dispatchEvent({type: 'user-interaction'});
    }
  };

  private onPointerMove = (event: PointerEvent) => {
    const pointer =
        this.pointers.find((pointer) => pointer.id === event.pointerId);
    if (pointer == null) {
      return;
    }

    const numTouches = this.pointers.length;
    const dx = (event.clientX - pointer.clientX) / numTouches;
    const dy = (event.clientY - pointer.clientY) / numTouches;
    if (dx === 0 && dy === 0) {
      return;
    }
    pointer.clientX = event.clientX;
    pointer.clientY = event.clientY;

    if (event.pointerType === 'touch') {
      this.changeSource = event.altKey ?  // set by interact() in controls.ts
          ChangeSource.AUTOMATIC :
          ChangeSource.USER_INTERACTION;
      if (this.touchMode !== null) {
        this.touchMode(dx, dy);
      }
    } else {
      this.changeSource = ChangeSource.USER_INTERACTION;
      if (this.panPerPixel > 0) {
        this.movePan(dx, dy);
      } else {
        this.handleSinglePointerMove(dx, dy);
      }
    }
  };

  private onPointerUp = (event: PointerEvent) => {
    const {element} = this;

    const index =
        this.pointers.findIndex((pointer) => pointer.id === event.pointerId);
    if (index !== -1) {
      this.pointers.splice(index, 1);
    }

    // altKey indicates an interaction prompt; don't reset radius in this case
    // as it will cause the camera to drift.
    if (this.panPerPixel > 0 && !event.altKey) {
      this.resetRadius();
    }
    if (this.pointers.length === 0) {
      element.removeEventListener('pointermove', this.onPointerMove);
      element.removeEventListener('pointerup', this.onPointerUp);
      element.removeEventListener('touchmove', this.disableScroll);
      if (this.enablePan && this.enableTap) {
        this.recenter(event);
      }
    } else if (this.touchMode !== null) {
      this.onTouchChange(event);
    }

    (this.scene.element as any)[$panElement].style.opacity = 0;
    element.style.cursor = 'grab';
    this.panPerPixel = 0;

    if (this.isUserPointing) {
      this.dispatchEvent({type: 'pointer-change-end'});
    }
  };

  private onTouchChange(event: PointerEvent) {
    if (this.pointers.length === 1) {
      this.touchMode = this.touchModeRotate;
    } else {
      if (this._disableZoom) {
        this.touchMode = null;
        this.element.removeEventListener('touchmove', this.disableScroll);
        return;
      }
      this.touchMode = (this.touchDecided && this.touchMode === null) ?
          null :
          this.touchModeZoom;
      this.touchDecided = true;
      this.element.addEventListener(
          'touchmove', this.disableScroll, {passive: false});
      this.lastSeparation =
          this.twoTouchDistance(this.pointers[0], this.pointers[1]);

      if (this.enablePan && this.touchMode != null) {
        this.initializePan();
        if (!event.altKey) {  // user interaction, not prompt
          (this.scene.element as any)[$panElement].style.opacity = 1;
        }
      }
    }
  }

  private onMouseDown(event: MouseEvent) {
    this.panPerPixel = 0;
    if (this.enablePan &&
        (event.button === 2 || event.ctrlKey || event.metaKey ||
         event.shiftKey)) {
      this.initializePan();
      (this.scene.element as any)[$panElement].style.opacity = 1;
    }
    this.element.style.cursor = 'grabbing';
  }

  private onWheel = (event: Event) => {
    this.changeSource = ChangeSource.USER_INTERACTION;

    const deltaZoom = (event as WheelEvent).deltaY *
        ((event as WheelEvent).deltaMode == 1 ? 18 : 1) * ZOOM_SENSITIVITY / 30;
    this.userAdjustOrbit(0, 0, deltaZoom);

    event.preventDefault();
    this.dispatchEvent({type: 'user-interaction'});
  };

  private onKeyDown = (event: KeyboardEvent) => {
    // We track if the key is actually one we respond to, so as not to
    // accidentally clobber unrelated key inputs when the <model-viewer> has
    // focus.
    const {changeSource} = this;
    this.changeSource = ChangeSource.USER_INTERACTION;

    const relevantKey = (event.shiftKey && this.enablePan) ?
        this.panKeyCodeHandler(event) :
        this.orbitZoomKeyCodeHandler(event);

    if (relevantKey) {
      event.preventDefault();
      this.dispatchEvent({type: 'user-interaction'});
    } else {
      this.changeSource = changeSource;
    }
  };

  /**
   * Handles the orbit and Zoom key presses
   * Uses constants for the increment.
   * @param event The keyboard event for the .key value
   * @returns boolean to indicate if the key event has been handled
   */
  private orbitZoomKeyCodeHandler(event: KeyboardEvent) {
    let relevantKey = true;
    switch (event.key) {
      case 'PageUp':
        this.userAdjustOrbit(0, 0, ZOOM_SENSITIVITY);
        break;
      case 'PageDown':
        this.userAdjustOrbit(0, 0, -1 * ZOOM_SENSITIVITY);
        break;
      case 'ArrowUp':
        this.userAdjustOrbit(0, -KEYBOARD_ORBIT_INCREMENT, 0);
        break;
      case 'ArrowDown':
        this.userAdjustOrbit(0, KEYBOARD_ORBIT_INCREMENT, 0);
        break;
      case 'ArrowLeft':
        this.userAdjustOrbit(-KEYBOARD_ORBIT_INCREMENT, 0, 0);
        break;
      case 'ArrowRight':
        this.userAdjustOrbit(KEYBOARD_ORBIT_INCREMENT, 0, 0);
        break;
      default:
        relevantKey = false;
        break;
    }
    return relevantKey;
  }

  /**
   * Handles the Pan key presses
   * Uses constants for the increment.
   * @param event The keyboard event for the .key value
   * @returns boolean to indicate if the key event has been handled
   */
  private panKeyCodeHandler(event: KeyboardEvent) {
    this.initializePan();
    let relevantKey = true;
    switch (event.key) {
      case 'ArrowUp':
        this.movePan(
            0,
            -1 * PAN_KEY_INCREMENT);  // This is the negative one so that the
                                      // model appears to move as the arrow
                                      // direction rather than the view moving
        break;
      case 'ArrowDown':
        this.movePan(0, PAN_KEY_INCREMENT);
        break;
      case 'ArrowLeft':
        this.movePan(-1 * PAN_KEY_INCREMENT, 0);
        break;
      case 'ArrowRight':
        this.movePan(PAN_KEY_INCREMENT, 0);
        break;
      default:
        relevantKey = false;
        break;
    }
    return relevantKey;
  }
}
