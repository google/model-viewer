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

import {EventDispatcher, Matrix4, PerspectiveCamera, Vector3, WebGLRenderer} from 'three';

import {$onResize} from '../model-viewer-base.js';
import {ModelViewerElement} from '../model-viewer.js';
import {assertIsArCandidate} from '../utilities.js';

import {ModelScene} from './ModelScene.js';
import {PlacementBox} from './PlacementBox.js';
import {Renderer} from './Renderer.js';
import {assertContext} from './WebGLUtils.js';

// AR shadow is not user-configurable. This is to pave the way for AR lighting
// estimation, which will be used once available in WebXR.
const AR_SHADOW_INTENSITY = 0.5;
const ROTATION_RATE = 1.0;

const $presentedScene = Symbol('presentedScene');
const $placementBox = Symbol('placementBox');
const $lastTick = Symbol('lastTick');
const $turntableRotation = Symbol('turntableRotation');
const $oldShadowIntensity = Symbol('oldShadowIntensity');
const $oldBackground = Symbol('oldBackground');
const $rafId = Symbol('rafId');
const $currentSession = Symbol('currentSession');
const $tick = Symbol('tick');
const $refSpace = Symbol('refSpace');
const $viewerRefSpace = Symbol('viewerRefSpace');
const $initialHitSource = Symbol('hitTestSource');
const $transientHitTestSource = Symbol('transiertHitTestSource');
const $inputSource = Symbol('inputSource');
const $isTranslating = Symbol('isTranslating');
const $isRotating = Symbol('isRotating');
const $lastDragPosition = Symbol('lastDragPosition');
const $lastDragX = Symbol('lastDragX');
const $resolveCleanup = Symbol('resolveCleanup');

const $onWebXRFrame = Symbol('onWebXRFrame');
const $postSessionCleanup = Symbol('postSessionCleanup');
const $placeInitially = Symbol('placeInitially');
const $selectStartHandler = Symbol('selectStartHandler');
const $onSelectStart = Symbol('onSelectStart');
const $selectEndHandler = Symbol('selectHandler');
const $onSelectEnd = Symbol('onSelect');
const $processTransientInput = Symbol('processTransientInput');
const $rotateModel = Symbol('rotateModel');

const vector3 = new Vector3();
const matrix4 = new Matrix4();

export class ARRenderer extends EventDispatcher {
  public threeRenderer: WebGLRenderer;

  public camera: PerspectiveCamera = new PerspectiveCamera();

  private[$placementBox]: PlacementBox|null = null;
  private[$lastTick]: number|null = null;
  private[$turntableRotation]: number|null = null;
  private[$oldShadowIntensity]: number|null = null;
  private[$oldBackground]: any = null;
  private[$rafId]: number|null = null;
  private[$currentSession]: XRSession|null = null;
  private[$refSpace]: XRReferenceSpace|null = null;
  private[$viewerRefSpace]: XRReferenceSpace|null = null;
  private[$initialHitSource]: XRHitTestSource|null = null;
  private[$transientHitTestSource]: XRTransientInputHitTestSource|null = null;
  private[$inputSource]: XRInputSource|null = null;
  private[$presentedScene]: ModelScene|null = null;
  private[$resolveCleanup]: ((...args: any[]) => void)|null = null;

  private[$isTranslating] = false;
  private[$isRotating] = false;
  private[$lastDragPosition] = new Vector3();
  private[$lastDragX] = 0;

  private[$selectStartHandler] = (event: Event) =>
      this[$onSelectStart](event as XRInputSourceEvent);
  private[$selectEndHandler] = (event: Event) =>
      this[$onSelectEnd](event as XRInputSourceEvent);

  constructor(private renderer: Renderer) {
    super();
    this.threeRenderer = renderer.threeRenderer;

    this.camera.matrixAutoUpdate = false;
  }

  initializeRenderer() {
    this.threeRenderer.setPixelRatio(1);
  }

