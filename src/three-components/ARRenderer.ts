import {EventDispatcher, Matrix4, Object3D, PerspectiveCamera, Raycaster, Scene, Vector3, WebGLRenderer} from 'three';
import {assertIsArCandidate} from '../utilities.js';
import ModelScene from './ModelScene.js';
import Renderer from './Renderer.js';
import Reticle from './Reticle.js';
import {assertContext} from './WebGLUtils.js';

const $presentedScene = Symbol('presentedScene');

const $device = Symbol('device');
const $devicePromise = Symbol('devicePromise');
const $rafId = Symbol('rafId');
const $currentSession = Symbol('currentSession');
const $tick = Symbol('tick');
const $refSpace = Symbol('refSpace');
const $resolveCleanup = Symbol('resolveCleanup');

const $outputCanvas = Symbol('outputCanvas');
const $outputContext = Symbol('outputContext');

const $onWebXRFrame = Symbol('onWebXRFrame');
const $postSessionCleanup = Symbol('postSessionCleanup');

const matrix4 = new Matrix4();
const vector3 = new Vector3();
const originArray = new Float32Array(3);
const directionArray = new Float32Array(3);

export class ARRenderer extends EventDispatcher {
  public renderer: WebGLRenderer|null;
  public inputCanvas: HTMLCanvasElement | OffscreenCanvas;
  public inputContext: WebGLRenderingContext;

  public camera: PerspectiveCamera = new PerspectiveCamera();
  public scene: Scene = new Scene();
  public dolly: Object3D = new Object3D();
  public reticle: Reticle = new Reticle(this.camera);
  public raycaster: Raycaster|null = null;

  private[$outputCanvas]: HTMLCanvasElement|null = null;
  private[$outputContext]: WebGLRenderingContext|null = null;
  private[$rafId]: number|null = null;
  private[$currentSession]: XRSession|null = null;
  private[$refSpace]: XRCoordinateSystem|null = null;
  private[$presentedScene]: ModelScene|null = null;
  private[$resolveCleanup]: ((...args: any[]) => void)|null = null;
  private[$device]: XRDevice|null = null;
  private[$devicePromise]: Promise<void|XRDevice>;

  /**
   * Given an inline Renderer, construct an ARRenderer and return it
   */
  static fromInlineRenderer(renderer: Renderer) {
    return new ARRenderer(renderer.canvas, renderer.context!);
  }

  constructor(
      inputCanvas: HTMLCanvasElement | OffscreenCanvas, inputContext: WebGLRenderingContext) {
    super();

    this.renderer = null;

    this.inputCanvas = inputCanvas;
    this.inputContext = inputContext;

    this.camera.matrixAutoUpdate = false;

    this.scene.add(this.reticle);
    this.scene.add(this.dolly);

    // NOTE: XRDevice is being removed
    // @see https://github.com/immersive-web/webxr/pull/405
    this[$devicePromise] = this.resolveDevice()
                               .then((device) => {
                                 return this[$device] = device;
                               })
                               .catch((error) => {
                                 console.warn(error);
                                 console.warn('Browser AR will be disabled');
                               });
  }

  initializeRenderer() {
    if (this.renderer != null) {
      return;
    }

    this.renderer = new WebGLRenderer(
        {canvas: this.inputCanvas, context: this.inputContext});
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(1);
    this.renderer.autoClear = false;
    this.renderer.gammaOutput = true;
    this.renderer.gammaFactor = 2.2;
  }

  async resolveDevice(): Promise<XRDevice> {
    assertIsArCandidate();

    return await navigator.xr!.requestDevice();
  }

