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

import {EventDispatcher, Matrix4, PerspectiveCamera, Ray, Vector3, WebGLRenderer} from 'three';

import {$onResize} from '../model-viewer-base.js';
import {assertIsArCandidate} from '../utilities.js';

import {Damper} from './Damper.js';
import {ModelScene} from './ModelScene.js';
import {PlacementBox} from './PlacementBox.js';
import {Renderer} from './Renderer.js';
import {assertContext} from './WebGLUtils.js';

// AR shadow is not user-configurable. This is to pave the way for AR lighting
// estimation, which will be used once available in WebXR.
const AR_SHADOW_INTENSITY = 0.3;
const ROTATION_RATE = 1.5;
// Angle down (towards bottom of screen) from camera center ray to use for hit
// testing against the floor. This makes placement faster and more intuitive
// assuming the phone is in portrait mode. This seems to be a reasonable
// assumption for the start of the session and UI will lack landscape mode to
// encourage upright use.
const HIT_ANGLE_DEG = 20;
// Slow down the dampers for initial placement.
const INTRO_DAMPER_RATE = 0.4;
const SCALE_SNAP_HIGH = 1.2;
const SCALE_SNAP_LOW = 1 / SCALE_SNAP_HIGH;

const $presentedScene = Symbol('presentedScene');
const $placementBox = Symbol('placementBox');
const $lastTick = Symbol('lastTick');
const $turntableRotation = Symbol('turntableRotation');
const $oldShadowIntensity = Symbol('oldShadowIntensity');
const $oldBackground = Symbol('oldBackground');
const $rafId = Symbol('rafId');
export const $currentSession = Symbol('currentSession');
const $tick = Symbol('tick');
const $refSpace = Symbol('refSpace');
const $viewerRefSpace = Symbol('viewerRefSpace');
const $frame = Symbol('frame');
const $initialized = Symbol('initialized');
const $initialModelToWorld = Symbol('initialModelToWorld');
const $placementComplete = Symbol('placementComplete');
const $initialHitSource = Symbol('hitTestSource');
const $transientHitTestSource = Symbol('transiertHitTestSource');
const $inputSource = Symbol('inputSource');
const $isTranslating = Symbol('isTranslating');
const $isRotating = Symbol('isRotating');
const $isScaling = Symbol('isScaling');
const $lastDragPosition = Symbol('lastDragPosition');
const $lastScalar = Symbol('lastScalar');
const $goalPosition = Symbol('goalPosition');
const $goalYaw = Symbol('goalYaw');
const $goalScale = Symbol('goalScale');
const $xDamper = Symbol('xDamper');
const $yDamper = Symbol('yDamper');
const $zDamper = Symbol('zDamper');
const $yawDamper = Symbol('yawDamper');
const $scaleDamper = Symbol('scaleDamper');
const $damperRate = Symbol('damperRate');
const $resolveCleanup = Symbol('resolveCleanup');

export const $onWebXRFrame = Symbol('onWebXRFrame');
const $postSessionCleanup = Symbol('postSessionCleanup');
const $updateCamera = Symbol('updateCamera');
const $placeInitially = Symbol('placeInitially');
const $getHitPoint = Symbol('getHitPoint');
const $selectStartHandler = Symbol('selectStartHandler');
const $onSelectStart = Symbol('onSelectStart');
const $selectEndHandler = Symbol('selectHandler');
const $onSelectEnd = Symbol('onSelect');
const $fingerSeparation = Symbol('fingerSeparation');
const $processInput = Symbol('processInput');
const $moveScene = Symbol('moveScene');

const vector3 = new Vector3();
const matrix4 = new Matrix4();
const hitPosition = new Vector3();

export class ARRenderer extends EventDispatcher {
  public threeRenderer: WebGLRenderer;

  public camera: PerspectiveCamera = new PerspectiveCamera();

