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

import {ReactiveElement} from 'lit';
import {property} from 'lit/decorators.js';
import {Camera as ThreeCamera, Event as ThreeEvent, Vector2, Vector3, WebGLRenderer} from 'three';

import {HAS_INTERSECTION_OBSERVER, HAS_RESIZE_OBSERVER} from './constants.js';
import {$updateEnvironment} from './features/environment.js';
import {makeTemplate} from './template.js';
import {$evictionPolicy, CachingGLTFLoader} from './three-components/CachingGLTFLoader.js';
import {ModelScene} from './three-components/ModelScene.js';
import {ContextLostEvent, Renderer} from './three-components/Renderer.js';
import {clamp, debounce} from './utilities.js';
import {ProgressTracker} from './utilities/progress-tracker.js';

const CLEAR_MODEL_TIMEOUT_MS = 10;
const FALLBACK_SIZE_UPDATE_THRESHOLD_MS = 50;
const ANNOUNCE_MODEL_VISIBILITY_DEBOUNCE_THRESHOLD = 0;
const UNSIZED_MEDIA_WIDTH = 300;
const UNSIZED_MEDIA_HEIGHT = 150;

export const blobCanvas = document.createElement('canvas');

const $fallbackResizeHandler = Symbol('fallbackResizeHandler');
const $defaultAriaLabel = Symbol('defaultAriaLabel');

const $resizeObserver = Symbol('resizeObserver');
const $clearModelTimeout = Symbol('clearModelTimeout');
const $onContextLost = Symbol('onContextLost');
const $loaded = Symbol('loaded');
const $status = Symbol('status');
const $onFocus = Symbol('onFocus');
const $onBlur = Symbol('onBlur');

export const $updateSize = Symbol('updateSize');
export const $intersectionObserver = Symbol('intersectionObserver');
export const $isElementInViewport = Symbol('isElementInViewport');
export const $announceModelVisibility = Symbol('announceModelVisibility');
export const $ariaLabel = Symbol('ariaLabel');
export const $altDefaulted = Symbol('altDefaulted');
export const $statusElement = Symbol('statusElement');
export const $updateStatus = Symbol('updateStatus');
export const $loadedTime = Symbol('loadedTime');
export const $updateSource = Symbol('updateSource');
export const $markLoaded = Symbol('markLoaded');
export const $container = Symbol('container');
export const $userInputElement = Symbol('input');
export const $canvas = Symbol('canvas');
export const $scene = Symbol('scene');
export const $needsRender = Symbol('needsRender');
export const $tick = Symbol('tick');
export const $onModelLoad = Symbol('onModelLoad');
export const $onResize = Symbol('onResize');
export const $renderer = Symbol('renderer');
export const $progressTracker = Symbol('progressTracker');
export const $getLoaded = Symbol('getLoaded');
export const $getModelIsVisible = Symbol('getModelIsVisible');
export const $shouldAttemptPreload = Symbol('shouldAttemptPreload');

export interface Vector3D {
  x: number
  y: number
  z: number
  toString(): string
}

export const toVector3D = (v: Vector3) => {
  return {
    x: v.x,
    y: v.y,
    z: v.z,
    toString() {
      return `${this.x}m ${this.y}m ${this.z}m`;
    }
  };
};

export interface Vector2D {
  u: number
  v: number
  toString(): string
}

export const toVector2D = (v: Vector2) => {
  return {
    u: v.x,
    v: v.y,
    toString() {
      return `${this.u} ${this.v}`;
    }
  };
};

interface ToBlobOptions {
  mimeType?: string, qualityArgument?: number, idealAspect?: boolean
}

export interface FramingInfo {
  framedRadius: number;
  fieldOfViewAspect: number;
}

export interface Camera {
  viewMatrix: Array<number>;
  projectionMatrix: Array<number>;
}

export interface EffectComposerInterface {
  setRenderer(renderer: WebGLRenderer): void;
  setMainScene(scene: ModelScene): void;
  setMainCamera(camera: ThreeCamera): void;
  setSize(width: number, height: number): void;
  beforeRender(time: DOMHighResTimeStamp, delta: DOMHighResTimeStamp): void;
  render(deltaTime?: DOMHighResTimeStamp): void;
}

