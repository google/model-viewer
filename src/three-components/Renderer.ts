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

import {ACESFilmicToneMapping, EventDispatcher, WebGLRenderer} from 'three';

import {IS_WEBXR_AR_CANDIDATE} from '../constants.js';
import {$tick} from '../model-viewer-base.js';
import {resolveDpr} from '../utilities.js';

import {ARRenderer} from './ARRenderer.js';
import ModelScene from './ModelScene.js';
import TextureUtils from './TextureUtils.js';
import * as WebGLUtils from './WebGLUtils.js';

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
  public renderer!: WebGLRenderer;
  public context!: WebGLRenderingContext|null;
  public canvas: HTMLCanvasElement;
  public textureUtils: TextureUtils|null;
  public width: number = 0;
  public height: number = 0;

  private[$arRenderer]: ARRenderer;
  private scenes: Set<ModelScene> = new Set();
  private lastTick: number;

  get canRender() {
    return this.renderer != null && this.context != null;
  }

  constructor() {
    super();

    const webGlOptions = {alpha: false, antialias: true};

    // Only enable certain options when Web XR capabilities are detected:
    if (IS_WEBXR_AR_CANDIDATE) {
      Object.assign(webGlOptions, {alpha: true, preserveDrawingBuffer: true});
    }

    this.canvas = document.createElement('canvas');
    // Need to support both 'webgl' and 'experimental-webgl' (IE11).
    try {
      this.context = WebGLUtils.getContext(this.canvas, webGlOptions);

      // Patch the gl context's extension functions before passing
      // it to three.
      WebGLUtils.applyExtensionCompatibility(this.context);

      this.renderer = new WebGLRenderer({
        canvas: this.canvas,
        context: this.context,
      });
      this.renderer.autoClear = false;
      this.renderer.gammaOutput = true;
      this.renderer.gammaFactor = 2.2;
      this.renderer.physicallyCorrectLights = true;
      this.renderer.setPixelRatio(resolveDpr());

      // ACESFilmicToneMapping appears to be the most "saturated",
      // and similar to Filament's gltf-viewer.
      this.renderer.toneMapping = ACESFilmicToneMapping;
    } catch (error) {
      this.context = null;
      console.warn(error);
    }

    this[$arRenderer] = ARRenderer.fromInlineRenderer(this);
    this.textureUtils = this.canRender ?
        new TextureUtils(this.renderer, {pmremSamples: 128}) :
        null;

    this.setRendererSize(1, 1);
    this.lastTick = performance.now();
  }

  setRendererSize(width: number, height: number) {
    if (this.canRender) {
      this.renderer.setSize(width, height, false);
    }

    this.width = width;
    this.height = height;
  }

  registerScene(scene: ModelScene) {
    this.scenes.add(scene);
    if (this.canRender && this.scenes.size > 0) {
      this.renderer.setAnimationLoop((time: number) => this.render(time));
    }
  }

  unregisterScene(scene: ModelScene) {
    this.scenes.delete(scene);
    if (this.canRender && this.scenes.size === 0) {
      (this.renderer.setAnimationLoop as any)(null);
    }
  }

  async supportsPresentation() {
    return this.canRender && this[$arRenderer].supportsPresentation();
  }

  get presentedScene() {
    return this[$arRenderer].presentedScene;
  }

  async present(scene: ModelScene): Promise<HTMLCanvasElement> {
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

  stopPresenting(): Promise<void> {
    return this[$arRenderer].stopPresenting();
  }

  get isPresenting(): boolean {
    return this[$arRenderer] != null && this[$arRenderer].isPresenting;
  }

  render(t: number) {
    if (!this.canRender || this.isPresenting) {
      return;
    }

    const delta = t - this.lastTick;
    const dpr = resolveDpr();

    if (dpr !== this.renderer.getPixelRatio()) {
      this.renderer.setPixelRatio(dpr);
    }

    for (let scene of this.scenes) {
      const {element, width, height, context} = scene;
      element[$tick](t, delta);

      if (!scene.isVisible || !scene.isDirty || scene.paused) {
        continue;
      }

      const camera = scene.getCamera();

      if (width > this.width || height > this.height) {
        const maxWidth = Math.max(width, this.width);
        const maxHeight = Math.max(height, this.height);
        this.setRendererSize(maxWidth, maxHeight);
      }

      const {exposure} = scene;
      const exposureIsNumber =
          typeof exposure === 'number' && !(self as any).isNaN(exposure);
      this.renderer.toneMappingExposure = exposureIsNumber ? exposure : 1.0;

      // Need to set the render target in order to prevent
      // clearing the depth from a different buffer -- possibly
      // from something in
      this.renderer.setRenderTarget(null);
      this.renderer.clearDepth();
      this.renderer.setViewport(0, 0, width, height);
      this.renderer.render(scene, camera);

      const widthDPR = width * dpr;
      const heightDPR = height * dpr;
      context.drawImage(
          this.renderer.domElement,
          0,
          Math.max(0, this.canvas.height - heightDPR),
          widthDPR,
          heightDPR,
          0,
          0,
          widthDPR,
          heightDPR);

      scene.isDirty = false;
    }
    this.lastTick = t;
  }

  dispose() {
    if (this.textureUtils != null) {
      this.textureUtils.dispose();
    }

    if (this.renderer != null) {
      this.renderer.dispose();
    }

    this.textureUtils = null;
    (this as any).renderer = null;

    this.scenes.clear();
  }
}
