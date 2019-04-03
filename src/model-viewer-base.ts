/*
 * Copyright 2019 Google Inc. All Rights Reserved.
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

import {HAS_INTERSECTION_OBSERVER, HAS_RESIZE_OBSERVER} from './constants.js';
import {makeTemplate} from './template.js';
import ModelScene from './three-components/ModelScene.js';
import Renderer from './three-components/Renderer.js';
import {ProgressTracker} from './utilities/progress-tracker.js';
import {debounce, deserializeUrl, resolveDpr} from './utilities.js';

let renderer = new Renderer();

const FALLBACK_SIZE_UPDATE_THRESHOLD_MS = 50;

const $updateSize = Symbol('updateSize');
const $loaded = Symbol('loaded');
const $template = Symbol('template');
const $fallbackResizeHandler = Symbol('fallbackResizeHandler');
const $defaultAriaLabel = Symbol('defaultAriaLabel');
const $resizeObserver = Symbol('resizeObserver');
const $intersectionObserver = Symbol('intersectionObserver');
const $lastDpr = Symbol('lastDpr');

export const $ariaLabel = Symbol('ariaLabel');
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
export const $resetRenderer = Symbol('resetRenderer');
export const $progressTracker = Symbol('progressTracker');

/**
 * Definition for a basic <model-viewer> element.
 */
export default class ModelViewerElementBase extends UpdatingElement {
  protected static[$template]: HTMLTemplateElement|void;

  static get is() {
    return 'model-viewer';
  }

  static get template() {
    if (!this.hasOwnProperty($template)) {
      this[$template] = makeTemplate(this.is);
    }

    return this[$template];
  }

  static[$resetRenderer]() {
    renderer.dispose();
    renderer = new Renderer();
  }

  @property({type: String}) alt: string|null = null;

  @property({converter: {fromAttribute: deserializeUrl}})
  src: string|null = null;

  protected[$loaded]: boolean = false;
  protected[$scene]: ModelScene;
  protected[$container]: HTMLDivElement;
  protected[$canvas]: HTMLCanvasElement;
  protected[$defaultAriaLabel]: string;
  protected[$lastDpr]: number = resolveDpr();

  protected[$fallbackResizeHandler] = debounce(() => {
    const boundingRect = this.getBoundingClientRect();
    this[$updateSize](boundingRect);
  }, FALLBACK_SIZE_UPDATE_THRESHOLD_MS);

  protected[$resizeObserver]: ResizeObserver|null = null;
  protected[$intersectionObserver]: IntersectionObserver|null = null;

  protected[$progressTracker]: ProgressTracker = new ProgressTracker();

  get loaded() {
    return this[$loaded];
  }

  get[$renderer]() {
    return renderer;
  }

  get modelIsVisible() {
    return true;
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

    // Create the underlying ModelScene.
    const {width, height} = this.getBoundingClientRect();
    this[$scene] = new ModelScene(
        {canvas: this[$canvas], element: this, width, height, renderer});

    this[$scene].addEventListener('model-load', (event) => {
      this[$markLoaded]();
      this[$onModelLoad](event);

      this.dispatchEvent(new CustomEvent('load', {detail: {url: event.url}}));
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
        if (renderer.isPresenting) {
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
            this[$scene].isVisible = entry.isIntersecting;
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
      this[$scene].isVisible = true;
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

    this[$renderer].registerScene(this[$scene]);
    this[$scene].isDirty = true;
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

    this[$renderer].unregisterScene(this[$scene]);
  }

  updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);

    // NOTE(cdata): If a property changes from values A -> B -> A in the space
    // of a microtask, LitElement/UpdatingElement will notify of a change even
    // though the value has effectively not changed, so we need to check to make
    // sure that the value has actually changed before changing the loaded flag.
    if (changedProperties.has('src') && this.src !== this[$scene].model.url) {
      this[$loaded] = false;
      (async () => {
        const updateSourceProgress = this[$progressTracker].beginActivity();
        await this[$updateSource](
            (progress: number) => updateSourceProgress(progress * 0.9));
        updateSourceProgress(1.0);
      })();
    }

    if (changedProperties.has('alt')) {
      const ariaLabel = this.alt == null ? this[$defaultAriaLabel] : this.alt;
      this[$canvas].setAttribute('aria-label', ariaLabel);
    }
  }

  get[$ariaLabel]() {
    return (this.alt == null || this.alt === 'null') ? this[$defaultAriaLabel] :
                                                       this.alt;
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

  [$onUserModelOrbit]() {}

  /**
   * Parses the element for an appropriate source URL and
   * sets the views to use the new model based off of the `preload`
   * attribute.
   */
  async[$updateSource](
      progressCallback: (progress: number) => void = () => {}) {
    const source = this.src;

    try {
      this[$canvas].classList.add('show');
      await this[$scene].setModelSource(source, progressCallback);
    } catch (error) {
      this[$canvas].classList.remove('show');
      this.dispatchEvent(new CustomEvent('error', {detail: error}));
    }
  }
}