export interface RendererInterface {
  load(progressCallback: (progress: number) => void): Promise<FramingInfo>;
  render(camera: Camera): void;
  resize(width: number, height: number): void;
}

/**
 * Definition for a basic <model-viewer> element.
 */
export default class ModelViewerElementBase extends ReactiveElement {
  static get is() {
    return 'model-viewer';
  }

  /** @export */
  static set modelCacheSize(value: number) {
    CachingGLTFLoader[$evictionPolicy].evictionThreshold = value;
  }

  /** @export */
  static get modelCacheSize(): number {
    return CachingGLTFLoader[$evictionPolicy].evictionThreshold
  }

  /** @export */
  static set minimumRenderScale(value: number) {
    if (value > 1) {
      console.warn(
          '<model-viewer> minimumRenderScale has been clamped to a maximum value of 1.');
    }
    if (value <= 0) {
      console.warn(
          '<model-viewer> minimumRenderScale has been clamped to a minimum value of 0.25.');
    }
    Renderer.singleton.minScale = value;
  }

  /** @export */
  static get minimumRenderScale(): number {
    return Renderer.singleton.minScale;
  }

  @property({type: String}) alt: string|null = null;

  @property({type: String}) src: string|null = null;

  @property({type: Boolean, attribute: 'with-credentials'})
  withCredentials: boolean = false;

  /**
   * Generates a 3D model schema https://schema.org/3DModel associated with
   * the loaded src and inserts it into the header of the page for search
   * engines to crawl.
   */
  @property({type: Boolean, attribute: 'generate-schema'})
  generateSchema = false;

  protected[$isElementInViewport] = false;
  protected[$loaded] = false;
  protected[$loadedTime] = 0;
  protected[$scene]: ModelScene;
  protected[$container]: HTMLDivElement;
  protected[$userInputElement]: HTMLDivElement;
  protected[$canvas]: HTMLCanvasElement;
  protected[$statusElement]: HTMLSpanElement;
  protected[$status] = '';
  protected[$defaultAriaLabel]: string;
  protected[$clearModelTimeout]: number|null = null;

  protected[$fallbackResizeHandler] = debounce(() => {
    const boundingRect = this.getBoundingClientRect();
    this[$updateSize](boundingRect);
  }, FALLBACK_SIZE_UPDATE_THRESHOLD_MS);

  protected[$announceModelVisibility] = debounce((oldVisibility: boolean) => {
    const newVisibility = this.modelIsVisible;
    if (newVisibility !== oldVisibility) {
      this.dispatchEvent(new CustomEvent(
          'model-visibility', {detail: {visible: newVisibility}}));
    }
  }, ANNOUNCE_MODEL_VISIBILITY_DEBOUNCE_THRESHOLD);

  protected[$resizeObserver]: ResizeObserver|null = null;
  protected[$intersectionObserver]: IntersectionObserver|null = null;

  protected[$progressTracker]: ProgressTracker = new ProgressTracker();

  /** @export */
  get loaded() {
    return this[$getLoaded]();
  }

  get[$renderer]() {
    return Renderer.singleton;
  }

  /** @export */
  get modelIsVisible() {
    return this[$getModelIsVisible]();
  }

