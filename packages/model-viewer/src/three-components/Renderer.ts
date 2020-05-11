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

import {ACESFilmicToneMapping, Event, EventDispatcher, GammaEncoding, PCFSoftShadowMap, WebGLRenderer} from 'three';

import {IS_WEBXR_AR_CANDIDATE, USE_OFFSCREEN_CANVAS} from '../constants.js';
import {$canvas, $tick, $updateSize, $userInputElement} from '../model-viewer-base.js';
import {isDebugMode, resolveDpr} from '../utilities.js';

import {ARRenderer} from './ARRenderer.js';
import {Debugger} from './Debugger.js';
import {ModelScene} from './ModelScene.js';
import TextureUtils from './TextureUtils.js';
import * as WebGLUtils from './WebGLUtils.js';

export interface RendererOptions {
  debug?: boolean;
}

export interface ContextLostEvent extends Event {
  type: 'contextlost';
  sourceEvent: WebGLContextEvent;
}

export const $arRenderer = Symbol('arRenderer');
const $dpr = Symbol('dpr');

const $onWebGLContextLost = Symbol('onWebGLContextLost');
const $webGLContextLostHandler = Symbol('webGLContextLostHandler');
const $singleton = Symbol('singleton');

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
export class Renderer extends EventDispatcher {
  static[$singleton] = new Renderer({debug: isDebugMode()});

  static get singleton() {
    return this[$singleton];
  }

  static resetSingleton() {
    this[$singleton].dispose();
    this[$singleton] = new Renderer({debug: isDebugMode()});
  }

  public threeRenderer!: WebGLRenderer;
  public context3D!: WebGLRenderingContext|null;
  public canvasElement: HTMLCanvasElement;
  public canvas3D: HTMLCanvasElement|OffscreenCanvas;
  public textureUtils: TextureUtils|null;
  public width: number = 0;
  public height: number = 0;

  protected debugger: Debugger|null = null;
  private[$arRenderer]: ARRenderer;
  private[$dpr]: number = resolveDpr();
  private scenes: Set<ModelScene> = new Set();
  private lastTick: number;

  private[$webGLContextLostHandler] = (event: WebGLContextEvent) =>
      this[$onWebGLContextLost](event);

  get canRender() {
    return this.threeRenderer != null && this.context3D != null;
  }

  constructor(options?: RendererOptions) {
    super();

    const webGlOptions = {alpha: true, antialias: true};

    // Only enable certain options when Web XR capabilities are detected:
    if (IS_WEBXR_AR_CANDIDATE) {
      Object.assign(webGlOptions, {alpha: true, preserveDrawingBuffer: true});
    }

    this.canvasElement = document.createElement('canvas');

    this.canvas3D = USE_OFFSCREEN_CANVAS ?
        this.canvasElement.transferControlToOffscreen() :
        this.canvasElement;

    this.canvas3D.addEventListener(
        'webglcontextlost', this[$webGLContextLostHandler] as EventListener);

    try {
      // Need to support both 'webgl' and 'experimental-webgl' (IE11).
      this.context3D = WebGLUtils.getContext(this.canvas3D, webGlOptions);

      // Patch the gl context's extension functions before passing
      // it to three.
      WebGLUtils.applyExtensionCompatibility(this.context3D);

      this.threeRenderer = new WebGLRenderer({
        canvas: this.canvas3D,
        context: this.context3D,
      });
      this.threeRenderer.autoClear = true;
      this.threeRenderer.outputEncoding = GammaEncoding;
      this.threeRenderer.gammaFactor = 2.2;
      this.threeRenderer.physicallyCorrectLights = true;
      this.threeRenderer.setPixelRatio(1);  // not allowed to change
      this.threeRenderer.shadowMap.enabled = true;
      this.threeRenderer.shadowMap.type = PCFSoftShadowMap;
      this.threeRenderer.shadowMap.autoUpdate = false;

      this.debugger =
          options != null && !!options.debug ? new Debugger(this) : null;
      this.threeRenderer.debug = {checkShaderErrors: !!this.debugger};

      // ACESFilmicToneMapping appears to be the most "saturated",
      // and similar to Filament's gltf-viewer.
      this.threeRenderer.toneMapping = ACESFilmicToneMapping;
    } catch (error) {
      this.context3D = null;
      console.warn(error);
    }

    this[$arRenderer] = new ARRenderer(this);
    this.textureUtils =
        this.canRender ? new TextureUtils(this.threeRenderer) : null;

    this.width = 1;
    this.height = 1;
    this.updateRendererSize();
    this.lastTick = performance.now();
  }