  private[$placementBox]: PlacementBox|null = null;
  private[$lastTick]: number|null = null;
  private[$turntableRotation]: number|null = null;
  private[$oldShadowIntensity]: number|null = null;
  private[$oldBackground]: any = null;
  private[$rafId]: number|null = null;
  protected[$currentSession]: XRSession|null = null;
  private[$refSpace]: XRReferenceSpace|null = null;
  private[$viewerRefSpace]: XRReferenceSpace|null = null;
  private[$frame]: XRFrame|null = null;
  private[$initialHitSource]: XRHitTestSource|null = null;
  private[$transientHitTestSource]: XRTransientInputHitTestSource|null = null;
  private[$inputSource]: XRInputSource|null = null;
  private[$presentedScene]: ModelScene|null = null;
  private[$resolveCleanup]: ((...args: any[]) => void)|null = null;

  private[$initialized] = false;
  private[$initialModelToWorld] = new Matrix4();
  private[$placementComplete] = false;
  private[$isTranslating] = false;
  private[$isRotating] = false;
  private[$isScaling] = false;
  private[$lastDragPosition] = new Vector3();
  private[$lastScalar] = 0;
  private[$goalPosition] = new Vector3();
  private[$goalYaw] = 0;
  private[$goalScale] = 1;
  private[$xDamper] = new Damper();
  private[$yDamper] = new Damper();
  private[$zDamper] = new Damper();
  private[$yawDamper] = new Damper();
  private[$scaleDamper] = new Damper();
  private[$damperRate] = 1;

  private[$selectStartHandler] = (event: Event) =>
      this[$onSelectStart](event as XRInputSourceEvent);
  private[$selectEndHandler] = (event: Event) =>
      this[$onSelectEnd](event as XRInputSourceEvent);

  constructor(private renderer: Renderer) {
    super();
    this.threeRenderer = renderer.threeRenderer;
    // Turn this off, as the matrix is set directly from webXR rather than using
    // postion, rotation, scale.
    this.camera.matrixAutoUpdate = false;
  }

  async resolveARSession(scene: ModelScene): Promise<XRSession> {
    assertIsArCandidate();

    const session: XRSession =
        await navigator.xr!.requestSession!('immersive-ar', {
          requiredFeatures: ['hit-test'],
          optionalFeatures: ['dom-overlay'],
          domOverlay: {
            root: scene.element.shadowRoot!.querySelector(
                'div.annotation-container')
          }
        });

    const gl = assertContext(this.renderer.context3D);
    // `makeXRCompatible` replaced `setCompatibleXRDevice` in Chrome M73 @TODO
    // #293, handle WebXR API changes. WARNING: this can cause a GL context
    // loss according to the spec, though current implementations don't do so.
    await gl.makeXRCompatible();

    session.updateRenderState(
        {baseLayer: new XRWebGLLayer(session, gl, {alpha: true})});

    // The render state update takes effect on the next animation frame. Wait
    // for it so that we get a framebuffer.
    let waitForAnimationFrame = new Promise((resolve, _reject) => {
      session.requestAnimationFrame(() => resolve());
    });
    await waitForAnimationFrame;

    scene.element[$onResize](window.screen);

    const {framebuffer, framebufferWidth, framebufferHeight} =
        session.renderState.baseLayer!;
    // Redirect rendering to the WebXR offscreen framebuffer.
    // TODO: this method should be added to three.js's exported interface.
    (this.threeRenderer as any).setFramebuffer(framebuffer);
    this.threeRenderer.setViewport(0, 0, framebufferWidth, framebufferHeight);

    return session;
  }

  /**
   * The currently presented scene, if any
   */
  get presentedScene() {
    return this[$presentedScene];
  }

  /**
   * Resolves to true if the renderer has detected all the necessary qualities
   * to support presentation in AR.
   */
  async supportsPresentation() {
    try {
      assertIsArCandidate();
      return await navigator.xr!.isSessionSupported('immersive-ar');
    } catch (error) {
      return false;
    }
  }

