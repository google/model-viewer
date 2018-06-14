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
  Vector3
} from 'three';
import Reticle from '../three-components/Reticle.js';
import Shadow from '../three-components/Shadow.js';
import WAGNER from '../lib/wagner';
import VignettePass from '../lib/wagner/src/passes/vignette/VignettePass.js';

export default class ARView extends EventDispatcher {
  constructor({ canvas, model }) {
    super();
    this.canvas = canvas;
    this.model = model;

    this.onTap = this.onTap.bind(this);
    this.onFrame = this.onFrame.bind(this);
    this.onModelLoad = this.onModelLoad.bind(this);
    this.model.addEventListener('model-load', this.onModelLoad);
  }

  start() {
    this.enabled = true;
    this.model.scale.set(1, 1, 1);
    this._setupScene();
    this._setupRenderer();
    this._showCanvas();
    this.scene.remove(this.model);
    this.enterAR();
  }

  async stop() {
    this.enabled = false;
    if (this.session) {
      this.session.cancelAnimationFrame(this.lastFrameId);
      this._showCanvas = false;
      this.session.end();
      this.session = null;
    }
  }

  onModelLoad() {
    if (this.enabled) {
      this.model.scale.set(1, 1, 1);
    }
  }

  async enterAR() {
    this.stabilized = false;
    if (!this.device) {
      this.device = await navigator.xr.requestDevice();
    }

    if (!this.outputContext) {
      this.outputCanvas = document.createElement('canvas');
      this.outputCanvas.style.position = 'absolute';
      this.outputCanvas.style.top = '0';
      this.outputCanvas.style.left = '0';
      this.outputCanvas.style.height = '100%';
      this.outputCanvas.style.width = '100%';
      this.outputContext = this.outputCanvas.getContext('xrpresent');

      this.outputCanvas.addEventListener('click', this.onTap);

      document.body.appendChild(this.outputCanvas);
    }

    await this._setupSession();
    this._tick();
  }

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

  _tick() {
    this.lastFrameId = this.session.requestAnimationFrame(this.onFrame);
  }

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

  _setupRenderer() {
    if (this.renderer) {
      return this.renderer;
    }

    this.renderer = new WebGLRenderer({
      alpha: true,
      preserveDrawingBuffer: true,
      canvas: this.canvas,
    });
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

  _setupScene() {
    if (this.scene) {
      return this.scene;
    }

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

  async _setupSession() {
    this.session = await this.device.requestSession({
      outputContext: this.outputContext,
    });

    await this.gl.setCompatibleXRDevice(this.device);

    this.session.baseLayer = new XRWebGLLayer(this.session, this.gl);

    if (this.reticle) {
      this.scene.remove(this.reticle);
    }
    this.reticle = new Reticle(this.session, this.camera);
    this.scene.add(this.reticle);

    this.renderer.setFramebuffer(this.session.baseLayer.framebuffer);
    this.frameOfRef = await this.session.requestFrameOfReference('eyeLevel');
  }

  _hideCanvas() {
    this.outputCanvas.style.display = 'none';
  }

  _showCanvas() {
    this.outputCanvas.style.display = 'block';
  }
}
