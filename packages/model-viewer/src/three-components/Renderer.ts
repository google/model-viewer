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

import {ACESFilmicToneMapping, Event, EventDispatcher, sRGBEncoding, WebGLRenderer} from 'three';

import {$updateEnvironment} from '../features/environment.js';
import {ModelViewerGlobalConfig} from '../features/loading.js';
import ModelViewerElementBase, {$canvas, $tick, $updateSize} from '../model-viewer-base.js';
import {clamp, isDebugMode, resolveDpr} from '../utilities.js';

import {ARRenderer} from './ARRenderer.js';
import {CachingGLTFLoader} from './CachingGLTFLoader.js';
import {Debugger} from './Debugger.js';
import {ModelViewerGLTFInstance} from './gltf-instance/ModelViewerGLTFInstance.js';
import {ModelScene} from './ModelScene.js';
import TextureUtils from './TextureUtils.js';

export interface RendererOptions {
  powerPreference: string;
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
const SCALE_STEPS = [1, 0.79, 0.62, 0.5, 0.4, 0.31, 0.25];
const DEFAULT_LAST_STEP = 3;

export const DEFAULT_POWER_PREFERENCE: string = 'high-performance';

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
  private static _singleton = new Renderer({
    powerPreference:
        (((self as any).ModelViewerElement || {}) as ModelViewerGlobalConfig)
            .powerPreference ||
        DEFAULT_POWER_PREFERENCE,
    debug: isDebugMode()
  });

  static get singleton() {
    return this._singleton;
  }

  static resetSingleton() {
    const elements = this._singleton.dispose();
    for (const element of elements) {
      element.disconnectedCallback();
    }

    this._singleton = new Renderer({
      powerPreference:
          (((self as any).ModelViewerElement || {}) as ModelViewerGlobalConfig)
              .powerPreference ||
          DEFAULT_POWER_PREFERENCE,
      debug: isDebugMode()
    });

    for (const element of elements) {
      element.connectedCallback();
    }
  }

  public threeRenderer!: WebGLRenderer;
  public canvas3D: HTMLCanvasElement;
  public textureUtils: TextureUtils|null;
  public arRenderer: ARRenderer;
  public loader = new CachingGLTFLoader(ModelViewerGLTFInstance);
  public width = 0;
  public height = 0;
  public dpr = 1;

  protected debugger: Debugger|null = null;
  private scenes: Set<ModelScene> = new Set();
  private multipleScenesVisible = false;
  private lastTick: number;
  private scaleStep = 0;
  private lastStep = DEFAULT_LAST_STEP;
  private avgFrameDuration =
      (HIGH_FRAME_DURATION_MS + LOW_FRAME_DURATION_MS) / 2;

  get canRender() {
    return this.threeRenderer != null;
  }

  get scaleFactor() {
    return SCALE_STEPS[this.scaleStep];
  }

  set minScale(scale: number) {
    let i = 1;
    while (i < SCALE_STEPS.length) {
      if (SCALE_STEPS[i] < scale) {
        break;
      }
      ++i;
    }
    this.lastStep = i - 1;
  }