  /**
   * Present a scene in AR
   */
  async present(scene: ModelScene): Promise<void> {
    if (this.isPresenting) {
      console.warn('Cannot present while a model is already presenting');
    }

    // This sets isPresenting to true
    this[$presentedScene] = scene;

    const currentSession = await this.resolveARSession(scene);
    currentSession.addEventListener('end', () => {
      this[$postSessionCleanup]();
    }, {once: true});

    this[$refSpace] = await currentSession.requestReferenceSpace('local');
    this[$viewerRefSpace] =
        await currentSession.requestReferenceSpace('viewer');

    const placementBox = new PlacementBox(scene.model);
    this[$placementComplete] = false;

    scene.setCamera(this.camera);
    this[$initialized] = false;
    this[$damperRate] = INTRO_DAMPER_RATE;

    this[$turntableRotation] = scene.yaw;
    scene.yaw = 0;
    this[$goalYaw] = 0;
    this[$goalScale] = 1;

    this[$oldBackground] = scene.background;
    scene.background = null;

    this[$oldShadowIntensity] = scene.shadowIntensity;
    scene.setShadowIntensity(0);

    const radians = HIT_ANGLE_DEG * Math.PI / 180;
    const ray = new XRRay(
        new DOMPoint(0, 0, 0),
        {x: 0, y: -Math.sin(radians), z: -Math.cos(radians)});
    currentSession
        .requestHitTestSource({space: this[$viewerRefSpace]!, offsetRay: ray})
        .then(hitTestSource => {
          this[$initialHitSource] = hitTestSource;
        });

    this[$currentSession] = currentSession;
    this[$placementBox] = placementBox;
    this[$lastTick] = performance.now();

    // Start the event loop.
    this[$tick]();
  }

  /**
   * If currently presenting a scene in AR, stops presentation and exits AR.
   */
  async stopPresenting() {
    if (!this.isPresenting) {
      return;
    }

    const cleanupPromise = new Promise((resolve) => {
      this[$resolveCleanup] = resolve;
    });

    try {
      const session = this[$currentSession]!;
      session.removeEventListener('selectstart', this[$selectStartHandler]);
      session.removeEventListener('selectend', this[$selectEndHandler]);

      this[$currentSession] = null;
      session.cancelAnimationFrame(this[$rafId]!);

      await session.end();
      await cleanupPromise;
    } catch (error) {
      console.warn('Error while trying to end AR session');
      console.warn(error);

      this[$postSessionCleanup]();
    }
  }

  [$postSessionCleanup]() {
    // The offscreen WebXR framebuffer is now invalid, switch
    // back to the default framebuffer for canvas output.
    // TODO: this method should be added to three.js's exported interface.
    (this.threeRenderer as any).setFramebuffer(null);

    const scene = this[$presentedScene];
    if (scene != null) {
      const {model, element} = scene;
      scene.setCamera(scene.camera);
      model.remove(this[$placementBox]!);

      scene.position.set(0, 0, 0);
      scene.scale.set(1, 1, 1);
      model.setShadowScaleAndOffset(1, 0);
      scene.yaw = this[$turntableRotation]!;
      scene.setShadowIntensity(this[$oldShadowIntensity]!);
      scene.background = this[$oldBackground];
      model.orientHotspots(0);
      element.requestUpdate('cameraTarget');
      element[$onResize](element.getBoundingClientRect());
    }

    if (this[$placementBox] != null) {
      this[$placementBox]!.dispose();
      this[$placementBox] = null;
    }

    this[$refSpace] = null;
    this[$presentedScene] = null;

    if (this[$resolveCleanup] != null) {
      this[$resolveCleanup]!();
    }
  }

  /**
   * True if a scene is currently in the process of being presented in AR
   */
  get isPresenting(): boolean {
    return this[$presentedScene] != null;
  }

