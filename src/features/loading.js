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

import {$ariaLabel, $canvas, $updateSource} from '../model-viewer-base.js';
import {CachingGLTFLoader} from '../three-components/CachingGLTFLoader.js';
import {debounce, deserializeUrl} from '../utils.js';
import {LoadingStatusAnnouncer} from './loading/status-announcer.js';

export const $posterElement = Symbol('posterElement');
const $applyPreloadStrategy = Symbol('applyPreloadStrategy');

const $revealDeferred = Symbol('revealDeferred');
const $dismissPoster = Symbol('dismissPoster');
const $shouldHidePoster = Symbol('shouldHidePoster');
const $preloaded = Symbol('preloaded');
const $preloadPromise = Symbol('preloadPromise');
const $ariaLabelCallToAction = Symbol('ariaLabelCallToAction');

const $clickHandler = Symbol('clickHandler');
const $keydownHandler = Symbol('keydownHandler');
const $onClick = Symbol('onClick');
const $onKeydown = Symbol('onKeydown');

const loader = new CachingGLTFLoader();
const loadingStatusAnnouncer = new LoadingStatusAnnouncer();

export const POSTER_TRANSITION_TIME = 300;
const SPACE_KEY = 32;
const ENTER_KEY = 13;


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

      this[$ariaLabelCallToAction] =
          this[$posterElement].getAttribute('aria-label');

      this[$clickHandler] = () => this[$onClick]();
      this[$keydownHandler] = () => this[$onKeydown]();
    }

    connectedCallback() {
      super.connectedCallback();

      // Fired when a user first clicks the model element. Used to
      // change the visibility of a poster image, or start loading
      // a model.
      this[$posterElement].addEventListener('click', () => this[$onClick]());
      this[$posterElement].addEventListener(
          'keydown', (event) => this[$onKeydown](event));

      loadingStatusAnnouncer.registerInstance(this);
    }

    disconnectedCallback() {
      super.disconnectedCallback();

      this[$posterElement].removeEventListener('click', () => this[$onClick]());
      this[$posterElement].removeEventListener(
          'keydown', (event) => this[$onKeydown](event));

      loadingStatusAnnouncer.unregisterInstance(this);
    }

    dismissPoster() {
      this[$dismissPoster] = true;

      const posterOpacity = self.getComputedStyle(this[$posterElement]).opacity;

      if (posterOpacity > 0) {
        // NOTE(cdata): The canvas cannot receive focus until the poster has
        // been completely hidden:
        this[$posterElement].addEventListener('transitionend', () => {
          this[$canvas].focus();
        }, {once: true});
      } else {
        // NOTE(cdata): Depending on timing, the opacity may already be 0, in
        // which case we will never receive a transitionend event. So, just
        // focus on the next animation frame:
        requestAnimationFrame(() => {
          this[$canvas].focus();
        });
      }

      this.requestUpdate();
    }

    showPoster() {
      this[$dismissPoster] = false;
      this.requestUpdate();
    }

    [$onClick]() {
      this.dismissPoster();
    }

    [$onKeydown](event) {
      switch (event.keyCode) {
        // NOTE(cdata): Links and buttons can typically be activated with both
        // spacebar and enter to produce a synthetic click action
        case SPACE_KEY:
        case ENTER_KEY:
          this.dismissPoster();
          break;
        default:
          break;
      }
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

      const posterElement = this[$posterElement];

      if (changedProperties.has('alt')) {
        posterElement.setAttribute(
            'aria-label',
            `${this[$ariaLabel]}. ${this[$ariaLabelCallToAction]}`);
      }

      if (this[$shouldHidePoster]) {
        posterElement.classList.remove('show');
        posterElement.setAttribute('aria-hidden', 'true');
        posterElement.removeAttribute('tabindex');
      } else {
        if ((this.preload || this[$dismissPoster]) && this.src) {
          this[$applyPreloadStrategy]().catch((error) => {
            this.dispatchEvent(new CustomEvent('error', {detail: error}));
          });
        }

        if (this.poster) {
          posterElement.style.backgroundImage = `url("${this.poster}")`;
          posterElement.classList.add('show');
          posterElement.removeAttribute('aria-hidden');
          posterElement.tabIndex = 1;
        }
      }
    }

    async[$applyPreloadStrategy]() {
      if (this[$preloadPromise] != null) {
        return this[$preloadPromise];
      }

      if (!this.src) {
        console.warn('No src to preload!');
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
