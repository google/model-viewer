import {Matrix4, Object3D, PerspectiveCamera, Raycaster, Scene, Vector3, WebGLRenderer} from 'three';

import {assertIsArCandidate} from '../utils.js';

import Reticle from './Reticle.js';
import Shadow from './Shadow.js';

const $initializeRenderer = Symbol('initializeRenderer');
const $resolveARSession = Symbol('resolveARSession');
const $resolveDevice = Symbol('resolveDevice');

const $presentedScene = Symbol('presentedScene');
const $dolly = Symbol('dolly');
const $scene = Symbol('scene');
const $renderer = Symbol('renderer');
const $device = Symbol('device');
const $devicePromise = Symbol('devicePromise');
const $rafId = Symbol('rafId');
const $currentSession = Symbol('currentSession');
const $tick = Symbol('tick');
const $frameOfReference = Symbol('frameOfReference');
const $reticle = Symbol('reticle');
const $camera = Symbol('camera');
const $raycaster = Symbol('raycaster');

const $inputCanvas = Symbol('inputCanvas');
const $inputContext = Symbol('inputContext');

const $outputCanvas = Symbol('outputCanvas');
const $outputContext = Symbol('outputContext');

const $onWebXRFrame = Symbol('onWebXRFrame');
const $onOutputCanvasClick = Symbol('onOutputCanvasClick');
const $onFullscreenchange = Symbol('onFullscreenchange');

const matrix4 = new Matrix4();
const vector3 = new Vector3();
const originArray = new Float32Array(3);
const directionArray = new Float32Array(3);

export class ARRenderer {
  /**
   * Given an inline Renderer, construct an ARRenderer and return it
   */
  static fromInlineRenderer(renderer) {
    return new ARRenderer(renderer.canvas, renderer.context);
  }

  constructor(inputCanvas, inputContext) {
    this[$renderer] = null;

    this[$inputCanvas] = inputCanvas;
    this[$inputContext] = inputContext;

    this[$camera] = new PerspectiveCamera();
    this[$camera].matrixAutoUpdate = false;

    this[$scene] = new Scene();
    this[$dolly] = new Object3D();
    this[$reticle] = new Reticle(this[$camera]);

    this[$scene].add(this[$reticle]);
    this[$scene].add(this[$dolly]);

    this[$rafId] = null;
    this[$currentSession] = null;
    this[$frameOfReference] = null;
    this[$presentedScene] = null;
    this[$outputCanvas] = null;
    this[$outputContext] = null;

    this[$device] = null;

    // TODO(cdata): can we actually cache this? What if I plug a device in after
    // this value has been cached?
    this[$devicePromise] = this[$resolveDevice]()
                               .then((device) => {
                                 return this[$device] = device;
                               })
                               .catch((error) => {
                                 console.error(error);
                                 console.warn('Browser AR will be disabled');
                               });
  }

  [$initializeRenderer]() {
    if (this[$renderer] != null) {
      return;
    }

    this[$renderer] = new WebGLRenderer(
        {canvas: this[$inputCanvas], context: this[$inputContext]});
    this[$renderer].setSize(window.innerWidth, window.innerHeight);
    this[$renderer].setPixelRatio(1);
    this[$renderer].autoClear = false;
    this[$renderer].gammaInput = true;
    this[$renderer].gammaOutput = true;
    this[$renderer].gammaFactor = 2.2;
  }

  async[$resolveDevice]() {
    assertIsArCandidate();

    return await navigator.xr.requestDevice();
  }

