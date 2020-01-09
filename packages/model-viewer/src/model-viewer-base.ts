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

import {property} from 'lit-element';
import {UpdatingElement} from 'lit-element/lib/updating-element';
import {Event as ThreeEvent} from 'three';

import {HAS_INTERSECTION_OBSERVER, HAS_RESIZE_OBSERVER} from './constants.js';
import {makeTemplate} from './template.js';
import {$evictionPolicy, CachingGLTFLoader} from './three-components/CachingGLTFLoader.js';
import {ModelScene} from './three-components/ModelScene.js';
import {ContextLostEvent, Renderer} from './three-components/Renderer.js';
import {debounce, deserializeUrl, resolveDpr} from './utilities.js';
import {dataUrlToBlob} from './utilities/data-conversion.js';
import {ProgressTracker} from './utilities/progress-tracker.js';

const CLEAR_MODEL_TIMEOUT_MS = 1000;
const FALLBACK_SIZE_UPDATE_THRESHOLD_MS = 50;
const UNSIZED_MEDIA_WIDTH = 300;
const UNSIZED_MEDIA_HEIGHT = 150;

const $updateSize = Symbol('updateSize');
const $loaded = Symbol('loaded');
const $template = Symbol('template');
const $fallbackResizeHandler = Symbol('fallbackResizeHandler');
const $defaultAriaLabel = Symbol('defaultAriaLabel');
const $resizeObserver = Symbol('resizeObserver');
const $intersectionObserver = Symbol('intersectionObserver');
const $lastDpr = Symbol('lastDpr');
const $clearModelTimeout = Symbol('clearModelTimeout');
const $onContextLost = Symbol('onContextLost');
const $contextLostHandler = Symbol('contextLostHandler');

export const $isInRenderTree = Symbol('isInRenderTree');
export const $ariaLabel = Symbol('ariaLabel');
export const $loadedTime = Symbol('loadedTime');
export const $updateSource = Symbol('updateSource');
export const $markLoaded = Symbol('markLoaded');
export const $container = Symbol('container');
export const $canvas = Symbol('canvas');
export const $scene = Symbol('scene');
export const $needsRender = Symbol('needsRender');
export const $tick = Symbol('tick');
export const $onModelLoad = Symbol('onModelLoad');
export const $onResize = Symbol('onResize');
export const $onUserModelOrbit = Symbol('onUserModelOrbit');
export const $renderer = Symbol('renderer');
export const $progressTracker = Symbol('progressTracker');
export const $getLoaded = Symbol('getLoaded');
export const $getModelIsVisible = Symbol('getModelIsVisible');

interface ToBlobOptions {
  mimeType?: string, qualityArgument?: number, idealAspect?: boolean
}

/**
 * Definition for a basic <model-viewer> element.
 */
export default class ModelViewerElementBase extends UpdatingElement {
  protected static[$template]: HTMLTemplateElement|void;

  static get is() {
    return 'model-viewer';
  }

  /** @nocollapse */
  static get template() {
    if (!this.hasOwnProperty($template)) {
      this[$template] = makeTemplate(this.is);
    }

    return this[$template];
  }

  /** @export */
  static set modelCacheSize(value: number) {
    CachingGLTFLoader[$evictionPolicy].evictionThreshold = value;
  }

  /** @export */
  static get modelCacheSize(): number {
    return CachingGLTFLoader[$evictionPolicy].evictionThreshold
  }

  @property({type: String}) alt: string|null = null;

  @property({converter: {fromAttribute: deserializeUrl}})
  src: string|null = null;

  protected[$isInRenderTree] = false;
  protected[$loaded] = false;
  protected[$loadedTime] = 0;
  protected[$scene]: ModelScene;
  protected[$container]: HTMLDivElement;
  protected[$canvas]: HTMLCanvasElement;
  protected[$defaultAriaLabel]: string;
  protected[$lastDpr]: number = resolveDpr();
  protected[$clearModelTimeout]: number|null = null;

  protected[$fallbackResizeHandler] = debounce(() => {
    const boundingRect = this.getBoundingClientRect();
    this[$updateSize](boundingRect);
  }, FALLBACK_SIZE_UPDATE_THRESHOLD_MS);