  /**
   * Updates the renderer's size based on the largest scene and any changes to
   * device pixel ratio.
   */
  updateRendererSize() {
    const dpr = resolveDpr();
    if (dpr !== this[$dpr]) {
      // If the device pixel ratio has changed due to page zoom, elements
      // specified by % width do not fire a resize event even though their CSS
      // pixel dimensions change, so we force them to update their size here.
      for (const scene of this.scenes) {
        const {element} = scene;
        element[$updateSize](element.getBoundingClientRect());
      }
    }

    // Make the renderer the size of the largest scene
    let maxWidth = 0;
    let maxHeight = 0;
    for (const scene of this.scenes) {
      maxWidth = Math.max(maxWidth, scene.width);
      maxHeight = Math.max(maxHeight, scene.height);
    }

    if (maxWidth === this.width && maxHeight === this.height &&
        dpr === this[$dpr]) {
      return;
    }

    // The width and height properties are saved as unrounded floats in CSS
    // pixels to avoid accruing rounding error.
    this.width = maxWidth;
    this.height = maxHeight;
    this[$dpr] = dpr;
    const {width, height} = this;
    this.canvasElement.style.width = `${width}px`;
    this.canvasElement.style.height = `${height}px`;

    // We are not using three's pixel ratio (it is always 1.0), but instead
    // calculating sizes ourselves. Therefore all viewport dimenions are in
    // physical pixels, not CSS.
    const widthPixels = Math.round(width * dpr);
    const heightPixels = Math.round(height * dpr);
    if (this.canRender) {
      this.threeRenderer.setSize(widthPixels, heightPixels, false);
    }

    // Each scene's canvas must match the renderer size. In general they can be
    // larger than the element that contains them, but the overflow is hidden
    // and only the portion that is shown is copied over.
    for (const scene of this.scenes) {
      const {canvas} = scene;
      canvas.width = widthPixels;
      canvas.height = heightPixels;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      scene.isDirty = true;
    }
  }

  registerScene(scene: ModelScene) {
    this.scenes.add(scene);
    this.selectCanvas();

    const {canvas} = scene;
    const {width, height, dpr} = this;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    scene.isDirty = true;

    if (this.canRender && this.scenes.size > 0) {
      this.threeRenderer.setAnimationLoop((time: number) => this.render(time));
    }

    if (this.debugger != null) {
      this.debugger.addScene(scene);
    }
  }

  unregisterScene(scene: ModelScene) {
    const userInputElement = scene.element[$userInputElement];
    if (this.canvasElement.parentElement === userInputElement) {
      userInputElement.removeChild(this.canvasElement);
    }

    this.scenes.delete(scene);
    this.selectCanvas();

    if (this.canRender && this.scenes.size === 0) {
      (this.threeRenderer.setAnimationLoop as any)(null);
    }

    if (this.debugger != null) {
      this.debugger.removeScene(scene);
    }
  }

  get hasOnlyOneScene(): boolean {
    return this.scenes.size === 1;
  }

  get dpr(): number {
    return this[$dpr];
  }