  async[$resolveARSession]() {
    assertIsArCandidate();

    const renderer = this[$renderer];
    const device = this[$device];

    const session = await device.requestSession(
        {environmentIntegration: true, outputContext: this.outputContext});

    const gl = renderer.getContext();

    await gl.setCompatibleXRDevice(device);
    session.baseLayer = new XRWebGLLayer(session, gl, {alpha: true});
    renderer.setFramebuffer(session.baseLayer.framebuffer);

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

      const device = await this[$devicePromise];
      await device.supportsSession(
          {environmentIntegration: true, outputContext: this.outputContext});

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Present a scene in AR
   */
  async present(scene) {
    if (this.isPresenting) {
      console.warn('Cannot present while a model is already presenting');
      return;
    }

    this[$presentedScene] = scene;

    this[$initializeRenderer]();

    this[$currentSession] = await this[$resolveARSession]();
    this[$frameOfReference] =
        await this[$currentSession].requestFrameOfReference('eye-level');

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

    try {
      const session = this[$currentSession];
      this[$currentSession] = null;
      session.cancelAnimationFrame(this[$rafId]);

      await session.end();
    } catch (error) {
      console.warn('Error while trying to end AR session');
      console.error(error);
    }

    this[$dolly].remove(this[$presentedScene]);

    this[$frameOfReference] = null;
    this[$presentedScene] = null;

    this.outputCanvas.remove();
  }

  /**
   * True if a scene is currently in the process of being presented in AR
   */
  get isPresenting() {
    return this[$presentedScene] != null;
  }

  get outputCanvas() {
    if (this[$outputCanvas] == null) {
      this[$outputCanvas] = document.createElement('canvas');
      this[$outputCanvas].setAttribute('style', `
display: block;
position: absolute;
top: 0px;
left: 0px;
width: 100%;
height: 100%;`);
      this[$outputCanvas].addEventListener(
          'click', () => this[$onOutputCanvasClick]());
    }

    return this[$outputCanvas];
  }

  get outputContext() {
    if (this[$outputContext] == null) {
      this[$outputContext] = this.outputCanvas.getContext('xrpresent');
    }

    return this[$outputContext];
  }


  async[$onOutputCanvasClick]() {
    if (this[$currentSession] == null) {
      return;
    }

    if (this[$raycaster] == null) {
      this[$raycaster] = new Raycaster();
    }

    const raycaster = this[$raycaster];
    const camera = this[$camera];
    const scene = this[$scene];
    const dolly = this[$dolly];
    const presentedScene = this[$presentedScene];

    const x = 0;
    const y = 0;
    raycaster.setFromCamera({x, y}, camera);

    const ray = raycaster.ray;
    originArray.set(ray.origin.toArray());
    directionArray.set(ray.direction.toArray());
    const hits = await this[$currentSession].requestHitTest(
        originArray, directionArray, this[$frameOfReference]);
    if (hits.length) {
      const hit = hits[0];
      const hitMatrix = matrix4.fromArray(hit.hitMatrix);

      dolly.position.setFromMatrixPosition(hitMatrix);

      const targetPos = vector3.setFromMatrixPosition(camera.matrixWorld);
      const angle = Math.atan2(
          targetPos.x - presentedScene.position.x,
          targetPos.z - presentedScene.position.z);

      dolly.rotation.set(0, -presentedScene.pivot.rotation.y, 0);
      dolly.add(presentedScene);
    }
  }

  [$tick]() {
    this[$rafId] = this[$currentSession].requestAnimationFrame(
        (time, frame) => this[$onWebXRFrame](time, frame));
  }

  [$onWebXRFrame](time, frame) {
    const {session} = frame;
    const pose = frame.getDevicePose(this[$frameOfReference]);

    this[$reticle].update(this[$currentSession], this[$frameOfReference]);

    // TODO: Notify external observers of tick
    // TODO: Note that reticle may be "stabilized"

    this[$tick]();

    if (pose == null) {
      return;
    }

    const renderer = this[$renderer];
    const camera = this[$camera];
    const scene = this[$scene];

    for (const view of frame.views) {
      const viewport = session.baseLayer.getViewport(view);
      renderer.setViewport(0, 0, viewport.width, viewport.height);
      renderer.setSize(viewport.width, viewport.height);
      camera.projectionMatrix.fromArray(view.projectionMatrix);
      const viewMatrix = matrix4.fromArray(pose.getViewMatrix(view));

      camera.matrix.getInverse(viewMatrix);
      camera.updateMatrixWorld(true);
      renderer.clearDepth();
      renderer.render(scene, camera);
    }
  }
}