  [$updateCamera](view: XRView) {
    const {camera} = this;
    const {matrix: cameraMatrix} = camera;

    cameraMatrix.fromArray(view.transform.matrix);
    camera.updateMatrixWorld(true);
    // position is not updated when matrix is updated.
    camera.position.setFromMatrixPosition(cameraMatrix);

    if (this[$initialHitSource] != null) {
      // Target locked to screen center
      const {position, model} = this[$presentedScene]!;
      const radius = model.idealCameraDistance;
      camera.getWorldDirection(position);
      position.multiplyScalar(radius);
      position.add(camera.position);
    }

    if (!this[$initialized]) {
      camera.projectionMatrix.fromArray(view.projectionMatrix);
      // Have to set the inverse manually when setting matrix directly. This is
      // needed for raycasting.
      camera.projectionMatrixInverse.getInverse(camera.projectionMatrix);
      // Orient model toward camera on first frame.
      const {x, z} = camera.position;
      const scene = this[$presentedScene]!;
      scene.pointTowards(x, z);
      scene.model.updateMatrixWorld(true);
      this[$goalYaw] = scene.yaw;
      this[$initialModelToWorld].copy(scene.model.matrixWorld);
      this[$initialized] = true;
    }

    this[$presentedScene]!.model.orientHotspots(
        Math.atan2(cameraMatrix.elements[1], cameraMatrix.elements[5]));
  }

  [$placeInitially](frame: XRFrame) {
    const hitSource = this[$initialHitSource];
    if (hitSource == null) {
      return;
    }

    const hitTestResults = frame.getHitTestResults(hitSource);
    if (hitTestResults.length == 0) {
      return;
    }

    const hit = hitTestResults[0];
    const hitMatrix = this[$getHitPoint](hit);
    if (hitMatrix == null) {
      return;
    }

    this.placeModel(hitMatrix);

    hitSource.cancel();
    this[$initialHitSource] = null;

    const {session} = frame;
    session.addEventListener('selectstart', this[$selectStartHandler]);
    session.addEventListener('selectend', this[$selectEndHandler]);
    session
        .requestHitTestSourceForTransientInput({profile: 'generic-touchscreen'})
        .then(hitTestSource => {
          this[$transientHitTestSource] = hitTestSource;
        });
  }

  [$getHitPoint](hitResult: XRHitTestResult): Vector3|null {
    const pose = hitResult.getPose(this[$refSpace]!);
    if (pose == null) {
      return null;
    }

    const hitMatrix = matrix4.fromArray(pose.transform.matrix);
    // Check that the y-coordinate of the normal is large enough that the normal
    // is pointing up.
    return hitMatrix.elements[5] > 0.75 ?
        hitPosition.setFromMatrixPosition(hitMatrix) :
        null;
  }

  /**
   * This sets the initial model placement based on the input hit point. The
   * bottom of the model will be placed on the floor (the shadow will rest on
   * the input's y-coordinate). The XZ placement is found by first putting the
   * scene's target at the hit point, drawing a ray from the camera to the
   * target, and finding the XZ-intersection of this ray with the model's
   * bounding box. The scene is then translated on the XZ plane to position this
   * intersection point at the input hit point. If the ray does not intersect,
   * the target is left at the hit point.
   *
   * This ensures the model is placed according to the chosen target, is not
   * reoriented, and does not intersect the camera even when the model
   * is large (unless the target is chosen outside of the model's bounding box).
   */
  placeModel(hit: Vector3) {
    const scene = this[$presentedScene]!;
    const {model} = scene;
    const {min, max} = model.boundingBox;

    this[$placementBox]!.show = true;

    const goal = this[$goalPosition];
    goal.copy(hit);
    const floor = hit.y;

    const origin = this.camera.position.clone();
    const direction = hit.clone().sub(origin).normalize();
    // Pull camera back enough to be outside of large models.
    origin.sub(direction.multiplyScalar(model.idealCameraDistance));
    const ray = new Ray(origin, direction.normalize());

    const modelToWorld = this[$initialModelToWorld];
    const modelPosition =
        new Vector3().setFromMatrixPosition(modelToWorld).add(hit);
    modelToWorld.setPosition(modelPosition);
    const world2Model = new Matrix4().getInverse(modelToWorld);
    ray.applyMatrix4(world2Model);

    // Make the box tall so that we don't intersect the top face.
    max.y += 10;
    ray.intersectBox(model.boundingBox, modelPosition);
    max.y -= 10;

    if (modelPosition != null) {
      modelPosition.applyMatrix4(modelToWorld);
      goal.add(hit).sub(modelPosition);
    }

    // Move the scene's target to the model's floor height.
    const target = scene.getTarget();
    scene.setTarget(target.x, min.y, target.z);
    // Ignore the y-coordinate and set on the floor instead.
    goal.y = floor;

    this.dispatchEvent({type: 'modelmove'});
  }