  /**
   * Creates a new ModelViewerElement.
   */
  constructor() {
    super();

    this.attachShadow({mode: 'open'});

    const shadowRoot = this.shadowRoot!;

    makeTemplate(shadowRoot);

    this[$container] = shadowRoot.querySelector('.container') as HTMLDivElement;
    this[$userInputElement] =
        shadowRoot.querySelector('.userInput') as HTMLDivElement;
    this[$canvas] = shadowRoot.querySelector('canvas') as HTMLCanvasElement;
    this[$statusElement] =
        shadowRoot.querySelector('#status') as HTMLSpanElement;
    this[$defaultAriaLabel] =
        this[$userInputElement].getAttribute('aria-label')!;

    // Because of potential race conditions related to invoking the constructor
    // we only use the bounding rect to set the initial size if the element is
    // already connected to the document:
    let width, height;
    if (this.isConnected) {
      const rect = this.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
    } else {
      width = UNSIZED_MEDIA_WIDTH;
      height = UNSIZED_MEDIA_HEIGHT;
    }

    // Create the underlying ModelScene.
    this[$scene] =
        new ModelScene({canvas: this[$canvas], element: this, width, height});

    // Update initial size on microtask timing so that subclasses have a
    // chance to initialize
    Promise.resolve().then(() => {
      this[$updateSize](this.getBoundingClientRect());
    });

    if (HAS_RESIZE_OBSERVER) {
      // Set up a resize observer so we can scale our canvas
      // if our <model-viewer> changes
      this[$resizeObserver] =
          new ResizeObserver((entries: Array<ResizeObserverEntry>) => {
            // Don't resize anything if in AR mode; otherwise the canvas
            // scaling to fullscreen on entering AR will clobber the flat/2d
            // dimensions of the element.
            if (this[$renderer].isPresenting) {
              return;
            }

            for (let entry of entries) {
              if (entry.target === this) {
                this[$updateSize](entry.contentRect);
              }
            }
          });
    }

    if (HAS_INTERSECTION_OBSERVER) {
      this[$intersectionObserver] = new IntersectionObserver(entries => {
        for (let entry of entries) {
          if (entry.target === this) {
            const oldVisibility = this.modelIsVisible;
            this[$isElementInViewport] = entry.isIntersecting;
            this[$announceModelVisibility](oldVisibility);
            if (this[$isElementInViewport] && !this.loaded) {
              this[$updateSource]();
            }
          }
        }
      }, {
        root: null,
        // We used to have margin here, but it was causing animated models below
        // the fold to steal the frame budget. Weirder still, it would also
        // cause input events to be swallowed, sometimes for seconds on the
        // model above the fold, but only when the animated model was completely
        // below. Setting this margin to zero fixed it.
        rootMargin: '0px',
        // With zero threshold, an element adjacent to but not intersecting the
        // viewport will be reported as intersecting, which will cause
        // unnecessary rendering. Any slight positive threshold alleviates this.
        threshold: 0.00001,
      });
    } else {
      // If there is no intersection observer, then all models should be visible
      // at all times:
      this[$isElementInViewport] = true;
    }
  }