  async resolveARSession(): Promise<XRSession> {
    assertIsArCandidate();

    const device = this[$device];

    const session: XRSession = await device!.requestSession(
        {environmentIntegration: true, outputContext: this.outputContext!} as
        any);

    const gl: WebGLRenderingContext =
        assertContext(this.renderer!.getContext());

    // `makeXRCompatible` replaced `setCompatibleXRDevice` in Chrome M73
    // @TODO #293, handle WebXR API changes
    if ('setCompatibleXRDevice' in gl) {
      await gl.setCompatibleXRDevice(device!);
    } else {
      await (gl as any).makeXRCompatible();
    }

    session.baseLayer = new XRWebGLLayer(session, gl, {alpha: true});
    (this.renderer as any)
        .setFramebuffer((session.baseLayer as XRWebGLLayer).framebuffer);

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

      const device: XRDevice = await this[$devicePromise] as XRDevice;
      await device.supportsSession(
          {environmentIntegration: true, outputContext: this.outputContext!} as
          any);

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Present a scene in AR
   */
  async present(scene: ModelScene): Promise<HTMLCanvasElement> {
    if (this.isPresenting) {
      console.warn('Cannot present while a model is already presenting');
      return this.outputCanvas;
    }

    scene.model.scale.set(1, 1, 1);

    this[$presentedScene] = scene;

    this.initializeRenderer();

    this[$currentSession] = await this.resolveARSession();
    this[$currentSession]!.addEventListener('end', () => {
      this[$postSessionCleanup]();
    }, {once: true});

    // `requestReferenceSpace` replaced `requestFrameOfReference` in Chrome M73
    // @TODO #293, handle WebXR API changes
    this[$refSpace] = await (
        'requestFrameOfReference' in this[$currentSession]!?
            (this[$currentSession] as any)
                .requestFrameOfReference('eye-level') :
            this[$currentSession]!.requestReferenceSpace({
              type: 'stationary',
              subtype: 'eye-level',
            } as any));

    this[$tick]();

    return this.outputCanvas;
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
    if (this[$presentedScene] != null) {
      this.dolly.remove(this[$presentedScene]!);
      this[$presentedScene]!.updateFraming();
      this[$presentedScene]!.alignModel();
    }

    this[$refSpace] = null;
    this[$presentedScene] = null;

    if (this.outputCanvas.parentNode != null) {
      this.outputCanvas.parentNode.removeChild(this.outputCanvas);
    }

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

  get outputCanvas(): HTMLCanvasElement {
    if (this[$outputCanvas] == null) {
      this[$outputCanvas] = document.createElement('canvas');
      this[$outputCanvas]!.setAttribute('style', `
display: block;
position: absolute;
top: 0px;
left: 0px;
width: 100%;
height: 100%;`);
    }

    return this[$outputCanvas]!;
  }

  get outputContext() {
    if (this[$outputContext] == null) {
      this[$outputContext] =
          this.outputCanvas.getContext('xrpresent') as WebGLRenderingContext;
    }

    return this[$outputContext];
  }

  async placeModel() {
    if (this[$currentSession] == null) {
      return;
    }

    if (this.raycaster == null) {
      this.raycaster = new Raycaster();
    }

    // NOTE: Currently rays will be cast from the middle of the screen.
    // Eventually we might use input coordinates for this.
    this.raycaster.setFromCamera({x: 0, y: 0}, this.camera);
    const ray = this.raycaster.ray;
    originArray.set(ray.origin.toArray());
    directionArray.set(ray.direction.toArray());

    let hits;
    try {
      hits = await (this[$currentSession] as any)
                 .requestHitTest(originArray, directionArray, this[$refSpace]);
    } catch (e) {
      // Spec says this should no longer throw on invalid requests:
      // https://github.com/immersive-web/hit-test/issues/24
      // But in practice, it will still happen, so just ignore:
      // https://github.com/immersive-web/hit-test/issues/37
    }

    if (hits && hits.length) {
      const presentedScene = this[$presentedScene]!;
      const hit = hits[0];
      const hitMatrix = matrix4.fromArray(hit.hitMatrix);

      this.dolly.position.setFromMatrixPosition(hitMatrix);

      // Orient the dolly/model to face the camera
      const camPosition = vector3.setFromMatrixPosition(this.camera.matrix);
      this.dolly.lookAt(camPosition.x, this.dolly.position.y, camPosition.z);
      this.dolly.rotateY(-presentedScene.pivot.rotation.y);

      this.dolly.add(presentedScene);

      this.dispatchEvent({type: 'modelmove'});
    }
  }

  /**
   * It appears that XRSession's `inputsourceschange` event is not implemented
   * in Chrome Canary as of m72 for 'screen' inputs, which would be preferable
   * since we only need an "select" event, rather than track a pose on every
   * frame (like a 6DOF controller). Due to this bug, on every frame, check to
   * see if an input exists.
   * @see https://bugs.chromium.org/p/chromium/issues/detail?id=913703
   * @see https://immersive-web.github.io/webxr/#xrinputsource-interface
   */
  processXRInput(frame: XRFrame) {
    const {session} = frame;

    // Get current input sources. For now, only 'screen' input is supported,
    // which is only added to the session's active input sources immediately
    // before `selectstart` and removed immediately after `selectend` event.
    // If we have a 'screen' source here, it means the output canvas was tapped.
    const sources = session.getInputSources().filter(
        input => input.targetRayMode === 'screen');

    if (sources.length === 0) {
      return;
    }

    const pose = (frame as any).getInputPose(sources[0], this[$refSpace])
    if (pose) {
      this.placeModel();
    }
  }

  [$tick]() {
    this[$rafId] = this[$currentSession]!.requestAnimationFrame(
        (time, frame) => this[$onWebXRFrame](time, frame));
  }

  [$onWebXRFrame](_time: number, frame: XRFrame) {
    const {session} = frame;

    // `getViewerPose` replaced `getDevicePose` in Chrome M73
    // @TODO #293, handle WebXR API changes
    const pose = 'getDevicePose' in frame ?
        (frame as any).getDevicePose(this[$refSpace]) :
        (frame as any).getViewerPose(this[$refSpace]);

    // TODO: Notify external observers of tick
    // TODO: Note that reticle may be "stabilized"

    this[$tick]();

    if (pose == null) {
      return;
    }

    for (const view of (frame as any).views) {
      const viewport = (session.baseLayer as XRWebGLLayer).getViewport(view);
      this.renderer!.setViewport(0, 0, viewport.width, viewport.height);
      this.renderer!.setSize(viewport.width, viewport.height, false);
      this.camera.projectionMatrix.fromArray(view.projectionMatrix);
      const viewMatrix = matrix4.fromArray(pose.getViewMatrix(view));

      this.camera.matrix.getInverse(viewMatrix);
      this.camera.updateMatrixWorld(true);

      // NOTE: Updating input or the reticle is dependent on the camera's
      // pose, hence updating these elements after camera update but
      // before render.
      this.reticle.update(this[$currentSession]!, this[$refSpace] as any);
      this.processXRInput(frame);

      // NOTE: Clearing depth caused issues on Samsung devices
      // @see https://github.com/googlecodelabs/ar-with-webxr/issues/8
      // this.renderer.clearDepth();
      this.renderer!.render(this.scene, this.camera);
    }
  }
}
