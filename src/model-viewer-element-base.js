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

import {UpdatingElement} from '@polymer/lit-element/lib/updating-element';

import ModelScene from './three-components/ModelScene.js';
import Renderer from './three-components/Renderer.js';

import template from './template.js';
import {deserializeUrl} from './utils.js';

const renderer = new Renderer();

const $updateSize = Symbol('updateSize');
const $loaded = Symbol('loaded');

export const $updateSource = Symbol('updateSource');
export const $markLoaded = Symbol('markLoaded');
export const $container = Symbol('container');
export const $canvas = Symbol('canvas');
export const $scene = Symbol('scene');
export const $needsRender = Symbol('needsRender');
export const $tick = Symbol('tick');
export const $onModelLoad = Symbol('onModelLoad');
export const $onResize = Symbol('onResize');
export const $renderer = Symbol('renderer');

/**
 * Definition for a basic <model-viewer> element.
 *
 */
export default class ModelViewerElementBase extends UpdatingElement {
  static get properties() {
    return {src: {type: deserializeUrl}};
  }

  get loaded() {
    return this[$loaded];
  }

  get[$renderer]() {
    return renderer;
  }

  /**
   * Creates a new ModelViewerElement.
   */
  constructor() {
    super();

    if (window.ShadyCSS) {
      window.ShadyCSS.styleElement(this);
    }

    const {shadowRoot} = this;
    shadowRoot.appendChild(template.content.cloneNode(true));

    this[$container] = shadowRoot.querySelector('.container');
    this[$canvas] = shadowRoot.querySelector('canvas');

    // Create the underlying ModelScene.
    const {width, height} = this.getBoundingClientRect();
    this[$scene] = new ModelScene(
        {canvas: this[$canvas], element: this, width, height, renderer});

    this[$loaded] = false;

    this[$scene].addEventListener('model-load', () => {
      this[$markLoaded]();
      this[$onModelLoad]();

      this.dispatchEvent(new CustomEvent('load'));
    });

    // Update initial size on microtask timing so that subclasses have a chance
    // to initialize
    Promise.resolve().then(() => {
      this[$updateSize](this.getBoundingClientRect(), true);
    });

    // Set a resize observer so we can scale our canvas
    // if our <model-viewer> changes
    this.resizeObserver = new ResizeObserver(entries => {
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
    this.resizeObserver.observe(this);

    this.intersectionObserver = new IntersectionObserver(entries => {
      for (let entry of entries) {
        if (entry.target === this) {
          this[$scene].isVisible = entry.isIntersecting;
        }
      }
    }, {
      root: null,
      rootMargin: '10px',
      threshold: 0.1,
    });
    this.intersectionObserver.observe(this);
  }

  connectedCallback() {
    this[$renderer].registerScene(this[$scene]);
    this[$scene].isDirty = true;
  }

  disconnectedCallback() {
    this[$renderer].unregisterScene(this[$scene]);
  }

  update(changedProperties) {
    this[$updateSource]();
  }

  /**
   * Called on initialization and when the resize observer fires.
   */
  [$updateSize]({width, height}, forceApply) {
    const {width: prevWidth, height: prevHeight} = this[$scene].getSize();
    // Round off the pixel size
    width = parseInt(width, 10);
    height = parseInt(height, 10);

    if (forceApply || (prevWidth !== width || prevHeight !== height)) {
      this[$container].style.width = `${width}px`;
      this[$container].style.height = `${height}px`;
      this[$onResize]({width, height});
    }
  }

  [$tick](time, delta) {
  }

  [$markLoaded]() {
    this[$loaded] = true;
    // Asynchronously invoke `update`:
    this.requestUpdate();
  }

  [$needsRender]() {
    this[$scene].isDirty = true;
  }

  [$onModelLoad](e) {
    this[$needsRender]();
  }

  [$onResize](e) {
    this[$scene].setSize(e.width, e.height);
    this[$needsRender]();
  }

  /**
   * Parses the element for an appropriate source URL and
   * sets the views to use the new model based off of the `preload`
   * attribute.
   */
  [$updateSource]() {
    const source = this.src;

    if (!source) {
      return;
    }

    this[$canvas].classList.add('show');
    this[$scene].setModelSource(source);
  }
}
