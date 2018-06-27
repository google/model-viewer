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

import {
  WebGLRenderer,
  PCFSoftShadowMap,
  EventDispatcher,
  Scene,
  PerspectiveCamera,
  AmbientLight,
  DirectionalLight,
  Matrix4,
  Raycaster,
  Vector3,
} from 'three';
import Reticle from '../three-components/Reticle.js';
import Shadow from '../three-components/Shadow.js';
import screenfull from 'screenfull';

/**
 * Creates an AR model placement experience with WebXR.
 */
export default class ARView extends EventDispatcher {
  /**
   * @param {Object} config
   * @param {HTMLCanvasElement} config.canvas
   * @param {WebGLRenderingContext} config.context
   * @param {THREE.Object3D} config.model
   */
  constructor({ canvas, context, model }) {
    super();
    this.context = context;
    this.canvas = canvas;
    this.model = model;

    this.onTap = this.onTap.bind(this);
    this.onFrame = this.onFrame.bind(this);
    this.onFullscreenChange = this.onFullscreenChange.bind(this);

    if (this.hasAR()) {
      screenfull.on('change', this.onFullscreenChange);

      this._devicePromise = navigator.xr.requestDevice();
      this._devicePromise.then(device => this.device = device);
    }
  }

  /**
   * Returns a boolean indicating whether or not
   * the browser is capable of running the AR experience
   * (WebXR AR features, fullscreen)
   *
   * @return {Boolean}
   */
  hasAR() {
    return !!(screenfull &&
              screenfull.enabled &&
              navigator.xr &&
              window.XRSession &&
              window.XRSession.prototype.requestHitTest);
  }

  /**
   * Returns a promise that is resolved once an XRDevice
   * is found.
   *
   * @return {Promise<XRDevice>}
   */
  whenARReady() {
    return this.hasAR() ? this._devicePromise : Promise.reject();
  }

  /**
   * Starts rendering the AR viewer.
   *
   * @return {Promise<undefined>}
   */
  start() {
    if (!this.hasAR() || this.enabled) {
      return;
    }

    if (!this.device) {
      throw new Error('Must wait until XRDevice found; use `await arView.whenARReady()` first.');
    }

    this.enabled = true;
    this.stabilized = false;
    this._setupCanvas();
    this._setupScene();
    this._setupRenderer();
    this._showCanvas();
    this._enterFullscreen();

    return this._setupSession().then(() => {
      this._tick();
    });
  }

  /**
   * Stops rendering the AR viewer.
   */
  stop() {
    if (!this.hasAR() || !this.enabled) {
      return;
    }
    this.enabled = false;
    if (this.session) {
      this.session.cancelAnimationFrame(this.lastFrameId);
      this._hideCanvas();
      const ending = this.session.end();
      this.session = null;
      ending.then(() => this.dispatchEvent({ type: 'end' }));
    }
  }

  /**
   * Used to request the next animation frame.
   */
  _tick() {
    this.lastFrameId = this.session.requestAnimationFrame(this.onFrame);
  }

  /**
   * On WebXR render frame.
   *
   * @param {Number} time
   * @param {XRPresentationFrame} frame
   */
  onFrame(time, frame) {
    let session = frame.session;
    let pose = frame.getDevicePose(this.frameOfRef);

    this.reticle.update(this.frameOfRef);

    if (this.reticle.visible && !this.stabilized) {
      this.stabilized = true;
      this.dispatchEvent({ type: 'stabilized' });
    }

    this._tick();

    if (pose) {
      for (let view of frame.views) {
        const viewport = session.baseLayer.getViewport(view);
        this.renderer.setViewport(0, 0, viewport.width, viewport.height);
        this.renderer.setSize(viewport.width, viewport.height);
        this.camera.projectionMatrix.fromArray(view.projectionMatrix);
        const viewMatrix = new Matrix4().fromArray(pose.getViewMatrix(view));
        this.camera.matrix.getInverse(viewMatrix);
        this.camera.updateMatrixWorld(true);
        this.renderer.clearDepth();
        this.renderer.render(this.scene, this.camera);
      }
    }
  }