  protected[$resizeObserver]: ResizeObserver|null = null;
  protected[$intersectionObserver]: IntersectionObserver|null = null;

  protected[$progressTracker]: ProgressTracker = new ProgressTracker();

  protected[$contextLostHandler] = (event: ContextLostEvent) =>
      this[$onContextLost](event);

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

    // NOTE(cdata): It is *very important* to access this template first so that
    // the ShadyCSS template preparation steps happen before element styling in
    // IE11:
    const template = (this.constructor as any).template as HTMLTemplateElement;

    if ((window as any).ShadyCSS) {
      (window as any).ShadyCSS.styleElement(this, {});
    }

    // NOTE(cdata): The canonical ShadyCSS examples suggest that the Shadow Root
    // should be created after the invocation of ShadyCSS.styleElement
    this.attachShadow({mode: 'open', delegatesFocus: true});

    const shadowRoot = this.shadowRoot!;

    shadowRoot.appendChild(template.content.cloneNode(true));

    this[$container] = shadowRoot.querySelector('.container') as HTMLDivElement;
    this[$canvas] = shadowRoot.querySelector('canvas') as HTMLCanvasElement;
    this[$defaultAriaLabel] = this[$canvas].getAttribute('aria-label')!;

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

    this[$scene].addEventListener('model-load', (event) => {
      this[$markLoaded]();
      this[$onModelLoad](event);

      this.dispatchEvent(
          new CustomEvent('load', {detail: {url: (event as any).url}}));
    });

    // Update initial size on microtask timing so that subclasses have a
    // chance to initialize
    Promise.resolve().then(() => {
      this[$updateSize](this.getBoundingClientRect(), true);
    });

