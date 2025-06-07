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

import {Box3, BufferGeometry, Event as ThreeEvent, EventDispatcher, Line, Matrix4, PerspectiveCamera, Quaternion, Vector3, WebGLRenderer, XRControllerEventType, XRTargetRaySpace, Object3D} from 'three';
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
import { XRMenuPanel } from './XRMenuPanel.js';

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
// Axis Y in webxr.
const AXIS_Y = new Vector3(0, 1, 0);
// Webxr rotation sensitivity
const ROTATION_SENSIVITY = 0.3;

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
  turning: boolean
  line: Line
  isSelected: boolean
  initialX: number
}

interface XRController extends XRTargetRaySpace {
  userData: UserData
}

interface XRControllerEvent {
  type: XRControllerEventType, data: XRInputSource, target: XRController
}

const vector3 = new Vector3();
const quaternion = new Quaternion();
const matrix4 = new Matrix4();
const hitPosition = new Vector3();
const camera = new PerspectiveCamera(45, 1, 0.1, 100);
const lineGeometry = new BufferGeometry().setFromPoints(
    [new Vector3(0, 0, 0), new Vector3(0, 0, -1)]);

export const XRMode = {
  SCREEN_SPACE: 'screen-space',
  WORLD_SPACE: 'world-space'
} as const;
export type XRMode = typeof XRMode[keyof typeof XRMode];

