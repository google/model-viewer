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

import {USE_OFFSCREEN_CANVAS} from '../constants.js';
import ModelViewerElementBase, {$canvas, $context, $createContext, $needsRender, $scene, $sceneIsReady, $tick, $updateSize, $userInputElement} from '../model-viewer-base.js';
import {clamp, isDebugMode, resolveDpr} from '../utilities.js';

import {ARRenderer} from './ARRenderer.js';
import {Lazy} from './Lazy.js';

export interface RendererOptions {
  debug: boolean;
}

// Between 0 and 1: larger means the average responds faster and is less smooth.
const DURATION_DECAY = 0.2;
const LOW_FRAME_DURATION_MS = 18;
const HIGH_FRAME_DURATION_MS = 26;
const MAX_AVG_CHANGE_MS = 2;
const SCALE_STEP = 0.79;
const DEFAULT_MIN_SCALE = 0.5;

/**
 * Registers canvases with Canvas2DRenderingContexts and renders them
 * all in the same WebGLRenderingContext, spitting out textures to apply
 * to the canvases. Creates a WebGL canvas that is not added
 * to the DOM, and on each frame, renders each registered canvas on a portion
 * of the WebGL canvas, and applies the texture on the registered canvas.
 */
export class Renderer {
  static instance = new Renderer();

  static get singleton() {
    return this.instance;
  }

  static resetSingleton() {
    this.instance.dispose();
    this.instance = new Renderer();
  }

  public canvasElement: HTMLCanvasElement;
  public canvas3D: HTMLCanvasElement|OffscreenCanvas;
  public lazy: Lazy|null = null;
  public arRenderer: ARRenderer|null = null;
  public width = 0;
  public height = 0;
  public dpr = 1;
  public minScale = DEFAULT_MIN_SCALE;

  private elements: Set<ModelViewerElementBase> = new Set();
  private multipleScenesVisible = false;
  private lastTick: number;
  private scale = 1;
  private avgFrameDuration =
      (HIGH_FRAME_DURATION_MS + LOW_FRAME_DURATION_MS) / 2;

  private onWebGLContextLost = (event: Event) => {
    for (const element of this.elements) {
      element.dispatchEvent(new CustomEvent(
          'error', {detail: {type: 'webglcontextlost', sourceError: event}}));
    }
  };

  get scaleFactor() {
    return this.scale;
  }

  get isPresenting(): boolean {
    return !!this.arRenderer?.isPresenting;
  }

  constructor() {
    this.canvasElement = document.createElement('canvas');
    this.canvasElement.id = 'webgl-canvas';

    this.canvas3D = USE_OFFSCREEN_CANVAS ?
        this.canvasElement.transferControlToOffscreen() :
        this.canvasElement;

    this.dpr = resolveDpr();
    this.updateRendererSize();
    this.lastTick = performance.now();
    this.avgFrameDuration = 0;
    this.canvas3D.addEventListener('webglcontextlost', this.onWebGLContextLost);

    try {
      this.lazy = new Lazy(this.canvas3D, {debug: isDebugMode()});
      this.arRenderer = new ARRenderer(this.lazy.threeRenderer);
    } catch (error) {
      console.warn(error);
    }
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
      for (const element of this.elements) {
        element[$updateSize](element.getBoundingClientRect());
      }
    }

    // Make the renderer the size of the largest scene
    let width = 0;
    let height = 0;
    for (const element of this.elements) {
      const scene = element[$scene];
      width = Math.max(width, scene.width);
      height = Math.max(height, scene.height);
    }

    if (width === this.width && height === this.height && dpr === this.dpr) {
      return;
    }
    this.width = width;
    this.height = height;
    this.dpr = dpr;