  [$onSelectStart](event: XRInputSourceEvent) {
    const hitSource = this[$transientHitTestSource];
    if (hitSource == null) {
      return;
    }
    const fingers = this[$frame]!.getHitTestResultsForTransientInput(hitSource);
    const scene = this[$presentedScene]!;
    const box = this[$placementBox]!;

    if (fingers.length === 1) {
      this[$inputSource] = event.inputSource;
      const {axes} = event.inputSource.gamepad;

      const hitPosition = box.getHit(this[$presentedScene]!, axes[0], axes[1]);
      box.show = true;

      if (hitPosition != null) {
        this[$isTranslating] = true;
        this[$lastDragPosition].copy(hitPosition);
      } else {
        this[$isRotating] = true;
        this[$lastScalar] = axes[0];
      }
    } else if (fingers.length === 2 && scene.canScale) {
      box.show = true;
      this[$isScaling] = true;
      this[$lastScalar] = this[$fingerSeparation](fingers) / scene.scale.x;
    }
  }

  [$onSelectEnd](_event: XRInputSourceEvent) {
    this[$isTranslating] = false;
    this[$isRotating] = false;
    this[$isScaling] = false;
    this[$inputSource] = null;
    this[$goalPosition].y +=
        this[$placementBox]!.offsetHeight * this[$presentedScene]!.scale.x;
    this[$placementBox]!.show = false
  }

  [$fingerSeparation](fingers: XRTransientInputHitTestResult[]): number {
    const fingerOne = fingers[0].inputSource.gamepad.axes;
    const fingerTwo = fingers[1].inputSource.gamepad.axes;
    const deltaX = fingerTwo[0] - fingerOne[0];
    const deltaY = fingerTwo[1] - fingerOne[1];
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  }

  [$processInput](frame: XRFrame) {
    const hitSource = this[$transientHitTestSource];
    if (hitSource == null) {
      return;
    }
    if (!this[$isTranslating] && !this[$isScaling] && !this[$isRotating]) {
      return;
    }
    const fingers = frame.getHitTestResultsForTransientInput(hitSource);
    const scene = this[$presentedScene]!;
    const scale = scene.scale.x;

    // Rotating, translating and scaling are mutually exclusive operations; only
    // one can happen at a time, but we can switch during a gesture.
    if (this[$isScaling]) {
      if (fingers.length < 2) {
        // If we lose the second finger, stop scaling (in fact, stop processing
        // input altogether until a new gesture starts).
        this[$isScaling] = false;
      } else {
        const separation = this[$fingerSeparation](fingers);
        const scale = separation / this[$lastScalar];
        this[$goalScale] =
            (scale < SCALE_SNAP_HIGH && scale > SCALE_SNAP_LOW) ? 1 : scale;
      }
      return;
    } else if (fingers.length === 2 && scene.canScale) {
      // If we were rotating or translating and we get a second finger, switch
      // to scaling instead.
      this[$isTranslating] = false;
      this[$isRotating] = false;
      this[$isScaling] = true;
      this[$lastScalar] = this[$fingerSeparation](fingers) / scale;
      return;
    }

    if (this[$isRotating]) {
      const thisDragX = this[$inputSource]!.gamepad.axes[0];
      this[$goalYaw] += (thisDragX - this[$lastScalar]) * ROTATION_RATE;
      this[$lastScalar] = thisDragX;
    } else if (this[$isTranslating]) {
      fingers.forEach(finger => {
        if (finger.inputSource !== this[$inputSource] ||
            finger.results.length < 1) {
          return;
        }

        const hit = this[$getHitPoint](finger.results[0]);
        if (hit == null) {
          return;
        }

        this[$goalPosition].sub(this[$lastDragPosition]);

        const offset = hit.y - this[$lastDragPosition].y;
        // When a lower floor is found, keep the model at the same height, but
        // drop the placement box to the floor. The model falls on select end.
        if (offset < 0) {
          this[$placementBox]!.offsetHeight = offset / scale;
          this[$presentedScene]!.model.setShadowScaleAndOffset(scale, offset);
          // Interpolate hit ray up to drag plane
          const cameraPosition = vector3.copy(this.camera.position);
          const alpha = -offset / (cameraPosition.y - hit.y);
          cameraPosition.multiplyScalar(alpha);
          hit.multiplyScalar(1 - alpha).add(cameraPosition);
        }

        this[$goalPosition].add(hit);
        this[$lastDragPosition].copy(hit);
      });
    }
  }