export class ARRenderer extends EventDispatcher<
    {status: {status: ARStatus}, tracking: {status: ARTracking}}> {
  public threeRenderer: WebGLRenderer;
  public currentSession: XRSession|null = null;
  public placeOnWall = false;

  private placementBox: PlacementBox|null = null;
  private menuPanel: XRMenuPanel|null = null;
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
  private xrMode: XRMode | null = null;
  private xrController1: XRController|null = null;
  private xrController2: XRController|null = null;
  private selectedXRController: XRController|null = null;

  private tracking = true;
  private frames = 0;
  private initialized = false;
  private oldTarget = new Vector3();
  private placementComplete = false;
  private isTranslating = false;
  private isRotating = false;
  private isTwoHandInteraction = false;
  private lastDragPosition = new Vector3();
  private deltaRotation = new Quaternion();
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
          requiredFeatures: [],
          optionalFeatures: ['hit-test', 'dom-overlay', 'light-estimation'],
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

    if (this.xrMode !== XRMode.SCREEN_SPACE) {
      this.setupXRControllers();
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

    if (this.xrMode !== XRMode.SCREEN_SPACE) {
      this.menuPanel = new XRMenuPanel();
      scene.add(this.menuPanel);
      this.menuPanel.updatePosition(scene.getCamera(), this.placementBox!); // Position the menu panel
    }

    this.lastTick = performance.now();
    this.dispatchEvent({type: 'status', status: ARStatus.SESSION_STARTED});
  }

  private setupXRControllerLine(xrController: XRController) {
    if (!xrController.userData.line) {
      const line = new Line(lineGeometry);
      line.name = 'line';
      line.scale.z = MAX_LINE_LENGTH;
      xrController.userData.turning = false;
      xrController.userData.line = line;
      xrController.add(line);
    }
  }

  private setupXRControllers() {
    this.xrController1 = this.threeRenderer.xr.getController(0) as XRController;
    this.xrController2 = this.threeRenderer.xr.getController(1) as XRController;
  
    this.setupXRControllerLine(this.xrController1);
    this.setupXRControllerLine(this.xrController2);
  
    this.xrController1.addEventListener('selectstart', this.onControllerSelectStart);
    this.xrController1.addEventListener('selectend', this.onControllerSelectEnd);
  
    this.xrController2.addEventListener('selectstart', this.onControllerSelectStart);
    this.xrController2.addEventListener('selectend', this.onControllerSelectEnd);
  
    this.scaleLine.name = 'scale line';
    this.scaleLine.visible = false;
    this.xrController1.add(this.scaleLine);
  
    // Add controllers to the scene
    const scene = this.presentedScene!;
    scene.add(this.xrController1);
    scene.add(this.xrController2);
  }

  private hover(xrController: XRTargetRaySpace): boolean {
    // Do not highlight in mobile-ar
    if (this.xrMode === XRMode.SCREEN_SPACE ||
        this.selectedXRController == xrController) {
      return false;
    }

    const scene = this.presentedScene!;
    const intersection =
        this.placementBox!.controllerIntersection(scene, xrController);
    xrController.userData.line.scale.z =
        intersection == null ? MAX_LINE_LENGTH : intersection.distance;
    return intersection != null;
  }

  private controllerSeparation() {
    return this.xrController1!.position.distanceTo(this.xrController2!.position);
  }

  private onControllerSelectStart = (event: XRControllerEvent) => {
    const scene = this.presentedScene!;
    const controller = event.target;
    const menuPanel = this.menuPanel;
  
    const exitIntersect = this.menuPanel!.exitButtonControllerIntersection(scene, controller);
    if (exitIntersect != null) {
      this.menuPanel?.dispose();
      this.stopPresenting();
      return;
    }

    if (menuPanel) {
      menuPanel!.show = false;
    }

    const intersection = this.placementBox!.controllerIntersection(scene,
      controller);
    if (intersection!=null){
      const bbox = new Box3().setFromObject(scene.pivot);
      const footprintY = bbox.min.y + 0.2; // Small threshold above base

      // Check if the ray intersection is near the footprint
      const isFootprint = intersection.point.y <= footprintY;
      if (isFootprint) {
        if (this.selectedXRController != null) {
          this.selectedXRController.userData.line.visible = false;
          if (scene.canScale) {
            this.isTwoHandInteraction = true;
            this.firstRatio = this.controllerSeparation() / scene.pivot.scale.x;
            this.scaleLine.visible = true;
          }
        } else {
          controller.attach(scene.pivot);
        }
        this.selectedXRController = controller;
        scene.setShadowIntensity(0.01);
      } else {
        if (controller == this.xrController1) {
          this.xrController1.userData.isSelected = true;
        } else if (controller == this.xrController2) {
          this.xrController2.userData.isSelected = true;
        }

        if (this.xrController1?.userData.isSelected && this.xrController2?.userData.isSelected) {
          if (scene.canScale) {
            this.isTwoHandInteraction = true;
            this.firstRatio = this.controllerSeparation() / scene.pivot.scale.x;
            this.scaleLine.visible = true;
          }
        } else {
            const otherController = controller === this.xrController1 ? this.xrController2! :
            this.xrController1!;
            controller.userData.initialX = controller.position.x;
            otherController.userData.turning = false;
            controller.userData.turning = true;
            controller.userData.line.visible = false;
        }
      }
    }
  };

  private onControllerSelectEnd = (event: XRControllerEvent) => {
    const controller = event.target;
    controller.userData.turning = false;
    controller.userData.line.visible = true;
    this.isTwoHandInteraction = false;
    this.scaleLine.visible = false;

    if (controller == this.xrController1) {
      this.xrController1.userData.isSelected = false;
    } else if (controller == this.xrController2) {
      this.xrController2.userData.isSelected = false;
    }

    if (this.selectedXRController != null &&
        this.selectedXRController != controller) {
      return;
    }
    const scene = this.presentedScene!;
    // drop on floor
    scene.attach(scene.pivot);
    this.selectedXRController = null;
    this.goalYaw = Math.atan2(
        scene.pivot.matrix.elements[8], scene.pivot.matrix.elements[10]);
    this.goalPosition.x = scene.pivot.position.x;
    this.goalPosition.z = scene.pivot.position.z;

    const menuPanel = this.menuPanel;
    menuPanel!.show = true;
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
    if (this.xrMode !== XRMode.SCREEN_SPACE) {
        if (this.menuPanel) {
          this.menuPanel.dispose(); 
          this.menuPanel = null;
        }
        this.menuPanel = new XRMenuPanel();
        this.presentedScene!.add(this.menuPanel);
        this.menuPanel.updatePosition(this.presentedScene!.getCamera(), this.placementBox!);
      }

  };

  private cleanupXRController(xrController: XRController) {
    xrController.userData.turning = false;
    xrController.userData.line.visible = true;
    xrController.removeEventListener('selectstart', this.onControllerSelectStart);
    xrController.removeEventListener('selectend', this.onControllerSelectEnd);
    xrController.removeFromParent();
  }

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

      if (this.menuPanel != null) {
        this.menuPanel.dispose();
        this.menuPanel = null;
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

    if (this.xrMode !== XRMode.SCREEN_SPACE) {
      if (this.xrController1 != null) {
        this.cleanupXRController(this.xrController1);
        this.xrController1 = null;
      }
      if (this.xrController2 != null) {
        this.cleanupXRController(this.xrController2);
        this.xrController2 = null;
      }
      this.selectedXRController = null;
      this.scaleLine.visible = false;
    }

    this.isTranslating = false;
    this.isRotating = false;
    this.isTwoHandInteraction = false;
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

    if (this.xrMode === XRMode.SCREEN_SPACE) {
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
      this.isTwoHandInteraction = true;
      const {separation} = this.fingerPolar(fingers);
      this.firstRatio = separation / scene.pivot.scale.x;
    }
  };

  private onSelectEnd = () => {
    this.isTranslating = false;
    this.isRotating = false;
    this.isTwoHandInteraction = false;
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
    if (!this.isTranslating && !this.isTwoHandInteraction && !this.isRotating) {
      return;
    }
    const fingers = frame.getHitTestResultsForTransientInput(hitSource);
    const scene = this.presentedScene!;
    const scale = scene.pivot.scale.x;

    // Rotating, translating and scaling are mutually exclusive operations; only
    // one can happen at a time, but we can switch during a gesture.
    if (this.isTwoHandInteraction) {
      if (fingers.length < 2) {
        // If we lose the second finger, stop scaling (in fact, stop processing
        // input altogether until a new gesture starts).
        this.isTwoHandInteraction = false;
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
      this.isTwoHandInteraction = true;
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

  private applyXRControllerRotation(controller: XRController, pivot: Object3D) {
    if (!controller.userData.turning) {
      return;
    }
    const angle = (controller.position.x - controller.userData.initialX) * ROTATION_SENSIVITY;
    this.deltaRotation.setFromAxisAngle(AXIS_Y, angle);
    pivot.quaternion.multiplyQuaternions(this.deltaRotation, pivot.quaternion);
  }

  private handleScalingInXR(scene: ModelScene, delta: number) {
    if (this.xrController1 && this.xrController2 && this.isTwoHandInteraction) {
      const dist = this.controllerSeparation();
      this.setScale(dist);
      this.scaleLine.scale.z = -dist;
      this.scaleLine.lookAt(this.xrController2.position);
    }
    const oldScale = scene.pivot.scale.x;
    if (this.goalScale !== oldScale) {
      const newScale = this.scaleDamper.update(oldScale, this.goalScale, delta, 1);
      scene.pivot.scale.set(newScale, newScale, newScale);
    }
  }

  private updatePivotPosition(scene: ModelScene, delta: number) {
    const {pivot} = scene;
    const box = this.placementBox!;
    const boundingRadius = scene.boundingSphere.radius;
    const goal = this.goalPosition;
    const position = pivot.position;
  
    let source = ChangeSource.NONE;
    if (!goal.equals(position)) {
      source = ChangeSource.USER_INTERACTION;
      let {x, y, z} = position;
      x = this.xDamper.update(x, goal.x, delta, boundingRadius);
      y = this.yDamper.update(y, goal.y, delta, boundingRadius);
      z = this.zDamper.update(z, goal.z, delta, boundingRadius);
      position.set(x, y, z);
  
      if (this.xrMode === XRMode.SCREEN_SPACE && !this.isTranslating) {
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
      if (this.xrMode !== XRMode.SCREEN_SPACE && goal.equals(position)) {
        scene.setShadowIntensity(AR_SHADOW_INTENSITY);
      }
    }
    scene.updateTarget(delta);
  
    // Return the source so the caller can use it for camera-change events
    return source;
  }

  private updateYaw(scene: ModelScene, delta: number) {
    // yaw must be updated last, since this also updates the shadow position.
    quaternion.setFromAxisAngle(vector3.set(0, 1, 0), this.goalYaw);
    const angle = scene.pivot.quaternion.angleTo(quaternion);
    const angleStep = angle - this.yawDamper.update(angle, 0, delta, Math.PI);
    scene.pivot.quaternion.rotateTowards(quaternion, angleStep);
  }

  private updateMenuPanel(scene: ModelScene, box: PlacementBox, delta: number) {
    if (this.menuPanel) {
      this.menuPanel.updateOpacity(delta);
      this.menuPanel.updatePosition(scene.getCamera(), box);
    }
  }

  private applyXRInputToScene(delta: number) {
    const scene = this.presentedScene!;
    const pivot = scene.pivot;
    const box = this.placementBox!;

    this.updatePlacementBoxOpacity(box, delta);
    this.updateTwoHandInteractionState();
    this.applyXRControllerRotations(pivot);
    this.handleScalingInXR(scene, delta);

    if (pivot.parent !== scene) {
      return;  // attached to controller instead
    }

    const source = this.updatePivotPosition(scene, delta);
    this.updateYaw(scene, delta);
    this.dispatchCameraChangeEvent(scene, source);
    this.updateMenuPanel(scene, box, delta);
  }

  private updatePlacementBoxOpacity(box: PlacementBox, delta: number) {
    box.updateOpacity(delta);
  }

  private updateTwoHandInteractionState() {
    const bothSelected = this.xrController1?.userData.isSelected && this.xrController2?.userData.isSelected;
    this.isTwoHandInteraction = !!bothSelected;
  }

  private applyXRControllerRotations(pivot: Object3D) {
    if (!this.isTwoHandInteraction) {
      if (this.xrController1) this.applyXRControllerRotation(this.xrController1, pivot);
      if (this.xrController2) this.applyXRControllerRotation(this.xrController2, pivot);
    }
  }

  private dispatchCameraChangeEvent(scene: ModelScene, source: ChangeSource) {
    scene.element.dispatchEvent(new CustomEvent<CameraChangeDetails>(
      'camera-change', {detail: {source}}
    ));
  }

  private updateXRControllerHover() {
    const over1 = this.hover(this.xrController1!);
    const over2 = this.hover(this.xrController2!);
    this.placementBox!.show = (over1 || over2) && !this.isTwoHandInteraction;
  }

  private handleFirstView(frame: XRFrame, time: number) {
    this.moveToFloor(frame);
    this.processInput(frame);
  
    const delta = time - this.lastTick!;
    this.applyXRInputToScene(delta);
    this.renderer.preRender(this.presentedScene!, time, delta);
    this.lastTick = time;
  
    this.presentedScene!.renderShadow(this.threeRenderer);
  }

  /**
   * Only public to make it testable.
   */
  public onWebXRFrame(time: number, frame: XRFrame) {
    if (this.xrMode !== XRMode.SCREEN_SPACE) {
      this.updateXRControllerHover();
    }

    this.frame = frame;
    // increamenets a counter tracking how many frames have been processed sinces the session started
    ++this.frames;
    // refSpace and pose are used to get the user's current position and orientation in the XR session.
    const refSpace = this.threeRenderer.xr.getReferenceSpace()!;
    const pose = frame.getViewerPose(refSpace);

    // Tracking loss Detection.
    // If pos is null, it means the XR system cannot currently track the user's position(e.g., the camera is covered or the env can't be recognized).
    // Checks if we previously throught tracking was working
    // Ensures that we don't report tracking loss too early(sometimes the first few frames can be null as the system initializes).
    if (pose == null && this.tracking === true && this.frames > INIT_FRAMES) {
      this.tracking = false;
      this.dispatchEvent({type: 'tracking', status: ARTracking.NOT_TRACKING});
    }

    // Prevent rendering if there's no valid pose, no scene, or the scene isen't loaded.
    const scene = this.presentedScene;
    if (pose == null || scene == null || !scene.element.loaded) {
      this.threeRenderer.clear();
      return;
    }

    // Tracking REcovery Detection. 
    // If tracking was previously lost, but now we have a valid pose, it meanse tracking has been recovered.
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
        this.handleFirstView(frame, time);
        isFirstView = false;
      }

      this.threeRenderer.render(scene, scene.getCamera());
    }
  }
}
