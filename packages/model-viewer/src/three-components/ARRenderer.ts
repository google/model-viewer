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

import {BoxGeometry, BufferGeometry, Event as ThreeEvent, EventDispatcher, Line, Matrix4, Mesh, PerspectiveCamera, Quaternion, Vector3, WebGLRenderer, XRControllerEventType, XRTargetRaySpace} from 'three';
import {XREstimatedLight} from 'three/examples/jsm/webxr/XREstimatedLight.js';

import {CameraChangeDetails, ControlsInterface} from '../features/controls.js';
import {$currentBackground, $currentEnvironmentMap} from '../features/environment.js';
import ModelViewerElementBase from '../model-viewer-base.js';
import {assertIsArCandidate} from '../utilities.js';

import {Damper} from './Damper.js';
import {ModelScene} from './ModelScene.js';
import {PlacementBox} from './PlacementBox.js';
import {Renderer} from './Renderer.js';
import {ChangeSource} from './SmoothControls.js';

// number of initial null pose XRFrames allowed before we post not-tracking
const INIT_FRAMES = 30;
// AR shadow is not user-configurable. This is to pave the way for AR lighting
// estimation, which will be used once available in WebXR.
const AR_SHADOW_INTENSITY = 0.8;
const ROTATION_RATE = 1.5;
// Angle down (towards bottom of screen) from camera center ray to use for hit
// testing against the floor. This makes placement faster and more intuitive
// assuming the phone is in portrait mode. This seems to be a reasonable
// assumption for the start of the session and UI will lack landscape mode to
// encourage upright use.
const HIT_ANGLE_DEG = 20;
const SCALE_SNAP = 0.2;
// For automatic dynamic viewport scaling, don't let the scale drop below this
// limit.
const MIN_VIEWPORT_SCALE = 0.25;
// Furthest away you can move an object (meters).
const MAX_DISTANCE = 10;
// Damper decay in milliseconds for the headset - screen uses default.
const DECAY = 150;
// Longer controller/hand indicator line (meters).
const MAX_LINE_LENGTH = 5;
// Maximum dimension of rotation indicator box on controller (meters).
const BOX_SIZE = 0.1;

export type ARStatus =
    'not-presenting'|'session-started'|'object-placed'|'failed';

export const ARStatus: {[index: string]: ARStatus} = {
  NOT_PRESENTING: 'not-presenting',
  SESSION_STARTED: 'session-started',
  OBJECT_PLACED: 'object-placed',
  FAILED: 'failed'
};

export interface ARStatusEvent extends ThreeEvent {
  status: ARStatus,
}

export type ARTracking = 'tracking'|'not-tracking';

export const ARTracking: {[index: string]: ARTracking} = {
  TRACKING: 'tracking',
  NOT_TRACKING: 'not-tracking'
};

export interface ARTrackingEvent extends ThreeEvent {
  status: ARTracking,
}

interface UserData {
  turning: boolean, box: Mesh, line: Line
}

interface Controller extends XRTargetRaySpace {
  userData: UserData
}

interface XRControllerEvent {
  type: XRControllerEventType, data: XRInputSource, target: Controller
}

const vector3 = new Vector3();
const quaternion = new Quaternion();
const matrix4 = new Matrix4();
const hitPosition = new Vector3();
const camera = new PerspectiveCamera(45, 1, 0.1, 100);
const lineGeometry = new BufferGeometry().setFromPoints(
    [new Vector3(0, 0, 0), new Vector3(0, 0, -1)]);
const boxGeometry = new BoxGeometry();