    this.lazy?.threeRenderer.setSize(width * dpr, height * dpr, false);

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
    for (const element of this.elements) {
      const canvas = element[$canvas];
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${widthCSS}px`;
      canvas.style.height = `${heightCSS}px`;
      element[$needsRender]();
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
    for (const element of this.elements) {
      const {style} = element[$canvas];
      style.width = `${width}px`;
      style.height = `${height}px`;
      element[$needsRender]();
    }
  }

  registerElement(element: ModelViewerElementBase) {
    this.elements.add(element);
    const canvas = element[$canvas];

    canvas.width = this.width * this.dpr;
    canvas.height = this.height * this.dpr;

    canvas.style.width = `${this.width / this.scale}px`;
    canvas.style.height = `${this.height / this.scale}px`;

    if (this.multipleScenesVisible) {
      canvas.classList.add('show');
    }
    element[$needsRender]();

    if (this.elements.size > 0) {
      this.lazy?.threeRenderer.setAnimationLoop(
          (time: number) => this.render(time));
    }
  }

  unregisterElement(element: ModelViewerElementBase) {
    this.elements.delete(element);

    if (this.elements.size === 0) {
      (this.lazy?.threeRenderer.setAnimationLoop as any)(null);
    }
  }

  displayCanvas(element: ModelViewerElementBase): HTMLCanvasElement {
    return this.multipleScenesVisible ? element[$canvas] : this.canvasElement;
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
    for (const element of this.elements) {
      if (element.modelIsVisible) {
        ++visibleScenes;
        visibleInput = element[$userInputElement];
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
    for (const element of this.elements) {
      const userInputElement = element[$userInputElement];
      const canvas = element[$canvas];
      if (multipleScenesVisible) {
        canvas.classList.add('show');
        element[$needsRender]();
      } else if (userInputElement === visibleInput) {
        userInputElement.appendChild(canvasElement);
        canvasElement.classList.add('show');
        canvas.classList.remove('show');
        element[$needsRender]();
      }
    }
  }

  /**
   * Returns an array version of this.elements where the non-visible ones are
   * first. This allows eager scenes to be rendered before they are visible,
   * without needing the multi-canvas render path.
   */
  private orderedScenes(): Array<ModelViewerElementBase> {
    const elements = [];
    for (const visible of [false, true]) {
      for (const element of this.elements) {
        if (element.modelIsVisible === visible) {
          elements.push(element);
        }
      }
    }
    return elements;
  }

  /**
   * This method takes care of updating the element and renderer state based on
   * the time that has passed since the last rendered frame.
   */
  preRender(element: ModelViewerElementBase, t: number, delta: number) {
    const {exposure, model} = element[$scene];

    element[$tick](t, delta);

    const exposureIsNumber =
        typeof exposure === 'number' && !(self as any).isNaN(exposure);
    this.lazy!.threeRenderer.toneMappingExposure =
        exposureIsNumber ? exposure : 1.0;

    if (model.updateShadow()) {
      this.lazy!.threeRenderer.shadowMap.needsUpdate = true;
    }
  }

  render(t: number) {
    const delta = t - this.lastTick;
    this.lastTick = t;

    if (this.isPresenting) {
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

    for (const element of this.orderedScenes()) {
      if (!element[$sceneIsReady]()) {
        continue;
      }

      this.preRender(element, t, delta);
      const scene = element[$scene];

      if (!scene.isDirty) {
        continue;
      }
      scene.isDirty = false;

      if (!element.modelIsVisible && !this.multipleScenesVisible) {
        // Here we are pre-rendering on the visible canvas, so we must mark the
        // visible scene dirty to ensure it overwrites us.
        for (const element of this.elements) {
          if (element.modelIsVisible) {
            element[$needsRender]();
          }
        }
      }

      // We avoid using the Three.js PixelRatio and handle it ourselves here so
      // that we can do proper rounding and avoid white boundary pixels.
      const width =
          Math.min(Math.ceil(scene.width * scale * dpr), this.canvas3D.width);
      const height =
          Math.min(Math.ceil(scene.height * scale * dpr), this.canvas3D.height);

      // Need to set the render target in order to prevent
      // clearing the depth from a different buffer
      this.lazy!.threeRenderer.setRenderTarget(null);
      this.lazy!.threeRenderer.setViewport(
          0, Math.floor(this.height * dpr) - height, width, height);
      this.lazy!.threeRenderer.render(scene, scene.getCamera());

      if (this.multipleScenesVisible) {
        if (element[$context] == null) {
          element[$createContext]();
        }
        if (USE_OFFSCREEN_CANVAS) {
          const contextBitmap =
              element[$context] as ImageBitmapRenderingContext;
          const bitmap =
              (this.canvas3D as OffscreenCanvas).transferToImageBitmap();
          contextBitmap.transferFromImageBitmap(bitmap);
        } else {
          const context2D = element[$context] as CanvasRenderingContext2D;
          context2D.clearRect(0, 0, width, height);
          context2D.drawImage(
              this.canvas3D, 0, 0, width, height, 0, 0, width, height);
        }
      }
    }
  }

  dispose() {
    this.lazy?.dispose();
    this.lazy = null;

    this.elements.clear();

    this.canvas3D.removeEventListener(
        'webglcontextlost', this.onWebGLContextLost);
  }
}