  /**
   * Sets up the output canvas.
   */
  _setupCanvas() {
    if (!this.outputContext) {
      this.outputCanvas = document.createElement('canvas');
      this.outputCanvas.style.position = 'absolute';
      this.outputCanvas.style.top = '0';
      this.outputCanvas.style.left = '0';
      this.outputCanvas.style.height = '100%';
      this.outputCanvas.style.width = '100%';
      this.outputContext = this.outputCanvas.getContext('xrpresent');

      this.outputCanvas.addEventListener('click', this.onTap);

      // Cannot make the XRPresentationContext canvas fullscreen
      // directly due to bug, so put it in a wrapper.
      // https://bugs.chromium.org/p/chromium/issues/detail?id=853324
      this.container = document.createElement('div');
      this.container.setAttribute('xr-model-component-canvas', '');
      this.container.appendChild(this.outputCanvas);
      document.body.appendChild(this.container);
    }
  }

  /**
   * Sets up the THREE.WebGLRenderer.
   */
  _setupRenderer() {
    this.renderer = new WebGLRenderer({
      context: this.context,
      canvas: this.canvas,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(1);
    this.renderer.autoClear = false;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.renderer.gammaInput = true;
    this.renderer.gammaOutput = true;
    this.renderer.gammaFactor = 2.2;

    this.gl = this.renderer.getContext();

    this.camera = new PerspectiveCamera();
    this.camera.matrixAutoUpdate = false;
  }

  /**
   * Sets up the THREE.Scene.
   */
  _setupScene() {
    this.scene = new Scene();

    const light = new AmbientLight(0xffffff, 1);
    this.scene.add(light);

    const directionalLight = new DirectionalLight(0xffffff, 0.3);
    directionalLight.position.set(1000, 1000, 1000);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);

    this.shadow = new Shadow();
    this.scene.add(this.shadow);
  }

  /**
   * Sets up a new XRSession.
   */
  async _setupSession() {
    this.session = await this.device.requestSession({
      outputContext: this.outputContext,
    });

    await this.gl.setCompatibleXRDevice(this.device);

    this.session.baseLayer = new XRWebGLLayer(this.session, this.gl, {
      alpha: true,
    });

    this.reticle = new Reticle(this.session, this.camera);
    this.scene.add(this.reticle);

    this.renderer.setFramebuffer(this.session.baseLayer.framebuffer);
    this.frameOfRef = await this.session.requestFrameOfReference('eye-level');
  }

  /**
   * Hides the output canvas.
   */
  _hideCanvas() {
    if (this.container) {
      this.container.style.display = 'none';
    }
  }

  /**
   * Shows the output canvas.
   */
  _showCanvas() {
    if (this.container) {
      this.container.style.display = 'block';
    }
  }

  /**
   * Enters fullscreen.
   */
  _enterFullscreen() {
    if (screenfull.isFullscreen) {
      throw new Error('Another element is already fullscreen');
    }
    screenfull.request(this.container);
  }

  /**
   * Fired when fullscreen state changes.
   */
  onFullscreenChange() {
    // If leaving fullscreen mode, and we're still in AR mode,
    // shut down AR mode
    if (!screenfull.isFullscreen && this.enabled) {
      this.stop();
    }
  }

  /**
   * Fired when the screen is touched when viewing
   * the model in AR.
   */
  async onTap() {
    if (!this.enabled || !this.session) {
      return;
    }

    const x = 0;
    const y = 0;
    this.raycaster = this.raycaster || new Raycaster();
    this.raycaster.setFromCamera({ x, y }, this.camera);

    const ray = this.raycaster.ray;
    const origin = new Float32Array(ray.origin.toArray());
    const direction = new Float32Array(ray.direction.toArray());
    const hits = await this.session.requestHitTest(origin,
                                                   direction,
                                                   this.frameOfRef);
    if (hits.length) {
      const hit = hits[0];
      const hitMatrix = new Matrix4().fromArray(hit.hitMatrix);
      this.model.position.setFromMatrixPosition(hitMatrix);

      const targetPos = new Vector3().setFromMatrixPosition(this.camera.matrixWorld);
      const angle = Math.atan2(targetPos.x - this.model.position.x,
                               targetPos.z - this.model.position.z);
      this.model.rotation.set(0, angle, 0);

      this.scene.add(this.model);
      this.shadow.position.y = this.model.position.y;
    }
  }
}