export class ARRenderer extends EventDispatcher<
    {status: {status: ARStatus}, tracking: {status: ARTracking}}> {
  public threeRenderer: WebGLRenderer;
  public currentSession: XRSession|null = null;
  public placeOnWall = false;

  private placementBox: PlacementBox|null = null;
  private lastTick: number|null = null;
  private turntableRotation: number|null = null;
  private oldShadowIntensity: number|null = null;
  private frame: XRFrame|null = null;
  private initialHitSource: XRHitTestSource|null = null;
  private transientHitTestSource: XRTransientInputHitTestSource|null = null;
  private inputSource: XRInputSource|null = null;
  private _presentedScene: ModelScene|null = null;
  private resolveCleanup: ((...args: any[]) => void)|null = null;
  private exitWebXRButtonContainer: HTMLElement|null = null;
  private overlay: HTMLElement|null = null;
  private xrLight: XREstimatedLight|null = null;
  private xrMode: 'screen-space'|'world-space'|null = null;
  private controller1: Controller|null = null;
  private controller2: Controller|null = null;
  private selectedController: Controller|null = null;

  private tracking = true;
  private frames = 0;
  private initialized = false;
  private oldTarget = new Vector3();
  private placementComplete = false;
  private isTranslating = false;
  private isRotating = false;
  private isTwoFingering = false;
  private lastDragPosition = new Vector3();
  private relativeOrientation = new Quaternion();
  private scaleLine = new Line(lineGeometry);
  private firstRatio = 0;
  private lastAngle = 0;
  private goalPosition = new Vector3();
  private goalYaw = 0;
  private goalScale = 1;
  private xDamper = new Damper();
  private yDamper = new Damper();
  private zDamper = new Damper();
  private yawDamper = new Damper();
  private pitchDamper = new Damper();
  private rollDamper = new Damper();
  private scaleDamper = new Damper();

  private onExitWebXRButtonContainerClick = () => this.stopPresenting();

  constructor(private renderer: Renderer) {
    super();
    this.threeRenderer = renderer.threeRenderer;
    this.threeRenderer.xr.enabled = true;
  }

  async resolveARSession(): Promise<XRSession> {
    assertIsArCandidate();

    const session: XRSession =
        await navigator.xr!.requestSession!('immersive-ar', {
          requiredFeatures: ['hit-test'],
          optionalFeatures: ['dom-overlay', 'light-estimation'],
          domOverlay: this.overlay ? {root: this.overlay} : undefined
        });

    this.threeRenderer.xr.setReferenceSpaceType('local');

    await this.threeRenderer.xr.setSession(session);

    this.threeRenderer.xr.cameraAutoUpdate = false;

    return session;
  }

  /**
   * The currently presented scene, if any
   */
  get presentedScene() {
    return this._presentedScene;
  }

  /**
   * Resolves to true if the renderer has detected all the necessary qualities
   * to support presentation in AR.
   */
  async supportsPresentation(): Promise<boolean> {
    try {
      assertIsArCandidate();
      return await navigator.xr!.isSessionSupported('immersive-ar');
    } catch (error) {
      console.warn('Request to present in WebXR denied:');
      console.warn(error);
      console.warn('Falling back to next ar-mode');
      return false;
    }
  }

  /**
   * Present a scene in AR
   */
  async present(scene: ModelScene, environmentEstimation: boolean = false):
      Promise<void> {
    if (this.isPresenting) {
      console.warn('Cannot present while a model is already presenting');
    }

    let waitForAnimationFrame = new Promise<void>((resolve, _reject) => {
      requestAnimationFrame(() => resolve());
    });

    scene.setHotspotsVisibility(false);
    scene.queueRender();
    // Render a frame to turn off the hotspots
    await waitForAnimationFrame;

    // This sets isPresenting to true
    this._presentedScene = scene;
    this.overlay = scene.element.shadowRoot!.querySelector('div.default');

    if (environmentEstimation === true) {
      this.xrLight = new XREstimatedLight(this.threeRenderer);

      this.xrLight.addEventListener('estimationstart', () => {
        if (!this.isPresenting || this.xrLight == null) {
          return;
        }

        const scene = this.presentedScene!;
        scene.add(this.xrLight);

        scene.environment = this.xrLight.environment;
      });
    }

    const currentSession = await this.resolveARSession();

    currentSession.addEventListener('end', () => {
      this.postSessionCleanup();
    }, {once: true});

    const exitButton = scene.element.shadowRoot!.querySelector(
                           '.slot.exit-webxr-ar-button') as HTMLElement;
    exitButton.classList.add('enabled');
    exitButton.addEventListener('click', this.onExitWebXRButtonContainerClick);
    this.exitWebXRButtonContainer = exitButton;

    const viewerRefSpace = await currentSession.requestReferenceSpace('viewer');

    this.xrMode = (currentSession as any).interactionMode;

    this.tracking = true;
    this.frames = 0;
    this.initialized = false;

    this.turntableRotation = scene.yaw;
    this.goalYaw = scene.yaw;
    this.goalScale = 1;

    scene.setBackground(null);

    this.oldShadowIntensity = scene.shadowIntensity;
    scene.setShadowIntensity(0.01);  // invisible, but not changing the shader

    this.oldTarget.copy(scene.getTarget());

    scene.element.addEventListener('load', this.onUpdateScene);

    const radians = HIT_ANGLE_DEG * Math.PI / 180;
    const ray = this.placeOnWall === true ?
        undefined :
        new XRRay(
            new DOMPoint(0, 0, 0),
            {x: 0, y: -Math.sin(radians), z: -Math.cos(radians)});
    currentSession
        .requestHitTestSource!
        ({space: viewerRefSpace, offsetRay: ray})!.then(hitTestSource => {
          this.initialHitSource = hitTestSource;
        });

    if (this.xrMode !== 'screen-space') {
      this.setupControllers();
      this.xDamper.setDecayTime(DECAY);
      this.yDamper.setDecayTime(DECAY);
      this.zDamper.setDecayTime(DECAY);
      this.yawDamper.setDecayTime(DECAY);
      this.pitchDamper.setDecayTime(DECAY);
      this.rollDamper.setDecayTime(DECAY);
    }

    this.currentSession = currentSession;
    this.placementBox =
        new PlacementBox(scene, this.placeOnWall ? 'back' : 'bottom');
    this.placementComplete = false;

    this.lastTick = performance.now();
    this.dispatchEvent({type: 'status', status: ARStatus.SESSION_STARTED});
  }

  private setupControllers() {
    this.controller1 = this.threeRenderer.xr.getController(0) as Controller;
    this.controller1.addEventListener(
        'selectstart', this.onControllerSelectStart);
    this.controller1.addEventListener('selectend', this.onControllerSelectEnd);

    this.controller2 = this.threeRenderer.xr.getController(1) as Controller;
    this.controller2.addEventListener(
        'selectstart', this.onControllerSelectStart);
    this.controller2.addEventListener('selectend', this.onControllerSelectEnd);

    const scene = this.presentedScene!;
    scene.add(this.controller1);
    scene.add(this.controller2);

    if (!this.controller1.userData.line) {
      const line = new Line(lineGeometry);
      line.name = 'line';
      line.scale.z = MAX_LINE_LENGTH;

      this.controller1.userData.turning = false;
      this.controller1.userData.line = line;
      this.controller1.add(line);

      this.controller2.userData.turning = false;
      const line2 = line.clone();
      this.controller2.userData.line = line2;
      this.controller2.add(line2);

      this.scaleLine.name = 'scale line';
      this.scaleLine.visible = false;
      this.controller1.add(this.scaleLine);

      const {size} = scene;
      const scale = BOX_SIZE / Math.max(size.x, size.y, size.z);
      const box = new Mesh(boxGeometry);
      box.name = 'box';
      box.scale.copy(size).multiplyScalar(scale);
      box.visible = false;

      this.controller1.userData.box = box;
      scene.add(box);
      const box2 = box.clone();
      this.controller2.userData.box = box2;
      scene.add(box2);
    }
  }

  private hover(controller: XRTargetRaySpace): boolean {
    // Do not highlight in mobile-ar
    if (this.xrMode === 'screen-space' ||
        this.selectedController == controller) {
      return false;
    }

    const scene = this.presentedScene!;
    const intersection =
        this.placementBox!.controllerIntersection(scene, controller)
    controller.userData.box.visible =
        (intersection == null || controller.userData.turning) &&
        !this.isTwoFingering;
    controller.userData.line.scale.z =
        intersection == null ? MAX_LINE_LENGTH : intersection.distance;
    return intersection != null;
  }

  private controllerSeparation() {
    return this.controller1!.position.distanceTo(this.controller2!.position);
  }

  private onControllerSelectStart = (event: XRControllerEvent) => {
    const scene = this.presentedScene!;
    const controller = event.target;

    if (this.placementBox!.controllerIntersection(scene, controller) != null) {
      if (this.selectedController != null) {
        this.selectedController.userData.line.visible = false;
        if (scene.canScale) {
          this.isTwoFingering = true;
          this.firstRatio = this.controllerSeparation() / scene.pivot.scale.x;
          this.scaleLine.visible = true;
        }
      }

      controller.attach(scene.pivot);
      this.selectedController = controller;

      scene.setShadowIntensity(0.01);
    } else {
      const otherController = controller === this.controller1 ?
          this.controller2! :
          this.controller1!;

      this.relativeOrientation.copy(controller.quaternion)
          .invert()
          .multiply(scene.pivot.getWorldQuaternion(quaternion));

      otherController.userData.turning = false;
      controller.userData.turning = true;
      controller.userData.line.visible = false;
    }
  };

  private onControllerSelectEnd = (event: XRControllerEvent) => {
    const controller = event.target;
    controller.userData.turning = false;
    controller.userData.line.visible = true;
    this.isTwoFingering = false;
    this.scaleLine.visible = false;
    if (this.selectedController != null &&
        this.selectedController != controller) {
      return;
    }
    const scene = this.presentedScene!;
    // drop on floor
    scene.attach(scene.pivot);
    this.selectedController = null;
    this.goalYaw = Math.atan2(
        scene.pivot.matrix.elements[8], scene.pivot.matrix.elements[10]);
    this.goalPosition.x = scene.pivot.position.x;
    this.goalPosition.z = scene.pivot.position.z;
  };

  /**
   * If currently presenting a scene in AR, stops presentation and exits AR.
   */
  async stopPresenting() {
    if (!this.isPresenting) {
      return;
    }

    const cleanupPromise = new Promise((resolve) => {
      this.resolveCleanup = resolve;
    });

    try {
      await this.currentSession!.end();
      await cleanupPromise;
    } catch (error) {
      console.warn('Error while trying to end WebXR AR session');
      console.warn(error);

      this.postSessionCleanup();
    }
  }

  /**
   * True if a scene is currently in the process of being presented in AR
   */
  get isPresenting(): boolean {
    return this.presentedScene != null;
  }

  get target(): Vector3 {
    return this.oldTarget;
  }

  updateTarget() {
    const scene = this.presentedScene;
    if (scene != null) {
      const target = scene.getTarget();
      this.oldTarget.copy(target);
      if (this.placeOnWall) {
        // Move the scene's target to the center of the back of the model's
        // bounding box.
        target.z = scene.boundingBox.min.z;
      } else {
        // Move the scene's target to the model's floor height.
        target.y = scene.boundingBox.min.y;
      }
      scene.setTarget(target.x, target.y, target.z);
    }
  }

  onUpdateScene = () => {
    if (this.placementBox != null && this.isPresenting) {
      this.placementBox!.dispose();
      this.placementBox = new PlacementBox(
          this.presentedScene!, this.placeOnWall ? 'back' : 'bottom');
    }
  };

  private postSessionCleanup() {
    const session = this.currentSession;
    if (session != null) {
      session.removeEventListener('selectstart', this.onSelectStart);
      session.removeEventListener('selectend', this.onSelectEnd);
      this.currentSession = null;
    }

    const scene = this.presentedScene;
    this._presentedScene = null;
    if (scene != null) {
      const {element} = scene;

      if (this.xrLight != null) {
        scene.remove(this.xrLight);
        (this.xrLight as any).dispose();
        this.xrLight = null;
      }

      scene.add(scene.pivot);
      scene.pivot.quaternion.set(0, 0, 0, 1);
      scene.pivot.position.set(0, 0, 0);
      scene.pivot.scale.set(1, 1, 1);
      scene.setShadowOffset(0);
      const yaw = this.turntableRotation;
      if (yaw != null) {
        scene.yaw = yaw;
      }
      const intensity = this.oldShadowIntensity;
      if (intensity != null) {
        scene.setShadowIntensity(intensity);
      }
      scene.setEnvironmentAndSkybox(
          (element as any)[$currentEnvironmentMap],
          (element as any)[$currentBackground]);
      const point = this.oldTarget;
      scene.setTarget(point.x, point.y, point.z);
      scene.xrCamera = null;

      scene.element.removeEventListener('load', this.onUpdateScene);
      scene.orientHotspots(0);
      const {width, height} = element.getBoundingClientRect();
      scene.setSize(width, height);

      requestAnimationFrame(() => {
        scene.element.dispatchEvent(new CustomEvent<CameraChangeDetails>(
            'camera-change', {detail: {source: ChangeSource.NONE}}));
      });
    }

    // Force the Renderer to update its size
    this.renderer.height = 0;

    const exitButton = this.exitWebXRButtonContainer;
    if (exitButton != null) {
      exitButton.classList.remove('enabled');
      exitButton.removeEventListener(
          'click', this.onExitWebXRButtonContainerClick);
      this.exitWebXRButtonContainer = null;
    }

    const hitSource = this.transientHitTestSource;
    if (hitSource != null) {
      hitSource.cancel();
      this.transientHitTestSource = null;
    }

    const hitSourceInitial = this.initialHitSource;
    if (hitSourceInitial != null) {
      hitSourceInitial.cancel();
      this.initialHitSource = null;
    }

    if (this.placementBox != null) {
      this.placementBox!.dispose();
      this.placementBox = null;
    }

    if (this.xrMode !== 'screen-space') {
      if (this.controller1 != null) {
        this.controller1.userData.turning = false;
        this.controller1.userData.box.visible = false;
        this.controller1.userData.line.visible = true;
        this.controller1.removeEventListener(
            'selectstart', this.onControllerSelectStart);
        this.controller1.removeEventListener(
            'selectend', this.onControllerSelectEnd);
        this.controller1.removeFromParent();
        this.controller1 = null;
      }
      if (this.controller2 != null) {
        this.controller2.userData.turning = false;
        this.controller2.userData.box.visible = false;
        this.controller2.userData.line.visible = true;
        this.controller2.removeEventListener(
            'selectstart', this.onControllerSelectStart);
        this.controller2.removeEventListener(
            'selectend', this.onControllerSelectEnd);
        this.controller2.removeFromParent();
        this.controller2 = null;
      }
      this.selectedController = null;
      this.scaleLine.visible = false;
    }

    this.isTranslating = false;
    this.isRotating = false;
    this.isTwoFingering = false;
    this.lastTick = null;
    this.turntableRotation = null;
    this.oldShadowIntensity = null;
    this.frame = null;
    this.inputSource = null;
    this.overlay = null;

    if (this.resolveCleanup != null) {
      this.resolveCleanup!();
    }

    this.dispatchEvent({type: 'status', status: ARStatus.NOT_PRESENTING});
  }

  private updateView(view: XRView) {
    const scene = this.presentedScene!;
    const xr = this.threeRenderer.xr;

    xr.updateCamera(camera);
    scene.xrCamera = xr.getCamera();
    const {elements} = scene.getCamera().matrixWorld;
    scene.orientHotspots(Math.atan2(elements[1], elements[5]));

    if (!this.initialized) {
      this.placeInitially();
      this.initialized = true;
    }

    // Use automatic dynamic viewport scaling if supported.
    if (view.requestViewportScale && view.recommendedViewportScale) {
      const scale = view.recommendedViewportScale;
      view.requestViewportScale(Math.max(scale, MIN_VIEWPORT_SCALE));
    }
    const layer = xr.getBaseLayer();
    if (layer != null) {
      const viewport = layer instanceof XRWebGLLayer ?
          layer!.getViewport(view)! :
          xr.getBinding().getViewSubImage(layer, view).viewport;
      this.threeRenderer.setViewport(
          viewport.x, viewport.y, viewport.width, viewport.height);
    }
  }

  private placeInitially() {
    const scene = this.presentedScene!;
    const {pivot, element} = scene;
    const {position} = pivot;
    const xrCamera = scene.getCamera();

    const {width, height} = this.overlay!.getBoundingClientRect();
    scene.setSize(width, height);

    xrCamera.projectionMatrixInverse.copy(xrCamera.projectionMatrix).invert();

    const {theta} = (element as ModelViewerElementBase & ControlsInterface)
                        .getCameraOrbit();

    // Orient model to match the 3D camera view
    const cameraDirection = xrCamera.getWorldDirection(vector3);
    scene.yaw = Math.atan2(-cameraDirection.x, -cameraDirection.z) - theta;
    this.goalYaw = scene.yaw;

    const radius = Math.max(1, 2 * scene.boundingSphere.radius);
    position.copy(xrCamera.position)
        .add(cameraDirection.multiplyScalar(radius));

    this.updateTarget();
    const target = scene.getTarget();
    position.add(target).sub(this.oldTarget);

    this.goalPosition.copy(position);

    scene.setHotspotsVisibility(true);

    if (this.xrMode === 'screen-space') {
      const {session} = this.frame!;
      session.addEventListener('selectstart', this.onSelectStart);
      session.addEventListener('selectend', this.onSelectEnd);
      session
          .requestHitTestSourceForTransientInput!
          ({profile: 'generic-touchscreen'})!.then(hitTestSource => {
            this.transientHitTestSource = hitTestSource;
          });
    }
  }

  private getTouchLocation(): Vector3|null {
    const {axes} = this.inputSource!.gamepad!;
    let location = this.placementBox!.getExpandedHit(
        this.presentedScene!, axes[0], axes[1]);
    if (location != null) {
      vector3.copy(location).sub(this.presentedScene!.getCamera().position);
      if (vector3.length() > MAX_DISTANCE)
        return null;
    }
    return location;
  }

  private getHitPoint(hitResult: XRHitTestResult): Vector3|null {
    const refSpace = this.threeRenderer.xr.getReferenceSpace()!;
    const pose = hitResult.getPose(refSpace);
    if (pose == null) {
      return null;
    }

    const hitMatrix = matrix4.fromArray(pose.transform.matrix);

    if (this.placeOnWall === true) {
      // Orient the model to the wall's normal vector.
      this.goalYaw = Math.atan2(hitMatrix.elements[4], hitMatrix.elements[6]);
    }
    // Check that the y-coordinate of the normal is large enough that the normal
    // is pointing up for floor placement; opposite for wall placement.
    return hitMatrix.elements[5] > 0.75 !== this.placeOnWall ?
        hitPosition.setFromMatrixPosition(hitMatrix) :
        null;
  }

  public moveToFloor(frame: XRFrame) {
    const hitSource = this.initialHitSource;
    if (hitSource == null) {
      return;
    }

    const hitTestResults = frame.getHitTestResults(hitSource);
    if (hitTestResults.length == 0) {
      return;
    }

    const hit = hitTestResults[0];
    const hitPoint = this.getHitPoint(hit);
    if (hitPoint == null) {
      return;
    }

    this.placementBox!.show = true;

    // If the user is translating, let the finger hit-ray take precedence and
    // ignore this hit result.
    if (!this.isTranslating) {
      if (this.placeOnWall) {
        this.goalPosition.copy(hitPoint);
      } else {
        this.goalPosition.y = hitPoint.y;
      }
    }

    hitSource.cancel();
    this.initialHitSource = null;
    this.dispatchEvent({type: 'status', status: ARStatus.OBJECT_PLACED});
  }

  private onSelectStart = (event: Event) => {
    const hitSource = this.transientHitTestSource;
    if (hitSource == null) {
      return;
    }
    const fingers = this.frame!.getHitTestResultsForTransientInput(hitSource);
    const scene = this.presentedScene!;
    const box = this.placementBox!;

    if (fingers.length === 1) {
      this.inputSource = (event as XRInputSourceEvent).inputSource;
      const {axes} = this.inputSource!.gamepad!;

      const hitPosition = box.getHit(this.presentedScene!, axes[0], axes[1]);
      box.show = true;

      if (hitPosition != null) {
        this.isTranslating = true;
        this.lastDragPosition.copy(hitPosition);
      } else if (this.placeOnWall === false) {
        this.isRotating = true;
        this.lastAngle = axes[0] * ROTATION_RATE;
      }
    } else if (fingers.length === 2) {
      box.show = true;
      this.isTwoFingering = true;
      const {separation} = this.fingerPolar(fingers);
      this.firstRatio = separation / scene.pivot.scale.x;
    }
  };

  private onSelectEnd = () => {
    this.isTranslating = false;
    this.isRotating = false;
    this.isTwoFingering = false;
    this.inputSource = null;
    this.goalPosition.y +=
        this.placementBox!.offsetHeight * this.presentedScene!.scale.x;
    this.placementBox!.show = false
  };

  private fingerPolar(fingers: XRTransientInputHitTestResult[]):
      {separation: number, deltaYaw: number} {
    const fingerOne = fingers[0].inputSource.gamepad!.axes;
    const fingerTwo = fingers[1].inputSource.gamepad!.axes;
    const deltaX = fingerTwo[0] - fingerOne[0];
    const deltaY = fingerTwo[1] - fingerOne[1];
    const angle = Math.atan2(deltaY, deltaX);
    let deltaYaw = this.lastAngle - angle;
    if (deltaYaw > Math.PI) {
      deltaYaw -= 2 * Math.PI;
    } else if (deltaYaw < -Math.PI) {
      deltaYaw += 2 * Math.PI;
    }
    this.lastAngle = angle;
    return {
      separation: Math.sqrt(deltaX * deltaX + deltaY * deltaY),
      deltaYaw: deltaYaw
    };
  }

  private setScale(separation: number) {
    const scale = separation / this.firstRatio;
    this.goalScale = (Math.abs(scale - 1) < SCALE_SNAP) ? 1 : scale;
  }

  private processInput(frame: XRFrame) {
    const hitSource = this.transientHitTestSource;
    if (hitSource == null) {
      return;
    }
    if (!this.isTranslating && !this.isTwoFingering && !this.isRotating) {
      return;
    }
    const fingers = frame.getHitTestResultsForTransientInput(hitSource);
    const scene = this.presentedScene!;
    const scale = scene.pivot.scale.x;

    // Rotating, translating and scaling are mutually exclusive operations; only
    // one can happen at a time, but we can switch during a gesture.
    if (this.isTwoFingering) {
      if (fingers.length < 2) {
        // If we lose the second finger, stop scaling (in fact, stop processing
        // input altogether until a new gesture starts).
        this.isTwoFingering = false;
      } else {
        const {separation, deltaYaw} = this.fingerPolar(fingers);
        if (this.placeOnWall === false) {
          this.goalYaw += deltaYaw;
        }
        if (scene.canScale) {
          this.setScale(separation);
        }
      }
      return;
    } else if (fingers.length === 2) {
      // If we were rotating or translating and we get a second finger, switch
      // to scaling instead.
      this.isTranslating = false;
      this.isRotating = false;
      this.isTwoFingering = true;
      const {separation} = this.fingerPolar(fingers);
      this.firstRatio = separation / scale;
      return;
    }

    if (this.isRotating) {
      const angle = this.inputSource!.gamepad!.axes[0] * ROTATION_RATE;
      this.goalYaw += angle - this.lastAngle;
      this.lastAngle = angle;
    } else if (this.isTranslating) {
      fingers.forEach(finger => {
        if (finger.inputSource !== this.inputSource) {
          return;
        }

        let hit = null;
        if (finger.results.length > 0) {
          hit = this.getHitPoint(finger.results[0]);
        }
        if (hit == null) {
          hit = this.getTouchLocation();
        }
        if (hit == null) {
          return;
        }

        this.goalPosition.sub(this.lastDragPosition);

        if (this.placeOnWall === false) {
          const offset = hit.y - this.lastDragPosition.y;
          // When a lower floor is found, keep the model at the same height, but
          // drop the placement box to the floor. The model falls on select end.
          if (offset < 0) {
            this.placementBox!.offsetHeight = offset / scale;
            this.presentedScene!.setShadowOffset(offset);
            // Interpolate hit ray up to drag plane
            const cameraPosition = vector3.copy(scene.getCamera().position);
            const alpha = -offset / (cameraPosition.y - hit.y);
            cameraPosition.multiplyScalar(alpha);
            hit.multiplyScalar(1 - alpha).add(cameraPosition);
          }
        }

        this.goalPosition.add(hit);
        this.lastDragPosition.copy(hit);
      });
    }
  }

  private moveScene(delta: number) {
    const scene = this.presentedScene!;
    const {pivot} = scene;
    const box = this.placementBox!;
    box.updateOpacity(delta);

    if (this.controller1) {
      if (this.controller1.userData.turning) {
        pivot.quaternion.copy(this.controller1.quaternion)
            .multiply(this.relativeOrientation);
        if (this.selectedController &&
            this.selectedController === this.controller2) {
          pivot.quaternion.premultiply(
              quaternion.copy(this.controller2.quaternion).invert());
        }
      }
      this.controller1.userData.box.position.copy(this.controller1.position);
      pivot.getWorldQuaternion(this.controller1.userData.box.quaternion);
    }

    if (this.controller2) {
      if (this.controller2.userData.turning) {
        pivot.quaternion.copy(this.controller2.quaternion)
            .multiply(this.relativeOrientation);
        if (this.selectedController &&
            this.selectedController === this.controller1) {
          pivot.quaternion.premultiply(
              quaternion.copy(this.controller1.quaternion).invert());
        }
      }
      this.controller2.userData.box.position.copy(this.controller2.position);
      pivot.getWorldQuaternion(this.controller2.userData.box.quaternion);
    }

    if (this.controller1 && this.controller2 && this.isTwoFingering) {
      const dist = this.controllerSeparation();
      this.setScale(dist);
      this.scaleLine.scale.z = -dist;
      this.scaleLine.lookAt(this.controller2.position);
    }

    const oldScale = scene.pivot.scale.x;
    if (this.goalScale !== oldScale) {
      const newScale =
          this.scaleDamper.update(oldScale, this.goalScale, delta, 1);
      scene.pivot.scale.set(newScale, newScale, newScale);
    }

    if (pivot.parent !== scene) {
      return;  // attached to controller instead
    }
    const {position} = pivot;
    const boundingRadius = scene.boundingSphere.radius;
    const goal = this.goalPosition;

    let source = ChangeSource.NONE;
    if (!goal.equals(position)) {
      source = ChangeSource.USER_INTERACTION;
      let {x, y, z} = position;
      x = this.xDamper.update(x, goal.x, delta, boundingRadius);
      y = this.yDamper.update(y, goal.y, delta, boundingRadius);
      z = this.zDamper.update(z, goal.z, delta, boundingRadius);
      position.set(x, y, z);

      if (this.xrMode === 'screen-space' && !this.isTranslating) {
        const offset = goal.y - y;
        if (this.placementComplete && this.placeOnWall === false) {
          box.offsetHeight = offset / scene.pivot.scale.x;
          scene.setShadowOffset(offset);
        } else if (offset === 0) {
          this.placementComplete = true;
          box.show = false;
          scene.setShadowIntensity(AR_SHADOW_INTENSITY);
        }
      }
      if (this.xrMode !== 'screen-space' && goal.equals(position)) {
        scene.setShadowIntensity(AR_SHADOW_INTENSITY);
      }
    }
    scene.updateTarget(delta);
    // yaw must be updated last, since this also updates the shadow position.
    quaternion.setFromAxisAngle(vector3.set(0, 1, 0), this.goalYaw);
    const angle = scene.pivot.quaternion.angleTo(quaternion);
    const angleStep = angle - this.yawDamper.update(angle, 0, delta, Math.PI);
    scene.pivot.quaternion.rotateTowards(quaternion, angleStep);
    // camera changes on every frame - user-interaction only if touching the
    // screen, plus damping time.
    scene.element.dispatchEvent(new CustomEvent<CameraChangeDetails>(
        'camera-change', {detail: {source}}));
  }

  /**
   * Only public to make it testable.
   */
  public onWebXRFrame(time: number, frame: XRFrame) {
    if (this.xrMode !== 'screen-space') {
      const over1 = this.hover(this.controller1!);
      const over2 = this.hover(this.controller2!);
      this.placementBox!.show = (over1 || over2) && !this.isTwoFingering;
    }

    this.frame = frame;
    ++this.frames;
    const refSpace = this.threeRenderer.xr.getReferenceSpace()!;
    const pose = frame.getViewerPose(refSpace);

    if (pose == null && this.tracking === true && this.frames > INIT_FRAMES) {
      this.tracking = false;
      this.dispatchEvent({type: 'tracking', status: ARTracking.NOT_TRACKING});
    }

    const scene = this.presentedScene;
    if (pose == null || scene == null || !scene.element.loaded) {
      this.threeRenderer.clear();
      return;
    }

    if (this.tracking === false) {
      this.tracking = true;
      this.dispatchEvent({type: 'tracking', status: ARTracking.TRACKING});
    }

    // WebXR may return multiple views, i.e. for headset AR. This
    // isn't really supported at this point, but make a best-effort
    // attempt to render other views also, using the first view
    // as the main viewpoint.
    let isFirstView: boolean = true;
    for (const view of pose.views) {
      this.updateView(view);

      if (isFirstView) {
        this.moveToFloor(frame);

        this.processInput(frame);

        const delta = time - this.lastTick!;
        this.moveScene(delta);
        this.renderer.preRender(scene, time, delta);
        this.lastTick = time;

        scene.renderShadow(this.threeRenderer);
      }

      this.threeRenderer.render(scene, scene.getCamera());
      isFirstView = false;
    }
  }
}
