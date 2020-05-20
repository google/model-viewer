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

// Between 0 and 1: larger means the average responds faster and is less smooth.
const DURATION_DECAY = 0.2;
const LOW_FRAME_DURATION = 18;   // ms
const HIGH_FRAME_DURATION = 26;  // ms
const SCALE_STEP = 0.79;
const MIN_SCALE = 0.5;

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

  protected debugger: Debugger|null = null;
  private[$arRenderer]: ARRenderer;
  private scenes: Set<ModelScene> = new Set();
  private lastTick: number;
  private width = 0;
  private height = 0;
  private scale = 1;
  private avgFrameDuration = (HIGH_FRAME_DURATION + LOW_FRAME_DURATION) / 2;
  private slowFrame = true;
  private didRender = false;

  private[$webGLContextLostHandler] = (event: WebGLContextEvent) =>
      this[$onWebGLContextLost](event);

  get canRender() {
    return this.threeRenderer != null && this.context3D != null;
  }

  constructor(options?: RendererOptions) {
    super();

    const webGlOptions = {
      alpha: true,
      antialias: true,
      powerPreference: 'low-power' as WebGLPowerPreference
    };

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
      this.threeRenderer.setPixelRatio(resolveDpr());
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

    this.updateRendererSize();
    this.lastTick = performance.now();
    this.avgFrameDuration = 0;
  }

  /**
   * Updates the renderer's size based on the largest scene and any changes to
   * device pixel ratio.
   */
  updateRendererSize() {
    const dpr = resolveDpr();
    let dprUpdated = false;
    if (dpr !== this.dpr) {
      // If the device pixel ratio has changed due to page zoom, elements
      // specified by % width do not fire a resize event even though their CSS
      // pixel dimensions change, so we force them to update their size here.
      for (const scene of this.scenes) {
        const {element} = scene;
        element[$updateSize](element.getBoundingClientRect());
      }
      this.threeRenderer.setPixelRatio(dpr);
      dprUpdated = true;
    }

    // Make the renderer the size of the largest scene
    let width = 0;
    let height = 0;
    for (const scene of this.scenes) {
      width = Math.max(width, scene.width);
      height = Math.max(height, scene.height);
    }

    if (width === this.width && height === this.height &&
        dprUpdated === false) {
      return;
    }
    this.width = width;
    this.height = height;

    // Resizing the framebuffer takes time, so ignore it when timing frames.
    this.slowFrame = true;

    if (this.canRender) {
      this.threeRenderer.setSize(width, height, false);
    }

    // Expand the canvas size to make up for shrinking the viewport.
    width /= this.scale;
    height /= this.scale;
    // The canvas element must by styled outside of three due to the offscreen
    // canvas not being directly stylable.
    this.canvasElement.style.width = `${width}px`;
    this.canvasElement.style.height = `${height}px`;

    // Each scene's canvas must match the renderer size. In general they can be
    // larger than the element that contains them, but the overflow is hidden
    // and only the portion that is shown is copied over.
    for (const scene of this.scenes) {
      const {canvas} = scene;
      const {width: pixelWidth, height: pixelHeight} =
          this.threeRenderer.domElement;
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      scene.isDirty = true;
    }
  }

  updateRenderScale() {
    let {scale} = this;

    if (this.avgFrameDuration > HIGH_FRAME_DURATION && scale > MIN_SCALE) {
      scale *= SCALE_STEP;
      scale = Math.max(scale, MIN_SCALE);
    } else if (this.avgFrameDuration < LOW_FRAME_DURATION && scale < 1) {
      scale /= SCALE_STEP;
      scale = Math.min(scale, 1);
    }

    if (scale !== this.scale) {
      this.scale = scale;
      this.avgFrameDuration = (HIGH_FRAME_DURATION + LOW_FRAME_DURATION) / 2;

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
    console.log('scale = ', this.scale);
  }

  registerScene(scene: ModelScene) {
    this.scenes.add(scene);
    this.selectCanvas();
    const {canvas} = scene;

    const {width, height} = this.threeRenderer.domElement;
    canvas.width = width;
    canvas.height = height;

    canvas.style.width = `${this.width / this.scale}px`;
    canvas.style.height = `${this.height / this.scale}px`;
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
    return this.threeRenderer.getPixelRatio();
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
    console.log('delta = ', delta);
    if (this.didRender && this.slowFrame !== true) {
      this.avgFrameDuration =
          (1 - DURATION_DECAY) * this.avgFrameDuration + DURATION_DECAY * delta;
    }
    this.slowFrame = false;
    this.didRender = false;
    console.log('avg = ', this.avgFrameDuration);
    this.updateRendererSize();
    this.updateRenderScale();
    const {dpr, scale} = this;

    for (const scene of this.scenes) {
      if (!scene.visible || scene.paused) {
        continue;
      }

      this.preRender(scene, t, delta);

      if (!scene.isDirty) {
        continue;
      }

      const width = scene.width * scale;
      const height = scene.height * scale;
      const widthPixels = width * dpr;
      const heightPixels = height * dpr;

      // Need to set the render target in order to prevent
      // clearing the depth from a different buffer
      this.threeRenderer.setRenderTarget(null);
      this.threeRenderer.setViewport(0, this.height - height, width, height);
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
      this.didRender = true;
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
