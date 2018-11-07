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

import {Composer} from '@jsantell/wagner';
import FXAAPass from '@jsantell/wagner/src/passes/FXAAPass.js';
import VignettePass from '@jsantell/wagner/src/passes/VignettePass.js';
import {EventDispatcher, WebGLRenderer} from 'three';

import {IS_AR_CANDIDATE, isMobile} from '../utils.js';
import {$tick} from '../xr-model-element-base.js';

import {ARRenderer} from './ARRenderer.js';

const USE_POST_PROCESSING = false;  //! isMobile();
const GAMMA_FACTOR = 2.2;
const DPR = window.devicePixelRatio;

export const $arRenderer = Symbol('arRenderer');

/**
 * Registers canvases with Canvas2DRenderingContexts and renders them
 * all in the same WebGLRenderingContext, spitting out textures to apply
 * to the canvases. Creates a fullscreen WebGL canvas that is not added
 * to the DOM, and on each frame, renders each registered canvas on a portion
 * of the WebGL canvas, and applies the texture on the registered canvas.
 *
 * In the future, can use ImageBitmapRenderingContext instead of
 * Canvas2DRenderingContext if supported for cheaper transfering of
 * the texture.
 */
export default class Renderer extends EventDispatcher {
  constructor() {
    super();
    this.canvas = document.createElement('canvas');
    this.context = this.canvas.getContext(
        'webgl', {antialias: true, alpha: true, preserveDrawingBuffer: true});
    this.renderer =
        new WebGLRenderer({canvas: this.canvas, context: this.context});
    this.renderer.setPixelRatio(DPR);
    this.renderer.shadowMap.enabled = true;
    this.renderer.gammaInput = true;
    this.renderer.gammaOutput = true;
    this.renderer.gammaFactor = GAMMA_FACTOR;

    this.composer = new Composer(this.renderer);
    // Not sure why onBeforeRender doesn't exist, probably
    // a dependency mismatch?
    this.composer.scene.onBeforeRender = () => {};
    this.vignettePass = new VignettePass({boost: 1.1, reduction: 0.7});
    this.fxaaPass = new FXAAPass();
    this.passes = [
      this.vignettePass,
      this.fxaaPass,
    ];

    this[$arRenderer] = ARRenderer.fromInlineRenderer(this);

    this.scenes = new Set();
    this.scenesRendered = 0;
    this.setRendererSize(1, 1);
    this.lastTick = performance.now();
  }

  setRendererSize(width, height) {
    this.renderer.setSize(width, height, false);
    this.width = width;
    this.height = height;
  }

  registerScene(scene) {
    this.scenes.add(scene);
    if (this.scenes.size > 0) {
      this.renderer.setAnimationLoop((time) => this.render(time));
    }
  }

  unregisterScene(scene) {
    this.scenes.delete(scene);
    if (this.scenes.size === 0) {
      this.renderer.setAnimationLoop(null);
    }
  }

  async supportsPresentation() {
    return this[$arRenderer].supportsPresentation();
  }

  get presentedScene() {
    return this[$arRenderer].presentedScene;
  }

  async present(scene) {
    try {
      return await this[$arRenderer].present(scene);
    } catch (error) {
      this[$arRenderer].stopPresenting();
      throw error;
    } finally {
      // NOTE(cdata): Setting width and height to 0 will have the effect of
      // invoking a `setSize` the next time we render in this renderer
      this.width = this.height = 0;
    }
  }

  stopPresenting() {
    return this[$arRenderer].stopPresenting();
  }

  render(t) {
    if (this[$arRenderer] != null && this[$arRenderer].isPresenting) {
      return;
    }

    this.scenesRendered = 0;

    const delta = t - this.lastTick;

    for (let scene of this.scenes) {
      const {element, width, height, context} = scene;
      element[$tick](t, delta);

      if (!scene.isVisible || !scene.isDirty || scene.paused) {
        continue;
      }

      const camera = scene.getCamera();

      this.renderer.clear();
      if (width > this.width || height > this.height) {
        const maxWidth = Math.max(width, this.width);
        const maxHeight = Math.max(height, this.height);
        this.setRendererSize(maxWidth, maxHeight, false);
      }

      this.renderer.setViewport(0, 0, width, height);

      if (USE_POST_PROCESSING) {
        this.composer.reset();
        this.composer.render(scene, camera);
        for (let pass of this.passes) {
          this.composer.pass(pass);
        }
        this.composer.toScreen();
      } else {
        this.renderer.render(scene, camera);
      }

      const widthDPR = width * DPR;
      const heightDPR = height * DPR;
      context.drawImage(
          this.renderer.domElement,
          0,
          0,
          widthDPR,
          heightDPR,
          0,
          0,
          widthDPR,
          heightDPR);

      scene.isDirty = false;
      this.scenesRendered++;
    }
    this.lastTick = t;
  }
}