  async resolveARSession(): Promise<XRSession> {
    assertIsArCandidate();

    const session: XRSession =
        await navigator.xr!.requestSession!('immersive-ar', {
          requiredFeatures: ['hit-test'],
          optionalFeatures: ['dom-overlay'],
          domOverlay: {
            root: document.querySelector('model-viewer')!.shadowRoot!
                      .querySelector('div.annotation-container')
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

    // Redirect rendering to the WebXR offscreen framebuffer.
    // TODO: this method should be added to three.js's exported interface.
    (this.threeRenderer as any)
        .setFramebuffer(session.renderState.baseLayer!.framebuffer);
    this.threeRenderer.setSize(
        session.renderState.baseLayer!.framebufferWidth,
        session.renderState.baseLayer!.framebufferHeight,
        false);

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

    scene.setHotspotsVisibility(false);

    const currentSession = await this.resolveARSession();
    currentSession.addEventListener('end', () => {
      this[$postSessionCleanup]();
    }, {once: true});

    this[$refSpace] = await currentSession.requestReferenceSpace('local');
    this[$viewerRefSpace] =
        await currentSession.requestReferenceSpace('viewer');

    scene.setCamera(this.camera);

    const {size} = scene.model;
    this[$placementBox] = new PlacementBox(size.x, size.z);
    scene.pivot.add(this[$placementBox]!);
    scene.pivot.visible = false;

    this[$oldBackground] = scene.background;
    scene.background = null;

    this[$oldShadowIntensity] = scene.shadowIntensity;
    scene.setShadowIntensity(AR_SHADOW_INTENSITY);

    this[$presentedScene] = scene;
    this[$lastTick] = performance.now();
    const element = scene.element as ModelViewerElement;
    this[$turntableRotation] = element.turntableRotation;
    element.resetTurntableRotation();

    this.initializeRenderer();
    element[$onResize](window.screen);

    currentSession.requestHitTestSource({space: this[$viewerRefSpace]!})
        .then(hitTestSource => {
          this[$initialHitSource] = hitTestSource;
        });

    this[$currentSession] = currentSession;
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
      scene.setCamera(scene.camera);
      scene.pivot.remove(this[$placementBox]!);
      scene.pivot.visible = true;
      scene.setHotspotsVisibility(true);

      scene.pivot.position.set(0, 0, 0);
      scene.setPivotRotation(this[$turntableRotation]!);
      scene.setShadowIntensity(this[$oldShadowIntensity]!);
      scene.background = this[$oldBackground];
      scene.orientHotspots(0);
      scene.isDirty = true;

      this.renderer.expandTo(scene.width, scene.height);
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

  [$placeInitially](frame: XRFrame) {
    const hitSource = this[$initialHitSource];
    if (hitSource == null) {
      return;
    }

    const hitTestResults = frame.getHitTestResults(hitSource);
    if (hitTestResults.length > 0) {
      const hit = hitTestResults[0];
      const hitMatrix =
          matrix4.fromArray(hit.getPose(this[$refSpace]!)!.transform.matrix);
      this.placeModel(hitMatrix);

      hitSource.cancel();
      this[$initialHitSource] = null;

      const {session} = frame;
      session.addEventListener('selectstart', this[$selectStartHandler]);
      session.addEventListener('selectend', this[$selectEndHandler]);
      session
          .requestHitTestSourceForTransientInput(
              {profile: 'generic-touchscreen'})
          .then(hitTestSource => {
            this[$transientHitTestSource] = hitTestSource;
          });
    }
  }

  placeModel(hitMatrix: Matrix4) {
    // NOTE: Currently rays will be cast from the middle of the screen.
    // Eventually we might use input coordinates for this.

    const scene = this[$presentedScene]!;
    const {pivot, shadow} = scene;

    pivot.position.setFromMatrixPosition(hitMatrix);

    // Orient the dolly/model to face the camera
    const camPosition = vector3.setFromMatrixPosition(this.camera.matrix);
    pivot.lookAt(camPosition.x, pivot.position.y, camPosition.z);
    pivot.updateMatrixWorld();
    shadow!.setRotation(pivot.rotation.y);

    pivot.visible = true;
    scene.setHotspotsVisibility(true);

    this.dispatchEvent({type: 'modelmove'});
  }

  [$onSelectStart](event: XRInputSourceEvent) {
    this[$inputSource] = event.inputSource;
    const {axes} = event.inputSource.gamepad;

    if (this[$placementBox]!.isHit(this[$presentedScene]!, axes[0], axes[1])) {
      this[$isTranslating] = true;
      this[$processTransientInput](event.frame, false);
    } else {
      this[$isRotating] = true;
      this[$lastDragX] = axes[0];
    }
  }

  [$onSelectEnd](_event: XRInputSourceEvent) {
    this[$isTranslating] = false;
    this[$isRotating] = false;
    this[$inputSource] = null;
  }

  [$processTransientInput](frame: XRFrame, translateModel: boolean) {
    const hitSource = this[$transientHitTestSource];
    if (hitSource == null) {
      return;
    }
    const fingers = frame.getHitTestResultsForTransientInput(hitSource);

    fingers.forEach(finger => {
      if (finger.inputSource !== this[$inputSource] ||
          finger.results.length < 1) {
        return;
      }

      const hitMatrix = matrix4.fromArray(
          finger.results[0].getPose(this[$refSpace]!)!.transform.matrix);

      if (translateModel === true) {
        const thisDragPosition = vector3.setFromMatrixPosition(hitMatrix);
        const {pivot, shadow} = this[$presentedScene]!;
        pivot.position.add(thisDragPosition).sub(this[$lastDragPosition]);
        pivot.updateMatrixWorld();
        shadow!.setRotation(pivot.rotation.y);
        this[$lastDragPosition].copy(thisDragPosition);
      } else {
        this[$lastDragPosition].setFromMatrixPosition(hitMatrix);
      }
    });
  }

  [$rotateModel]() {
    const {pivot, shadow} = this[$presentedScene]!;
    const thisDragX = this[$inputSource]!.gamepad.axes[0];
    const deltaRadians = (thisDragX - this[$lastDragX]) * ROTATION_RATE;
    pivot.rotateY(deltaRadians);
    pivot.updateMatrixWorld();
    shadow!.setRotation(pivot.rotation.y);
    this[$lastDragX] = thisDragX;
  }

  [$tick]() {
    this[$rafId] = this[$currentSession]!.requestAnimationFrame(
        (time, frame) => this[$onWebXRFrame](time, frame));
  }

  [$onWebXRFrame](time: number, frame: XRFrame) {
    const {session} = frame;
    const refSpace = this[$refSpace]!;

    const pose = frame.getViewerPose(refSpace);

    // TODO: Notify external observers of tick

    this[$tick]();

    const scene = this[$presentedScene];
    if (pose == null || scene == null) {
      return;
    }

    const view = pose.views[0];
    const viewport = session.renderState.baseLayer!.getViewport(view);
    this.threeRenderer.setViewport(
        viewport.x, viewport.y, viewport.width, viewport.height);

    const {camera} = this;
    const {matrix: cameraMatrix} = camera;
    camera.projectionMatrix.fromArray(view.projectionMatrix);
    cameraMatrix.fromArray(view.transform.matrix);
    camera.updateMatrixWorld(true);
    // position is not updated when matrix is updated.
    camera.position.setFromMatrixPosition(cameraMatrix);

    scene.orientHotspots(
        Math.atan2(cameraMatrix.elements[1], cameraMatrix.elements[5]));

    const delta = time - this[$lastTick]!;
    this.renderer.preRender(scene, time, delta);
    this[$lastTick] = time;

    this[$placeInitially](frame);

    if (this[$isTranslating] === true) {
      this[$processTransientInput](frame, true);
    }

    if (this[$isRotating] === true) {
      this[$rotateModel]();
    }

    // NOTE: Clearing depth caused issues on Samsung devices
    // @see https://github.com/googlecodelabs/ar-with-webxr/issues/8
    // this.threeRenderer.clearDepth();
    this.threeRenderer.render(scene, camera);
  }
}
