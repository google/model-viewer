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

import {USE_OFFSCREEN_CANVAS} from '../constants.js';
import {$canvas, $tick, $updateSize, $userInputElement} from '../model-viewer-base.js';
import {clamp, isDebugMode, resolveDpr} from '../utilities.js';

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

// Between 0 and 1: larger means the average responds faster and is less smooth.
const DURATION_DECAY = 0.2;
const LOW_FRAME_DURATION_MS = 18;
const HIGH_FRAME_DURATION_MS = 26;
const MAX_AVG_CHANGE_MS = 2;
const SCALE_STEP = 0.79;
const DEFAULT_MIN_SCALE = 0.5;

export const $arRenderer = Symbol('arRenderer');

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
  public arRenderer: ARRenderer;
  public width = 0;
  public height = 0;
  public dpr = 1;
  public minScale = DEFAULT_MIN_SCALE;

  protected debugger: Debugger|null = null;
  private scenes: Set<ModelScene> = new Set();
  private multipleScenesVisible = false;
  private lastTick: number;
  private scale = 1;
  private avgFrameDuration =
      (HIGH_FRAME_DURATION_MS + LOW_FRAME_DURATION_MS) / 2;

  private[$webGLContextLostHandler] = (event: WebGLContextEvent) =>
      this[$onWebGLContextLost](event);

  get canRender() {
    return this.threeRenderer != null && this.context3D != null;
  }

  get scaleFactor() {
    return this.scale;
  }

  constructor(options?: RendererOptions) {
    super();

    const webGlOptions = {
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance' as WebGLPowerPreference,
      preserveDrawingBuffer: true
    };

    this.dpr = resolveDpr();

    this.canvasElement = document.createElement('canvas');
    this.canvasElement.id = 'webgl-canvas';

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
      this.threeRenderer.setPixelRatio(1);  // handle pixel ratio externally
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

    this.arRenderer = new ARRenderer(this);
    this.textureUtils =
        this.canRender ? new TextureUtils(this.threeRenderer) : null;

    this.updateRendererSize();
    this.lastTick = performance.now();
    this.avgFrameDuration = 0;
  }

  /**
   * Updates the renderer's size based on the largest scene and any changes to
   * device pixel ratio.
   */
  private updateRendererSize() {
    const dpr = resolveDpr();
    if (dpr !== this.dpr) {
      // If the device pixel ratio has changed due to page zoom, elements
      // specified by % width do not fire a resize event even though their CSS
      // pixel dimensions change, so we force them to update their size here.
      for (const scene of this.scenes) {
        const {element} = scene;
        element[$updateSize](element.getBoundingClientRect());
      }
    }

    // Make the renderer the size of the largest scene
    let width = 0;
    let height = 0;
    for (const scene of this.scenes) {
      width = Math.max(width, scene.width);
      height = Math.max(height, scene.height);
    }

    if (width === this.width && height === this.height && dpr === this.dpr) {
      return;
    }
    this.width = width;
    this.height = height;
    this.dpr = dpr;

    if (this.canRender) {
      this.threeRenderer.setSize(width * dpr, height * dpr, false);
    }

    // Expand the canvas size to make up for shrinking the viewport.
    const widthCSS = width / this.scale;
    const heightCSS = height / this.scale;
    // The canvas element must by styled outside of three due to the offscreen
    // canvas not being directly stylable.
    this.canvasElement.style.width = `${widthCSS}px`;
    this.canvasElement.style.height = `${heightCSS}px`;

    // Each scene's canvas must match the renderer size. In general they can be
    // larger than the element that contains them, but the overflow is hidden
    // and only the portion that is shown is copied over.
    for (const scene of this.scenes) {
      const {canvas} = scene;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${widthCSS}px`;
      canvas.style.height = `${heightCSS}px`;
      scene.isDirty = true;
    }
  }

  private updateRendererScale() {
    let {scale} = this;
    if (this.avgFrameDuration > HIGH_FRAME_DURATION_MS &&
        scale > this.minScale) {
      scale *= SCALE_STEP;
    } else if (this.avgFrameDuration < LOW_FRAME_DURATION_MS && scale < 1) {
      scale /= SCALE_STEP;
      scale = Math.min(scale, 1);
    }
    scale = Math.max(scale, this.minScale);

    if (scale == this.scale) {
      return;
    }
    this.scale = scale;
    this.avgFrameDuration =
        (HIGH_FRAME_DURATION_MS + LOW_FRAME_DURATION_MS) / 2;

    const width = this.width / scale;
    const height = this.height / scale;

    this.canvasElement.style.width = `${width}px`;
    this.canvasElement.style.height = `${height}px`;
    for (const scene of this.scenes) {
      const {style} = scene.canvas;
      style.width = `${width}px`;
      style.height = `${height}px`;
      scene.isDirty = true;
    }
  }

  registerScene(scene: ModelScene) {
    this.scenes.add(scene);
    const {canvas} = scene;

    canvas.width = this.width * this.dpr;
    canvas.height = this.height * this.dpr;

    canvas.style.width = `${this.width / this.scale}px`;
    canvas.style.height = `${this.height / this.scale}px`;

    if (this.multipleScenesVisible) {
      canvas.classList.add('show');
    }
    scene.isDirty = true;

    if (this.canRender && this.scenes.size > 0) {
      this.threeRenderer.setAnimationLoop((time: number) => this.render(time));
    }

    if (this.debugger != null) {
      this.debugger.addScene(scene);
    }
  }

  unregisterScene(scene: ModelScene) {
    this.scenes.delete(scene);

    if (this.canRender && this.scenes.size === 0) {
      (this.threeRenderer.setAnimationLoop as any)(null);
    }

    if (this.debugger != null) {
      this.debugger.removeScene(scene);
    }
  }

  displayCanvas(scene: ModelScene): HTMLCanvasElement {
    return this.multipleScenesVisible ? scene.element[$canvas] :
                                        this.canvasElement;
  }

  /**
   * The function enables an optimization, where when there is only a single
   * <model-viewer> element, we can use the renderer's 3D canvas directly for
   * display. Otherwise we need to use the element's 2D canvas and copy the
   * renderer's result into it.
   */
  private selectCanvas() {
    let visibleScenes = 0;
    let visibleInput = null;
    for (const scene of this.scenes) {
      if (scene.visible) {
        ++visibleScenes;
        visibleInput = scene.element[$userInputElement];
      }
    }
    const multipleScenesVisible = visibleScenes > 1 || USE_OFFSCREEN_CANVAS;
    const {canvasElement} = this;

    if (multipleScenesVisible === this.multipleScenesVisible &&
        (multipleScenesVisible ||
         canvasElement.parentElement === visibleInput)) {
      return;
    }
    this.multipleScenesVisible = multipleScenesVisible;

    if (multipleScenesVisible) {
      canvasElement.classList.remove('show');
    }
    for (const scene of this.scenes) {
      const userInputElement = scene.element[$userInputElement];
      const canvas = scene.element[$canvas];
      if (multipleScenesVisible) {
        canvas.classList.add('show');
        scene.isDirty = true;
      } else if (userInputElement === visibleInput) {
        userInputElement.appendChild(canvasElement);
        canvasElement.classList.add('show');
        canvas.classList.remove('show');
        scene.isDirty = true;
      }
    }
  }

  get isPresenting(): boolean {
    return this.arRenderer.isPresenting;
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
    const delta = t - this.lastTick;
    this.lastTick = t;

    if (!this.canRender || this.isPresenting) {
      return;
    }

    this.avgFrameDuration += clamp(
        DURATION_DECAY * (delta - this.avgFrameDuration),
        -MAX_AVG_CHANGE_MS,
        MAX_AVG_CHANGE_MS);

    this.selectCanvas();
    this.updateRendererSize();
    this.updateRendererScale();

    const {dpr, scale} = this;

    for (const scene of this.scenes) {
      if (scene.hasRendered && !scene.visible) {
        continue;
      }

      this.preRender(scene, t, delta);

      if (!scene.isDirty) {
        continue;
      }
      scene.isDirty = false;
      scene.hasRendered = true;

      // We avoid using the Three.js PixelRatio and handle it ourselves here so
      // that we can do proper rounding and avoid white boundary pixels.
      const width = Math.ceil(scene.width * scale * dpr);
      const height = Math.ceil(scene.height * scale * dpr);

      // Need to set the render target in order to prevent
      // clearing the depth from a different buffer
      this.threeRenderer.setRenderTarget(null);
      this.threeRenderer.setViewport(
          0, Math.floor(this.height * dpr) - height, width, height);
      this.threeRenderer.render(scene, scene.getCamera());

      if (this.multipleScenesVisible) {
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
          context2D.clearRect(0, 0, width, height);
          context2D.drawImage(
              this.canvas3D, 0, 0, width, height, 0, 0, width, height);
        }
      }
    }
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