    if (HAS_RESIZE_OBSERVER) {
      // Set up a resize observer so we can scale our canvas
      // if our <model-viewer> changes
      this[$resizeObserver] = new ResizeObserver((entries) => {
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
      const enterRenderTreeProgress = this[$progressTracker].beginActivity();

      this[$intersectionObserver] = new IntersectionObserver(entries => {
        for (let entry of entries) {
          if (entry.target === this) {
            const oldValue = this[$isInRenderTree];
            this[$isInRenderTree] = this[$scene].visible = entry.isIntersecting;
            this.requestUpdate($isInRenderTree, oldValue);

            if (this[$isInRenderTree]) {
              // Wait a microtask to give other properties a chance to respond
              // to the state change, then resolve progress on entering the
              // render tree:
              Promise.resolve().then(() => {
                enterRenderTreeProgress(1);
              });
            }
          }
        }
      }, {
        root: null,
        rootMargin: '10px',
        threshold: 0,
      });
    } else {
      // If there is no intersection obsever, then all models should be visible
      // at all times:
      this[$isInRenderTree] = this[$scene].visible = true;
      this.requestUpdate($isInRenderTree, false);
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

    this[$renderer].addEventListener(
        'contextlost',
        this[$contextLostHandler] as (event: ThreeEvent) => void);

    this[$renderer].registerScene(this[$scene]);
    this[$scene].isDirty = true;

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

    this[$renderer].removeEventListener(
        'contextlost',
        this[$contextLostHandler] as (event: ThreeEvent) => void);

    this[$renderer].unregisterScene(this[$scene]);

    this[$clearModelTimeout] = self.setTimeout(() => {
      this[$scene].model.clear();
    }, CLEAR_MODEL_TIMEOUT_MS);
  }

  updated(changedProperties: Map<string|number|symbol, any>) {
    super.updated(changedProperties);

    // NOTE(cdata): If a property changes from values A -> B -> A in the space
    // of a microtask, LitElement/UpdatingElement will notify of a change even
    // though the value has effectively not changed, so we need to check to make
    // sure that the value has actually changed before changing the loaded flag.
    if (changedProperties.has('src') &&
        (this.src == null || this.src !== this[$scene].model.url)) {
      this[$loaded] = false;
      this[$loadedTime] = 0;
      this[$updateSource]();
    }

    if (changedProperties.has('alt')) {
      const ariaLabel = this.alt == null ? this[$defaultAriaLabel] : this.alt;
      this[$canvas].setAttribute('aria-label', ariaLabel);
    }
  }

  /** @export */
  toDataURL(type?: string, encoderOptions?: number): string {
    return this[$canvas].toDataURL(type, encoderOptions);
  }

  /** @export */
  async toBlob(options?: ToBlobOptions): Promise<Blob> {
    const mimeType = options ? options.mimeType : undefined;
    const qualityArgument = options ? options.qualityArgument : undefined;
    const idealAspect = options ? options.idealAspect : undefined;
    const {width, height, model, aspect} = this[$scene];
    if (idealAspect === true) {
      const idealWidth = model.fieldOfViewAspect > aspect ?
          width :
          Math.round(height * model.fieldOfViewAspect);
      const idealHeight = model.fieldOfViewAspect > aspect ?
          Math.round(width / model.fieldOfViewAspect) :
          height;
      this[$updateSize]({width: idealWidth, height: idealHeight});
      await new Promise(resolve => requestAnimationFrame(resolve));
    }
    try {
      return new Promise<Blob>(async (resolve, reject) => {
        if ((this[$canvas] as any).msToBlob) {
          // NOTE: msToBlob only returns image/png
          // so ensure mimeType is not specified (defaults to image/png)
          // or is image/png, otherwise fallback to using toDataURL on IE.
          if (!mimeType || mimeType === 'image/png') {
            return resolve((this[$canvas] as any).msToBlob());
          }
        }

        if (!this[$canvas].toBlob) {
          return resolve(await dataUrlToBlob(
              this[$canvas].toDataURL(mimeType, qualityArgument)));
        }

        this[$canvas].toBlob((blob) => {
          if (!blob) {
            return reject(new Error('Unable to retrieve canvas blob'));
          }

          resolve(blob);
        }, mimeType, qualityArgument);
      })
    } finally {
      this[$updateSize]({width, height});
    };
  }

  get[$ariaLabel]() {
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
    return true;
  }

  /**
   * Called on initialization and when the resize observer fires.
   */
  [$updateSize](
      {width, height}: {width: any, height: any}, forceApply = false) {
    const {width: prevWidth, height: prevHeight} = this[$scene].getSize();
    // Round off the pixel size
    const intWidth = parseInt(width, 10);
    const intHeight = parseInt(height, 10);

    this[$container].style.width = `${width}px`;
    this[$container].style.height = `${height}px`;

    if (forceApply || (prevWidth !== intWidth || prevHeight !== intHeight)) {
      this[$onResize]({width: intWidth, height: intHeight});
    }
  }

  [$tick](_time: number, _delta: number) {
    const dpr = resolveDpr();
    // There is no standard way to detect when DPR changes on account of zoom.
    // Here we keep a local copy of DPR updated, and when it changes we invoke
    // the fallback resize handler. It might be better to invoke the resize
    // handler directly in this case, but the fallback is debounced which will
    // save us from doing too much work when DPR and window size changes at the
    // same time.
    if (dpr !== this[$lastDpr]) {
      this[$lastDpr] = dpr;
      this[$fallbackResizeHandler]();
    }
  }

  [$markLoaded]() {
    if (this[$loaded]) {
      return;
    }

    this[$loaded] = true;
    this[$loadedTime] = performance.now();
    // Asynchronously invoke `update`:
    this.requestUpdate();
  }

  [$needsRender]() {
    this[$scene].isDirty = true;
  }

  [$onModelLoad](_event: any) {
    this[$needsRender]();
  }

  [$onResize](e: {width: number, height: number}) {
    this[$scene].setSize(e.width, e.height);
    this[$needsRender]();
  }

  [$onContextLost](event: ContextLostEvent) {
    this.dispatchEvent(new CustomEvent(
        'error',
        {detail: {type: 'webglcontextlost', sourceError: event.sourceEvent}}));
  }

  /**
   * Parses the element for an appropriate source URL and
   * sets the views to use the new model based off of the `preload`
   * attribute.
   */
  async[$updateSource]() {
    const updateSourceProgress = this[$progressTracker].beginActivity();
    const source = this.src;

    try {
      this[$canvas].classList.add('show');
      await this[$scene].setModelSource(
          source, (progress: number) => updateSourceProgress(progress * 0.9));
    } catch (error) {
      this[$canvas].classList.remove('show');
      this.dispatchEvent(new CustomEvent('error', {detail: error}));
    } finally {
      updateSourceProgress(1.0);
    }
  }
}
