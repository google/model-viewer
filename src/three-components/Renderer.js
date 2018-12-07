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

import {EventDispatcher, WebGLRenderer} from 'three';

import {IS_AR_CANDIDATE} from '../constants.js';
import {$tick} from '../model-viewer-base.js';
import {resolveDpr} from '../utils.js';

import {ARRenderer} from './ARRenderer.js';
import TextureUtils from './TextureUtils.js';
import * as WebGLUtils from './WebGLUtils.js';

const GAMMA_FACTOR = 2.2;

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

    const webGlOptions = {antialias: true};

    // TODO: hook to transparent attribute
    cosnt isTransparent = true;

    // Only enable certain options when Web XR capabilities are detected:
    if (IS_AR_CANDIDATE || isTransparent) {
      Object.assign(webGlOptions, {alpha: true, preserveDrawingBuffer: true});
    }

    this.canvas = document.createElement('canvas');
    // Need to support both 'webgl' and 'experimental-webgl' (IE11).
    this.context = WebGLUtils.getContext(this.canvas, webGlOptions);
    // Patch the gl context's extension functions before passing
    // it to three.
    WebGLUtils.applyExtensionCompatibility(this.context);

    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      context: this.context,
    });
    // TODO: hook to transparent attribute
    this.renderer.autoClear = isTransparent;
    this.renderer.gammaOutput = true;
    this.renderer.gammaFactor = GAMMA_FACTOR;
    this.renderer.setPixelRatio(resolveDpr());

    this[$arRenderer] = ARRenderer.fromInlineRenderer(this);
    this.textureUtils = new TextureUtils(this.renderer);

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

  get isPresenting() {
    return this[$arRenderer] != null && this[$arRenderer].isPresenting;
  }

  render(t) {
    if (this.isPresenting) {
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

      this.renderer.clearDepth();
      if (width > this.width || height > this.height) {
        const maxWidth = Math.max(width, this.width);
        const maxHeight = Math.max(height, this.height);
        this.setRendererSize(maxWidth, maxHeight, false);
      }

      this.renderer.setViewport(0, 0, width, height);
      this.renderer.render(scene, camera);

      const dpr = resolveDpr();
      const widthDPR = width * dpr;
      const heightDPR = height * dpr;
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

  dispose() {
    super.dispose();
    this.textureUtils.dispose();
    this.textureUtils = null;
  }
}
