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
  Scene,
  PerspectiveCamera,
  DirectionalLight,
  Object3D,
  AmbientLight,
  PCFSoftShadowMap,
  Box3,
  Vector3,
  Color,
} from 'three';

import Composer from 'wagner/src/Composer.js';
import BloomPass from 'wagner/src/passes/bloom/MultiPassBloomPass.js';
import VignettePass from 'wagner/src/passes/vignette/VignettePass.js';
import FXAAPass from 'wagner/src/passes/fxaa/FXAAPass.js';
import DOFPass from 'wagner/src/passes/dof/DOFPass.js';
import Shadow from '../three-components/Shadow.js';
import OrbitControls from 'orbit-controls';

import { isMobile } from '../utils.js';

const USE_POST_PROCESSING = !isMobile();
const DEFAULT_BACKGROUND_COLOR = new Color(0xffffff);

export default class DOMModelView {
  constructor({ canvas, context, model, width, height }) {
    this.context = context;
    this.canvas = canvas;
    this.model = model;
    this.enabled = false;
    this.render = this.render.bind(this);

    this.renderer = new WebGLRenderer({ canvas, context });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(width, height);
    this.renderer.setClearColor(DEFAULT_BACKGROUND_COLOR);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.renderer.gammaInput = true;
    this.renderer.gammaOutput = true;
    this.renderer.gammaFactor = 2.2;

    this.camera = new PerspectiveCamera(45, width / height, 0.1, 100);
    this.orbitCamera = new PerspectiveCamera(45, width / height, 0.1, 100);
    this.controls = new OrbitControls(this.orbitCamera, this.canvas);
    this.controls.target = new Vector3(0, 5, 0);

    this.scene = new Scene();
    this.scene.add(this.model);

    this.light = new AmbientLight(0xffffff, 0.9);
    this.dLight = new DirectionalLight(0xffffff, 2);
    this.dLight.position.set(0, 10, 1);
    this.dLight.castShadow = true;
    this.scene.add(this.light);
    this.scene.add(this.dLight);

    this.scene.add(new Shadow());

    this.rotateEnabled = false;

    this.pivot = new Object3D();
    this.pivot.add(this.camera);
    this.pivot.add(this.orbitCamera);
    this.scene.add(this.pivot);
    this.camera.position.z = 15;
    this.camera.position.y = 5;
    this.orbitCamera.position.z = 15;
    this.orbitCamera.position.y = 5;

    this.composer = new Composer(this.renderer);
    // Not sure why onBeforeRender doesn't exist, probably
    // a dependency mismatch?
    this.composer.scene.onBeforeRender = () => {};
    this.bloomPass = new BloomPass({
      blurAmount: 0.05,
    });
    this.vignettePass = new VignettePass(1.1, 0.7);
    this.fxaaPass = new FXAAPass();
    this.passes = [
      // this.bloomPass,
      this.vignettePass,
      this.fxaaPass,
    ];
  }

  start() {
    this.enabled = true;
    this.scene.add(this.model);
    this.renderer.setFramebuffer(null);
    this._tick();
  }

  stop() {
    this.enabled = false;
    window.cancelAnimationFrame(this.lastFrameId);
  }

  setSize(width, height) {
    if (!this.enabled) {
      return;
    }
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.orbitCamera.aspect = width / height;
    this.orbitCamera.updateProjectionMatrix();
  }

  setRotate(isEnabled) {
    this.rotateEnabled = isEnabled;
    if (!isEnabled) {
      this.pivot.rotation.set(0, 0, 0);
    }
  }

  setControls(isEnabled) {
    this.controls.enabled = isEnabled;

    if (this.controls.enabled) {
      this.orbitCamera.position.set(0, 5, 15);
      this.orbitCamera.rotation.set(0, 0, 0);
    }
  }

  setVignette(isEnabled) {
    this.vignetteEnabled = isEnabled;
  }

  setBackgroundColor(color) {
    if (color && typeof color === 'string') {
      this.renderer.setClearColor(new Color(color));
    } else {
      this.renderer.setClearColor(DEFAULT_BACKGROUND_COLOR);
    }
  }

  render() {
    if (!this.enabled) {
      return;
    }

    if (this.rotateEnabled) {
      this.pivot.rotation.y += 0.001;
    }

    const camera = this.controls.enabled ? this.orbitCamera : this.camera;

    // If we're not on mobile, and a pass is enabled,
    // use post processing
    if (USE_POST_PROCESSING && this.vignetteEnabled) {
      this.composer.reset();
      this.composer.render(this.scene, camera);
      for (let pass of this.passes) {
        this.composer.pass(pass);
      }
      this.composer.toScreen();
    } else {
      this.renderer.render(this.scene, camera);
    }

    this._tick();
  }

  _tick() {
    this.lastFrameId = window.requestAnimationFrame(this.render);
  }
}
