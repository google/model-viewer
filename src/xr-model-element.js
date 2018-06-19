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
import { openIOSARQuickLook, getModelSource, getUSDZSource } from './utils.js';

const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

/**
 * Definition for a <xr-model> component.
 *
 */
export default class ModelViewComponent extends HTMLElement {

  static get observedAttributes() {
    return [
      'ar',
      'controls',
      'auto-rotate',
      'background-color',
    ];
  }

  constructor() {
    super();

    const shadowRoot = this.attachShadow({ mode: 'open' });
    shadowRoot.appendChild(template.content.cloneNode(true));

    // Create the underlying ModelView app.
    const { width, height } = this.getBoundingClientRect();
    this.__modelView = new ModelView({
      canvas: shadowRoot.querySelector('canvas'),
      width,
      height,
    });

    // Set up the "Enter AR" button
    this.__enterARButton = shadowRoot.querySelector('.enter-ar');
    this.__enterARButton.addEventListener('click', e => {
      e.preventDefault();
      this.enterAR()
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

    // Set a resize observer so we can scale our canvas
    // if our <xr-model> changes
    this.resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        if (entry.target === this) {
          const { width, height } = this.__modelView.getSize();
          if (entry.contentRect.width !== width ||
              entry.contentRect.height !== height) {
            this.__modelView.setSize(entry.contentRect.width, entry.contentRect.height);
          }
        }
      }
    });
    this.resizeObserver.observe(this);
  }

  enterAR() {
    const usdzSource = getUSDZSource(this);
    if (IS_IOS && usdzSource) {
      openIOSARQuickLook(usdzSource);
    } else {
      this.__modelView.enterAR();
    }
  }

  connectedCallback() {
  }

  disconnectedCallback() {
  }

  adoptedCallback(oldDoc, newDoc) {
  }

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
    }
  }

  __updateSource() {
    const { src, type } = getModelSource(this);
    this.__modelView.setModelSource(src, type);
  }

  __updateARButtonVisibility() {
    // On iOS, always enable the AR button. On non-iOS,
    // see if AR is supported, and if so, display the button after
    // an XRDevice has been initialized
    if (this.getAttribute('ar') !== null) {
      this.__enterARButton.style.display = 'none';
    } else {
      if (IS_IOS) {
        this.__enterARButton.style.display = 'block';
      } else if (this.__modelView.hasAR()) {
        this.__modelView.whenARReady().then(() => this.__enterARButton.style.display = 'block');
      }
    }
  }
}