  [$moveScene](delta: number) {
    const scene = this[$presentedScene]!;
    const {model, position, yaw} = scene;
    const radius = model.idealCameraDistance;
    const goal = this[$goalPosition];
    const oldScale = scene.scale.x;
    const box = this[$placementBox]!;

    if (this[$initialHitSource] == null &&
        (!goal.equals(position) || this[$goalScale] !== oldScale)) {
      let {x, y, z} = position;
      delta *= this[$damperRate];
      x = this[$xDamper].update(x, goal.x, delta, radius);
      y = this[$yDamper].update(y, goal.y, delta, radius);
      z = this[$zDamper].update(z, goal.z, delta, radius);
      position.set(x, y, z);

      const newScale =
          this[$scaleDamper].update(oldScale, this[$goalScale], delta, 1);
      scene.scale.set(newScale, newScale, newScale);

      if (!this[$isTranslating]) {
        const offset = goal.y - y;
        if (this[$placementComplete]) {
          box.offsetHeight = offset / newScale;
          model.setShadowScaleAndOffset(newScale, offset);
        } else if (offset === 0) {
          this[$placementComplete] = true;
          box.show = false;
          scene.setShadowIntensity(AR_SHADOW_INTENSITY);
          this[$damperRate] = 1;
        }
      }
    }
    box.updateOpacity(delta);
    scene.updateTarget(delta);
    // This updates the model's position, which the shadow is based on.
    scene.updateMatrixWorld(true);
    // yaw must be updated last, since this also updates the shadow position.
    scene.yaw = this[$yawDamper].update(yaw, this[$goalYaw], delta, Math.PI);
  }

  [$tick]() {
    this[$rafId] = this[$currentSession]!.requestAnimationFrame(
        (time, frame) => this[$onWebXRFrame](time, frame));
  }

  [$onWebXRFrame](time: number, frame: XRFrame) {
    this[$frame] = frame;
    const pose = frame.getViewerPose(this[$refSpace]!);

    // TODO: Notify external observers of tick
    this[$tick]();

    const scene = this[$presentedScene];
    if (pose == null || scene == null) {
      return;
    }

    this[$updateCamera](pose.views[0]);

    this[$placeInitially](frame);

    this[$processInput](frame);

    const delta = time - this[$lastTick]!;
    this[$moveScene](delta);
    this.renderer.preRender(scene, time, delta);
    this[$lastTick] = time;

    // NOTE: Clearing depth caused issues on Samsung devices
    // @see https://github.com/googlecodelabs/ar-with-webxr/issues/8
    // this.threeRenderer.clearDepth();
    this.threeRenderer.render(scene, this.camera);
  }
}