  constructor(options: RendererOptions) {
    super();

    this.dpr = resolveDpr();

    this.canvas3D = document.createElement('canvas');
    this.canvas3D.id = 'webgl-canvas';

    try {
      this.threeRenderer = new WebGLRenderer({
        canvas: this.canvas3D,
        alpha: true,
        antialias: true,
        powerPreference: options.powerPreference as WebGLPowerPreference,
        preserveDrawingBuffer: true
      });
      this.threeRenderer.autoClear = true;
      this.threeRenderer.outputEncoding = sRGBEncoding;
      this.threeRenderer.physicallyCorrectLights = true;
      this.threeRenderer.setPixelRatio(1);  // handle pixel ratio externally

      this.debugger = !!options.debug ? new Debugger(this) : null;
      this.threeRenderer.debug = {checkShaderErrors: !!this.debugger};

      // ACESFilmicToneMapping appears to be the most "saturated",
      // and similar to Filament's gltf-viewer.
      this.threeRenderer.toneMapping = ACESFilmicToneMapping;
    } catch (error) {
      console.warn(error);
    }

    this.arRenderer = new ARRenderer(this);
    this.textureUtils =
        this.canRender ? new TextureUtils(this.threeRenderer) : null;
    CachingGLTFLoader.initializeKTX2Loader(this.threeRenderer);

    this.canvas3D.addEventListener('webglcontextlost', this.onWebGLContextLost);
    this.canvas3D.addEventListener(
        'webglcontextrestored', this.onWebGLContextRestored);

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
    const scale = this.scaleFactor;
    const widthCSS = width / scale;
    const heightCSS = height / scale;
    // The canvas element must by styled outside of three due to the offscreen
    // canvas not being directly stylable.
    this.canvas3D.style.width = `${widthCSS}px`;
    this.canvas3D.style.height = `${heightCSS}px`;

    // Each scene's canvas must match the renderer size. In general they can be
    // larger than the element that contains them, but the overflow is hidden
    // and only the portion that is shown is copied over.
    for (const scene of this.scenes) {
      const {canvas} = scene;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${widthCSS}px`;
      canvas.style.height = `${heightCSS}px`;
      scene.queueRender();
    }
  }

  private updateRendererScale() {
    const scaleStep = this.scaleStep;
    if (this.avgFrameDuration > HIGH_FRAME_DURATION_MS) {
      ++this.scaleStep;
    } else if (
        this.avgFrameDuration < LOW_FRAME_DURATION_MS && this.scaleStep > 0) {
      --this.scaleStep;
    }
    this.scaleStep = Math.min(this.scaleStep, this.lastStep);

    if (scaleStep == this.scaleStep) {
      return;
    }
    const scale = this.scaleFactor;
    this.avgFrameDuration =
        (HIGH_FRAME_DURATION_MS + LOW_FRAME_DURATION_MS) / 2;

    const width = this.width / scale;
    const height = this.height / scale;

    this.canvas3D.style.width = `${width}px`;
    this.canvas3D.style.height = `${height}px`;
    for (const scene of this.scenes) {
      const {style} = scene.canvas;
      style.width = `${width}px`;
      style.height = `${height}px`;
      scene.queueRender();
      this.dispatchRenderScale(scene);
    }
  }

  dispatchRenderScale(scene: ModelScene) {
    const scale = this.scaleFactor;
    const renderedDpr = this.dpr * scale;
    const reason = scale < 1                 ? 'GPU throttling' :
        this.dpr !== window.devicePixelRatio ? 'No meta viewport tag' :
                                               '';
    scene.element.dispatchEvent(new CustomEvent('render-scale', {
      detail: {
        reportedDpr: window.devicePixelRatio,
        renderedDpr: renderedDpr,
        minimumDpr: this.dpr * SCALE_STEPS[this.lastStep],
        pixelWidth: Math.ceil(scene.width * renderedDpr),
        pixelHeight: Math.ceil(scene.height * renderedDpr),
        reason: reason
      }
    }));
  }

  registerScene(scene: ModelScene) {
    this.scenes.add(scene);
    const {canvas} = scene;
    const scale = this.scaleFactor;

    canvas.width = Math.round(this.width * this.dpr);
    canvas.height = Math.round(this.height * this.dpr);

    canvas.style.width = `${this.width / scale}px`;
    canvas.style.height = `${this.height / scale}px`;

    if (this.multipleScenesVisible) {
      canvas.classList.add('show');
    }
    scene.queueRender();

    this.dispatchRenderScale(scene);

    if (this.canRender && this.scenes.size > 0) {
      this.threeRenderer.setAnimationLoop(
          (time: number, frame?: any) => this.render(time, frame));
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
    return this.multipleScenesVisible ? scene.element[$canvas] : this.canvas3D;
  }

  /**
   * The function enables an optimization, where when there is only a single
   * <model-viewer> element, we can use the renderer's 3D canvas directly for
   * display. Otherwise we need to use the element's 2D canvas and copy the
   * renderer's result into it.
   */
  private selectCanvas() {
    let visibleScenes = 0;
    let visibleCanvas = null;
    for (const scene of this.scenes) {
      const {element} = scene;
      if (element.modelIsVisible && scene.externalRenderer == null) {
        ++visibleScenes;
        visibleCanvas = scene.canvas;
      }
    }
    if (visibleCanvas == null) {
      return;
    }
    const multipleScenesVisible = visibleScenes > 1;
    const {canvas3D} = this;

    if (multipleScenesVisible === this.multipleScenesVisible &&
        (multipleScenesVisible ||
         canvas3D.parentElement === visibleCanvas.parentElement)) {
      return;
    }
    this.multipleScenesVisible = multipleScenesVisible;

    if (multipleScenesVisible) {
      canvas3D.classList.remove('show');
    }
    for (const scene of this.scenes) {
      if (scene.externalRenderer != null) {
        continue;
      }
      const canvas = scene.element[$canvas];
      if (multipleScenesVisible) {
        canvas.classList.add('show');
        scene.queueRender();
      } else if (scene.canvas === visibleCanvas) {
        scene.canvas.parentElement!.appendChild(canvas3D);
        canvas3D.classList.add('show');
        canvas.classList.remove('show');
        scene.queueRender();
      }
    }
  }

  /**
   * Returns an array version of this.scenes where the non-visible ones are
   * first. This allows eager scenes to be rendered before they are visible,
   * without needing the multi-canvas render path.
   */
  private orderedScenes(): Array<ModelScene> {
    const scenes = [];
    for (const visible of [false, true]) {
      for (const scene of this.scenes) {
        if (scene.element.modelIsVisible === visible) {
          scenes.push(scene);
        }
      }
    }
    return scenes;
  }

  get isPresenting(): boolean {
    return this.arRenderer.isPresenting;
  }

  /**
   * This method takes care of updating the element and renderer state based on
   * the time that has passed since the last rendered frame.
   */
  preRender(scene: ModelScene, t: number, delta: number) {
    const {element, exposure} = scene;

    element[$tick](t, delta);

    const exposureIsNumber =
        typeof exposure === 'number' && !(self as any).isNaN(exposure);
    this.threeRenderer.toneMappingExposure = exposureIsNumber ? exposure : 1.0;
  }

  render(t: number, frame?: XRFrame) {
    if (frame != null) {
      this.arRenderer.onWebXRFrame(t, frame);
      return;
    }

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

    const {dpr, scaleFactor} = this;

    for (const scene of this.orderedScenes()) {
      const {element} = scene;
      if (!element.modelIsVisible && scene.renderCount > 0) {
        continue;
      }

      this.preRender(scene, t, delta);

      if (!scene.shouldRender()) {
        continue;
      }

      if (scene.externalRenderer != null) {
        const camera = scene.getCamera();
        camera.updateMatrix();
        const {matrix, projectionMatrix} = camera;
        const viewMatrix = matrix.elements.slice();
        const target = scene.getTarget();
        viewMatrix[12] += target.x;
        viewMatrix[13] += target.y;
        viewMatrix[14] += target.z;

        scene.externalRenderer.render({
          viewMatrix: viewMatrix,
          projectionMatrix: projectionMatrix.elements
        });
        continue;
      }

      if (!element.modelIsVisible && !this.multipleScenesVisible) {
        // Here we are pre-rendering on the visible canvas, so we must mark the
        // visible scene dirty to ensure it overwrites us.
        for (const visibleScene of this.scenes) {
          if (visibleScene.element.modelIsVisible) {
            visibleScene.queueRender();
          }
        }
      }

      // We avoid using the Three.js PixelRatio and handle it ourselves here so
      // that we can do proper rounding and avoid white boundary pixels.
      const width = Math.min(
          Math.ceil(scene.width * scaleFactor * dpr), this.canvas3D.width);
      const height = Math.min(
          Math.ceil(scene.height * scaleFactor * dpr), this.canvas3D.height);

      scene.renderShadow(this.threeRenderer);

      // Need to set the render target in order to prevent
      // clearing the depth from a different buffer
      this.threeRenderer.setRenderTarget(null);
      this.threeRenderer.setViewport(
          0, Math.floor(this.height * dpr) - height, width, height);
      this.threeRenderer.render(scene, scene.camera);

      if (this.multipleScenesVisible) {
        if (scene.context == null) {
          scene.createContext();
        }
        const context2D = scene.context as CanvasRenderingContext2D;
        context2D.clearRect(0, 0, width, height);
        context2D.drawImage(
            this.canvas3D, 0, 0, width, height, 0, 0, width, height);
      }

      scene.hasRendered();
      if (element.loaded) {
        ++scene.renderCount;
      }
    }
  }

  dispose(): Array<ModelViewerElementBase> {
    if (this.textureUtils != null) {
      this.textureUtils.dispose();
    }

    if (this.threeRenderer != null) {
      this.threeRenderer.dispose();
    }

    this.textureUtils = null;
    (this as any).threeRenderer = null;

    const elements = [];
    for (const scene of this.scenes) {
      elements.push(scene.element);
    }

    this.canvas3D.removeEventListener(
        'webglcontextlost', this.onWebGLContextLost);
    this.canvas3D.removeEventListener(
        'webglcontextrestored', this.onWebGLContextRestored);

    return elements;
  }

  onWebGLContextLost = (event: Event) => {
    this.dispatchEvent(
        {type: 'contextlost', sourceEvent: event} as ContextLostEvent);
  };

  onWebGLContextRestored = () => {
    this.textureUtils?.dispose();
    this.textureUtils = new TextureUtils(this.threeRenderer);
    for (const scene of this.scenes) {
      (scene.element as any)[$updateEnvironment]();
    }
  };
}
