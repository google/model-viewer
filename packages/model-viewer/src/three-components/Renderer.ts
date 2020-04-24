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
import {$tick} from '../model-viewer-base.js';
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
  private scenes: Set<ModelScene> = new Set();
  private lastTick: number;

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
      powerPreference: 'high-performance' as WebGLPowerPreference
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

    this.setRendererSize(1, 1);
    this.lastTick = performance.now();
  }

  setRendererSize(width: number, height: number) {
    if (this.canRender) {
      this.threeRenderer.setSize(width, height, false);
    }

    this.width = width;
    this.height = height;
  }

  registerScene(scene: ModelScene) {
    this.scenes.add(scene);
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

  get hasOnlyOneScene(): boolean {
    return this.scenes.size === 1;
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

  /**
   * Expands the size of the renderer to the max of its current size and the
   * incoming size.
   */
  expandTo(width: number, height: number) {
    const maxWidth = Math.max(width, this.width);
    const maxHeight = Math.max(height, this.height);
    this.setRendererSize(maxWidth, maxHeight);
    this.canvasElement.style.width = `${maxWidth}px`;
    this.canvasElement.style.height = `${maxHeight}px`;
    for (const scene of this.scenes) {
      scene.canvas.width = maxWidth;
      scene.canvas.height = maxHeight;
    }
  }

  render(t: number) {
    if (!this.canRender || this.isPresenting) {
      return;
    }

    const delta = t - this.lastTick;
    const dpr = resolveDpr();

    if (dpr !== this.threeRenderer.getPixelRatio()) {
      this.threeRenderer.setPixelRatio(dpr);
      this.canvasElement.style.width = `${this.width}px`;
      this.canvasElement.style.height = `${this.height}px`;
      for (const scene of this.scenes) {
        scene.isDirty = true;
      }
    }

    for (const scene of this.scenes) {
      if (!scene.visible || scene.paused) {
        continue;
      }

      this.preRender(scene, t, delta);

      if (!scene.isDirty) {
        continue;
      }

      const {width, height} = scene;

      if (width > this.width || height > this.height) {
        const maxWidth = Math.max(width, this.width);
        const maxHeight = Math.max(height, this.height);
        this.setRendererSize(maxWidth, maxHeight);
      }

      // Need to set the render target in order to prevent
      // clearing the depth from a different buffer -- possibly
      // from something in
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
          context2D.clearRect(0, 0, width, height);
          context2D.drawImage(
              this.threeRenderer.domElement,
              0,
              0,
              width * dpr,
              height * dpr,
              0,
              0,
              width,
              height);
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