  /**
   * The function enables an optimization, where when there is only a single
   * <model-viewer> element, we can use the renderer's 3D canvas directly for
   * display. Otherwise we need to use the element's 2D canvas and copy the
   * renderer's result into it.
   */
  selectCanvas() {
    for (const scene of this.scenes) {
      const userInputElement = scene.element[$userInputElement];
      const canvas = scene.element[$canvas];
      if (this.hasOnlyOneScene) {
        userInputElement.appendChild(this.canvasElement);
        canvas.classList.remove('show');
      } else {
        if (this.canvasElement.parentElement === userInputElement) {
          userInputElement.removeChild(this.canvasElement);
          scene.isDirty = true;
        }
        canvas.classList.add('show');
      }
    }
  }

  async supportsPresentation() {
    return this.canRender && this[$arRenderer].supportsPresentation();
  }

  get presentedScene() {
    return this[$arRenderer].presentedScene;
  }

  async present(scene: ModelScene): Promise<void> {
    try {
      return await this[$arRenderer].present(scene);
    } catch (error) {
      await this[$arRenderer].stopPresenting();
      throw error;
    } finally {
      // NOTE(cdata): Setting width and height to 0 will have the effect of
      // invoking a `setSize` the next time we render in this threeRenderer
      this.width = this.height = 0;
    }
  }

  stopPresenting(): Promise<void> {
    return this[$arRenderer].stopPresenting();
  }

  get isPresenting(): boolean {
    return this[$arRenderer] != null && this[$arRenderer].isPresenting;
  }

  /**
   * This method takes care of updating the element and renderer state based on
   * the time that has passed since the last rendered frame.
   */
  preRender(scene: ModelScene, t: number, delta: number) {
    const {element, exposure, model} = scene;

    element[$tick](t, delta);

    const exposureIsNumber =
        typeof exposure === 'number' && !(self as any).isNaN(exposure);
    this.threeRenderer.toneMappingExposure = exposureIsNumber ? exposure : 1.0;

    if (model.updateShadow()) {
      this.threeRenderer.shadowMap.needsUpdate = true;
    }
  }

  render(t: number) {
    if (!this.canRender || this.isPresenting) {
      return;
    }

    const delta = t - this.lastTick;
    this.updateRendererSize();
    const {dpr} = this;

    for (const scene of this.scenes) {
      if (!scene.visible || scene.paused) {
        continue;
      }

      this.preRender(scene, t, delta);

      if (!scene.isDirty) {
        continue;
      }

      const widthPixels = scene.width * dpr;
      const heightPixels = scene.height * dpr;

      // Need to set the render target in order to prevent
      // clearing the depth from a different buffer
      this.threeRenderer.setRenderTarget(null);
      this.threeRenderer.setViewport(
          0, this.height * dpr - heightPixels, widthPixels, heightPixels);
      this.threeRenderer.render(scene, scene.getCamera());

      if (!this.hasOnlyOneScene) {
        if (scene.context == null) {
          scene.createContext();
        }
        if (USE_OFFSCREEN_CANVAS) {
          const contextBitmap = scene.context as ImageBitmapRenderingContext;
          const bitmap =
              (this.canvas3D as OffscreenCanvas).transferToImageBitmap();
          contextBitmap.transferFromImageBitmap(bitmap);
        } else {
          const context2D = scene.context as CanvasRenderingContext2D;
          context2D.clearRect(0, 0, widthPixels, heightPixels);
          context2D.drawImage(
              this.canvas3D,
              0,
              0,
              widthPixels,
              heightPixels,
              0,
              0,
              widthPixels,
              heightPixels);
        }
      }

      scene.isDirty = false;
    }
    this.lastTick = t;
  }

  dispose() {
    if (this.textureUtils != null) {
      this.textureUtils.dispose();
    }

    if (this.threeRenderer != null) {
      this.threeRenderer.dispose();
    }

    this.textureUtils = null;
    (this as any).threeRenderer = null;

    this.scenes.clear();

    this.canvas3D.removeEventListener(
        'webglcontextlost', this[$webGLContextLostHandler] as EventListener);
  }

  [$onWebGLContextLost](event: WebGLContextEvent) {
    this.dispatchEvent(
        {type: 'contextlost', sourceEvent: event} as ContextLostEvent);
  }
}
