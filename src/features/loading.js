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

import {$updateSource} from '../model-viewer-base.js';
import {CachingGLTFLoader} from '../three-components/CachingGLTFLoader.js';
import {deserializeUrl} from '../utils.js';

const $posterElement = Symbol('posterElement');
const $applyPreloadStrategy = Symbol('applyPreloadStrategy');

const $revealDeferred = Symbol('revealDeferred');
const $dismissPoster = Symbol('dismissPoster');
const $shouldHidePoster = Symbol('shouldHidePoster');
const $preloaded = Symbol('preloaded');
const $preloadPromise = Symbol('preloadPromise');

const loader = new CachingGLTFLoader();

export const LoadingMixin = (ModelViewerElement) => {
  return class extends ModelViewerElement {
    static get properties() {
      return {
        ...super.properties,
        poster: {type: deserializeUrl},
        preload: {type: Boolean},
        revealWhenLoaded: {type: Boolean, attribute: 'reveal-when-loaded'}
      };
    }

    get loaded() {
      return super.loaded || this[$preloaded];
    }

    constructor() {
      super();

      this[$preloaded] = false;
      this[$preloadPromise] = null;

      // Used to determine whether or not to display a poster image or
      // to load the model if not preloaded.
      this[$dismissPoster] = false;

      // TODO: Add this to the shadow root as part of this mixin's
      // implementation:
      this[$posterElement] = this.shadowRoot.querySelector('.poster');

      // Fired when a user first clicks the model element. Used to
      // change the visibility of a poster image, or start loading
      // a model.
      this.addEventListener('click', () => {this.dismissPoster()});
    }

    dismissPoster() {
      this[$dismissPoster] = true;
      this.requestUpdate();
    }

    showPoster() {
      this[$dismissPoster] = false;
      this.requestUpdate();
    }

    get[$shouldHidePoster]() {
      return !this.poster || (this.loaded && this[$dismissPoster]);
    }

    get[$revealDeferred]() {
      return !!this.preload && !this[$shouldHidePoster];
    }

    update(changedProperties) {
      if (this.loaded && this.revealWhenLoaded) {
        this.dismissPoster();
      }

      super.update(changedProperties);

      if (this[$shouldHidePoster]) {
        this[$posterElement].classList.remove('show');
      } else {
        if ((this.preload || this[$dismissPoster]) && this.src) {
          this[$applyPreloadStrategy]();
        }

        if (this.poster) {
          this[$posterElement].style.backgroundImage = `url("${this.poster}")`;
          this[$posterElement].classList.add('show');
        }
      }
    }

    async[$applyPreloadStrategy]() {
      if (this[$preloadPromise] != null) {
        return this[$preloadPromise];
      }

      if (!this.src) {
        return;
      }

      // Only one strategy for now. Load right away:
      this[$preloadPromise] = loader.load(this.src);
      await this[$preloadPromise];
      this[$preloaded] = true;
      this.dispatchEvent(new CustomEvent('preload'));

      // Once preloaded, we want to re-evaluate the element's state:
      this.requestUpdate();
    }

    [$updateSource]() {
      if (!this[$shouldHidePoster]) {
        return;
      }

      super[$updateSource]();
    }
  };
}