  connectedCallback() {
    super.connectedCallback && super.connectedCallback();
    if (HAS_RESIZE_OBSERVER) {
      this[$resizeObserver]!.observe(this);
    } else {
      self.addEventListener('resize', this[$fallbackResizeHandler]);
    }

    if (HAS_INTERSECTION_OBSERVER) {
      this[$intersectionObserver]!.observe(this);
    }

    this.addEventListener('focus', this[$onFocus]);
    this.addEventListener('blur', this[$onBlur]);

    const renderer = this[$renderer];
    renderer.addEventListener(
        'contextlost', this[$onContextLost] as (event: ThreeEvent) => void);

    renderer.registerScene(this[$scene]);

    if (this[$clearModelTimeout] != null) {
      self.clearTimeout(this[$clearModelTimeout]!);
      this[$clearModelTimeout] = null;
      // Force an update in case the model has been evicted from our GLTF cache
      // @see https://lit-element.polymer-project.org/guide/lifecycle#requestupdate
      this.requestUpdate('src', null);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback && super.disconnectedCallback();
    if (HAS_RESIZE_OBSERVER) {
      this[$resizeObserver]!.unobserve(this);
    } else {
      self.removeEventListener('resize', this[$fallbackResizeHandler]);
    }

    if (HAS_INTERSECTION_OBSERVER) {
      this[$intersectionObserver]!.unobserve(this);
    }

    this.removeEventListener('focus', this[$onFocus]);
    this.removeEventListener('blur', this[$onBlur]);

    const renderer = this[$renderer];
    renderer.removeEventListener(
        'contextlost', this[$onContextLost] as (event: ThreeEvent) => void);

    renderer.unregisterScene(this[$scene]);

    this[$clearModelTimeout] = self.setTimeout(() => {
      this[$scene].dispose();
      this[$clearModelTimeout] = null;
    }, CLEAR_MODEL_TIMEOUT_MS);
  }

  updated(changedProperties: Map<string|number|symbol, any>) {
    super.updated(changedProperties);

    // NOTE(cdata): If a property changes from values A -> B -> A in the space
    // of a microtask, LitElement/UpdatingElement will notify of a change even
    // though the value has effectively not changed, so we need to check to make
    // sure that the value has actually changed before changing the loaded flag.
    if (changedProperties.has('src')) {
      if (this.src == null) {
        this[$loaded] = false;
        this[$loadedTime] = 0;
        this[$scene].reset();
      } else if (this.src !== this[$scene].url) {
        this[$loaded] = false;
        this[$loadedTime] = 0;
        this[$updateSource]();
      }
    }

    if (changedProperties.has('alt')) {
      this[$userInputElement].setAttribute('aria-label', this[$ariaLabel]);
    }

    if (changedProperties.has('generateSchema')) {
      if (this.generateSchema) {
        this[$scene].updateSchema(this.src);
      } else {
        this[$scene].updateSchema(null);
      }
    }
  }

  /** @export */
  toDataURL(type?: string, encoderOptions?: number): string {
    return this[$renderer]
        .displayCanvas(this[$scene])
        .toDataURL(type, encoderOptions);
  }

  /** @export */
  async toBlob(options?: ToBlobOptions): Promise<Blob> {
    const mimeType = options ? options.mimeType : undefined;
    const qualityArgument = options ? options.qualityArgument : undefined;
    const useIdealAspect = options ? options.idealAspect : undefined;

    const {width, height, idealAspect, aspect} = this[$scene];
    const {dpr, scaleFactor} = this[$renderer];
    let outputWidth = width * scaleFactor * dpr;
    let outputHeight = height * scaleFactor * dpr;
    let offsetX = 0;
    let offsetY = 0;
    if (useIdealAspect === true) {
      if (idealAspect > aspect) {
        const oldHeight = outputHeight;
        outputHeight = Math.round(outputWidth / idealAspect);
        offsetY = (oldHeight - outputHeight) / 2;
      } else {
        const oldWidth = outputWidth;
        outputWidth = Math.round(outputHeight * idealAspect);
        offsetX = (oldWidth - outputWidth) / 2;
      }
    }
    blobCanvas.width = outputWidth;
    blobCanvas.height = outputHeight;
    try {
      return new Promise<Blob>(async (resolve, reject) => {
        blobCanvas.getContext('2d')!.drawImage(
            this[$renderer].displayCanvas(this[$scene]),
            offsetX,
            offsetY,
            outputWidth,
            outputHeight,
            0,
            0,
            outputWidth,
            outputHeight);

        blobCanvas.toBlob((blob) => {
          if (!blob) {
            return reject(new Error('Unable to retrieve canvas blob'));
          }

          resolve(blob);
        }, mimeType, qualityArgument);
      });
    } finally {
      this[$updateSize]({width, height});
    };
  }

  /**
   * Registers a new EffectComposer as the main rendering pipeline,
   * instead of the default ThreeJs renderer.
   * This method also calls setRenderer, setMainScene, and setMainCamera on
   * your effectComposer.
   * @param effectComposer An EffectComposer from `pmndrs/postprocessing`
   */
  registerEffectComposer(effectComposer: EffectComposerInterface) {
    effectComposer.setRenderer(this[$renderer].threeRenderer);
    effectComposer.setMainCamera(this[$scene].getCamera());
    effectComposer.setMainScene(this[$scene]);
    this[$scene].effectRenderer = effectComposer;
  }

  /**
   * Removes the registered EffectComposer
   */
  unregisterEffectComposer() {
    this[$scene].effectRenderer = null;
  }

  registerRenderer(renderer: RendererInterface) {
    this[$scene].externalRenderer = renderer;
  }

  unregisterRenderer() {
    this[$scene].externalRenderer = null;
  }

  get[$ariaLabel]() {
    return this[$altDefaulted];
  }

  get[$altDefaulted]() {
    return (this.alt == null || this.alt === 'null') ? this[$defaultAriaLabel] :
                                                       this.alt;
  }

  // NOTE(cdata): Although this may seem extremely redundant, it is required in
  // order to support overloading when TypeScript is compiled to ES5
  // @see https://github.com/Polymer/lit-element/pull/745
  // @see https://github.com/microsoft/TypeScript/issues/338
  [$getLoaded](): boolean {
    return this[$loaded];
  }

  // @see [$getLoaded]
  [$getModelIsVisible](): boolean {
    return this.loaded && this[$isElementInViewport];
  }

  [$shouldAttemptPreload](): boolean {
    return !!this.src && this[$isElementInViewport];
  }

  /**
   * Called on initialization and when the resize observer fires.
   */
  [$updateSize]({width, height}: {width: number, height: number}) {
    if (width === 0 || height === 0) {
      return;
    }
    this[$container].style.width = `${width}px`;
    this[$container].style.height = `${height}px`;

    this[$onResize]({width, height});
  }

  [$tick](time: number, delta: number) {
    this[$scene].effectRenderer?.beforeRender(time, delta);
  }

  [$markLoaded]() {
    if (this[$loaded]) {
      return;
    }

    this[$loaded] = true;
    this[$loadedTime] = performance.now();
  }

  [$needsRender]() {
    this[$scene].queueRender();
  }

  [$onModelLoad]() {
  }

  [$updateStatus](status: string) {
    this[$status] = status;
    const rootNode = this.getRootNode() as Document | ShadowRoot | null;
    // Only change the aria-label if <model-viewer> is currently focused:
    if (rootNode != null && rootNode.activeElement === this &&
        this[$statusElement].textContent != status) {
      this[$statusElement].textContent = status;
    }
  }

  [$onFocus] = () => {
    this[$statusElement].textContent = this[$status];
  };

  [$onBlur] = () => {
    this[$statusElement].textContent = '';
  };

  [$onResize](e: {width: number, height: number}) {
    this[$scene].setSize(e.width, e.height);
  }

  [$onContextLost] = (event: ContextLostEvent) => {
    this.dispatchEvent(new CustomEvent(
        'error',
        {detail: {type: 'webglcontextlost', sourceError: event.sourceEvent}}));
  };

  /**
   * Parses the element for an appropriate source URL and
   * sets the views to use the new model based.
   */
  async[$updateSource]() {
    const scene = this[$scene];
    if (this.loaded || !this[$shouldAttemptPreload]() ||
        this.src === scene.url) {
      return;
    }

    if (this.generateSchema) {
      scene.updateSchema(this.src);
    }
    this[$updateStatus]('Loading');
    // If we are loading a new model, we need to stop the animation of
    // the current one (if any is playing). Otherwise, we might lose
    // the reference to the scene root and running actions start to
    // throw exceptions and/or behave in unexpected ways:
    scene.stopAnimation();

    const updateSourceProgress =
        this[$progressTracker].beginActivity('model-load');
    const source = this.src;
    try {
      const srcUpdated = scene.setSource(
          source,
          (progress: number) =>
              updateSourceProgress(clamp(progress, 0, 1) * 0.95));

      const envUpdated = (this as any)[$updateEnvironment]();

      await Promise.all([srcUpdated, envUpdated]);

      this[$markLoaded]();
      this[$onModelLoad]();

      this.updateComplete.then(() => {
        this.dispatchEvent(new CustomEvent('before-render'));
      });

      // Wait for shaders to compile and pixels to be drawn.
      await new Promise<void>(resolve => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            this.dispatchEvent(
                new CustomEvent('load', {detail: {url: source}}));
            resolve();
          });
        });
      });
    } catch (error) {
      this.dispatchEvent(new CustomEvent(
          'error', {detail: {type: 'loadfailure', sourceError: error}}));
    } finally {
      updateSourceProgress(1.0);
    }
  }
}
