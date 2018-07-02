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

import ResizeObserver from 'resize-observer-polyfill';
import ModelView from './views/ModelView.js';
import template from './template.js';
import { openIOSARQuickLook, getWebGLSource, getiOSSource } from './utils.js';

const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

/**
 * Definition for a <xr-model> element.
 *
 */
export default class XRModelElement extends HTMLElement {
  /**
   * Attributes that fire `attributeChangedCallback`.
   */
  static get observedAttributes() {
    return [
      'ar',
      'controls',
      'auto-rotate',
      'background-color',
      'vignette',
      'poster',
      'preload',
    ];
  }

  /**
   * Creates a new XRModelElement.
   */
  constructor() {
    super();

    const shadowRoot = this.attachShadow({ mode: 'open' });
    shadowRoot.appendChild(template.content.cloneNode(true));

    this.__containerElement = shadowRoot.querySelector('.container');
    this.__posterElement = shadowRoot.querySelector('.poster');
    this.__canvasElement = shadowRoot.querySelector('canvas');
    this.__clickToViewElement = shadowRoot.querySelector('.click-to-view');
    this.__enterARElement = shadowRoot.querySelector('.enter-ar');

    // Create the underlying ModelView app.
    const { width, height } = this.getBoundingClientRect();
    this.__modelView = new ModelView({
      canvas: this.__canvasElement,
      width,
      height,
    });

    // Tracks whether or not the user has interacted with this element;
    // used to determine whether or not to display a poster image or
    // to load the model if not preloaded.
    this.__userInput = false;

    // Fired when a user first clicks the model element. Used to
    // change the visibility of a poster image, or start loading
    // a model.
    this.addEventListener('click', () => {
      // Hide the poster always whether it exists or not
      this.__posterElement.classList.remove('show');
      this.__clickToViewElement.classList.remove('show');
      this.__userInput = true;

      // Update the source so it can start loading if
      // not preloaded
      this.__updateSource();
    }, { once: true });

    this.__mode = 'dom';
    this.__modelView.addEventListener('enter-ar', () => {
      this.__mode = 'ar';
    });
    this.__modelView.addEventListener('enter-dom', () => {
      this.__mode = 'dom';
    });
    this.__modelView.addEventListener('model-load', () => {
      this.dispatchEvent(new Event('load'));
    });

    // Set up the "Enter AR" button
    this.__enterARElement.addEventListener('click', e => {
      e.preventDefault();
      this.enterAR();
    });

    // Observe changes in this element, mainly for new <source> children,
    // or <source> changes. Update underlying ModelView if a new source
    // file becomes valid.
    this.mutationObserver = new MutationObserver(() => this.__updateSource(this));
    this.mutationObserver.observe(this, {
      childList: true,
      attributes: true,
      subtree: true,
    });

    // Update the sources on construction
    this.__updateSource(this);

    // Update initial size
    this.__updateSize(this.getBoundingClientRect(), true);

    // Set a resize observer so we can scale our canvas
    // if our <xr-model> changes
    this.resizeObserver = new ResizeObserver(entries => {
      // Don't resize anything if in AR mode; otherwise the canvas
      // scaling to fullscreen on entering AR will clobber the flat/2d
      // dimensions of the element.
      if (this.__mode === 'ar') {
        return;
      }
      for (let entry of entries) {
        if (entry.target === this) {
          this.__updateSize(entry.contentRect);
        }
      }
    });
    this.resizeObserver.observe(this);
  }

  /**
   * Enables the AR
   */
  enterAR() {
    if (IS_IOS || this.__modelView.hasAR()) {
      const usdzSource = getiOSSource(this);
      if (IS_IOS && usdzSource) {
        openIOSARQuickLook(usdzSource.src);
      } else {
        this.__modelView.enterAR();
      }
    }
  }

  /**
   * Called when custom element is first connected to document's DOM.
   */
  connectedCallback() {
  }

  /**
   * Called when custom element is disconnected connected to document's DOM.
   */
  disconnectedCallback() {
  }

  /**
   * Called when custom element is moved to a new document
   *
   * @param {Document} oldDoc
   * @param {Document} newDoc
   */
  adoptedCallback(oldDoc, newDoc) {
  }

  /**
   * Called when custom element's attribute in observedAttributes
   * has changed.
   *
   * @param {String} name
   * @param {?String} oldVal
   * @param {?String} newVal
   * @param {String} namespace
   */
  attributeChangedCallback(name, oldVal, newVal, namespace) {
    switch (name) {
      case 'ar':
        this.__updateARButtonVisibility();
        break;
      case 'auto-rotate':
        this.__modelView.setRotate(this.getAttribute('auto-rotate') !== null);
        break;
      case 'controls':
        this.__modelView.setControls(this.getAttribute('controls') !== null);
        break;
      case 'background-color':
        this.__modelView.setBackgroundColor(newVal);
        break;
      case 'vignette':
        this.__modelView.setVignette(this.getAttribute('vignette') !== null);
        break;
      case 'poster':
        this.__updatePoster(newVal);
        break;
      case 'preload':
        this.__updateSource();
        break;
    }
  }

  /**
   * Parses the element for an appropriate source URL and
   * sets the views to use the new model based off of the `preload`
   * attribute.
   */
  __updateSource() {
    const preload = this.getAttribute('preload');
    const source = getWebGLSource(this) || {};

    if (preload !== null || this.__userInput) {
      this.__canvasElement.classList.add('show');
      this.__modelView.setModelSource(source.src, source.type);
      this.__clickToViewElement.classList.remove('show');
    }
  }

  /**
   * Called when the `poster` attribute changes. Display
   * the poster image if it's valid and the user has not interacted
   * with the content yet.
   *
   * @param {?String} src
   */
  __updatePoster(src) {
    if (src) {
      if (!this.__userInput) {
        this.__posterElement.classList.add('show');
        this.__clickToViewElement.classList.add('show');
      }
      this.__posterElement.setAttribute('src', src);
    } else {
      this.__posterElement.removeAttribute('src');
      this.__posterElement.classList.remove('show');
    }
  }

  /**
   * Called on initialization and when the resize observer fires.
   */
  __updateSize({ width, height }, forceApply) {
    const { width: prevWidth, height: prevHeight } = this.__modelView.getSize();

    if (forceApply || (prevWidth !== width || prevHeight !== height)) {
      this.__containerElement.style.width = `${width}px`;
      this.__containerElement.style.height = `${height}px`;
      this.__modelView.setSize(width, height);
    }
  }

  /**
   * Updates the visibility of the AR button based off of attributes
   * and platform.
   */
  __updateARButtonVisibility() {
    // On iOS, always enable the AR button. On non-iOS,
    // see if AR is supported, and if so, display the button after
    // an XRDevice has been initialized
    if (this.getAttribute('ar') === null) {
      this.__enterARElement.style.display = 'none';
    } else {
      if (IS_IOS && getiOSSource(this)) {
        this.__enterARElement.style.display = 'block';
      } else if (this.__modelView.hasAR()) {
        this.__modelView.whenARReady().then(() => this.__enterARElement.style.display = 'block');
      }
    }
  }
}
