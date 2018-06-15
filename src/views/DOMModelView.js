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
} from 'three';

import Shadow from '../three-components/Shadow.js';
import { Composer } from '../lib/wagner/index.js';
import VignettePass from '../lib/wagner/src/passes/vignette/VignettePass.js';
import OrbitControls from '../../third_party/three/OrbitControls.js';

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
    this.renderer.setClearColor(0xeeeeee);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.renderer.gammaInput = true;
    this.renderer.gammaOutput = true;
    this.renderer.gammaFactor = 2.2;

    this.camera = new PerspectiveCamera(45, width / height, 0.1, 100);
    this.controls = new OrbitControls(this.camera, this.canvas);
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

    // Set up post processing
    this.composer = new Composer(this.renderer);
    // Not sure why onBeforeRender doesn't exist, probably
    // a dependency mismatch?
    this.composer.scene.onBeforeRender = () => {};
    this.vignettePass = new VignettePass(1.1, 0.3);

    this.pivot = new Object3D();
    this.pivot.add(this.camera);
    this.scene.add(this.pivot);
    this.camera.position.z = 15;
    this.camera.position.y = 5;
  }

  start() {
    this.enabled = true;
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
  }

  render() {
    if (!this.enabled) {
      return;
    }

    this.pivot.rotation.y += 0.001;

    this.composer.reset();
    this.composer.render(this.scene, this.camera);
    this.composer.pass(this.vignettePass);
    this.composer.toScreen();

    this._tick();
  }

  _tick() {
    this.lastFrameId = window.requestAnimationFrame(this.render);
  }
}
