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

const $dismissPoster = Symbol('dismissPoster');
const $showPoster = Symbol('showPoster');
const $hidePoster = Symbol('hidePoster');
const $posterHidden = Symbol('posterHidden');
const $userDismissedPoster = Symbol('userDismissedPoster');
const $shouldDismissPoster = Symbol('shouldDismissPoster');
const $shouldAttemptPreload = Symbol('shouldAttemptPreload');
const $preloadAnnounced = Symbol('preloadAnnounced');
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
      return super.loaded ||
          (this.src && CachingGLTFLoader.hasFinishedLoading(this.src));
    }

    constructor() {
      super();

      this[$posterHidden] = true;
      this[$preloadAnnounced] = false;

      // Used to determine whether or not to display a poster image or
      // to load the model if not preloaded.
      this[$userDismissedPoster] = false;

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
      this[$userDismissedPoster] = true;
      this.requestUpdate();
    }

    showPoster() {
      this[$userDismissedPoster] = false;
      this.requestUpdate();
    }

    [$hidePoster]() {
      const posterElement = this[$posterElement];
      const posterOpacity = self.getComputedStyle(posterElement).opacity;
      const onPosterHidden = () => {
        requestAnimationFrame(() => {
          console.warn('POSTER HIDDEN');
          this.dispatchEvent(
              new CustomEvent('poster-visibility', {detail: {visible: false}}));
          this[$canvas].focus();
        });
      };

      this[$posterHidden] = true;

      if (posterOpacity > 0) {
        // NOTE(cdata): The canvas cannot receive focus until the poster has
        // been completely hidden:
        posterElement.addEventListener(
            'transitionend', onPosterHidden, {once: true});
      } else {
        // NOTE(cdata): Depending on timing, the opacity may already be 0, in
        // which case we will never receive a transitionend event. So, just
        // focus on the next animation frame:
        onPosterHidden();
        // requestAnimationFrame(onPosterHidden);
      }

      posterElement.classList.remove('show');
      posterElement.setAttribute('aria-hidden', 'true');
      posterElement.removeAttribute('tabindex');
    }

    [$showPoster]() {
      const posterElement = this[$posterElement];
      posterElement.classList.add('show');
      posterElement.setAttribute('aria-hidden', 'false');
      posterElement.tabIndex = 1;

      this[$posterHidden] = false;

      this.dispatchEvent(
          new CustomEvent('poster-visibility', {detail: {visible: true}}));
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

    get[$shouldDismissPoster]() {
      return !this.poster ||
          (CachingGLTFLoader.hasFinishedLoading(this.src) &&
           (this.revealWhenLoaded || this[$userDismissedPoster]));
    }

    get[$shouldAttemptPreload]() {
      return (this[$userDismissedPoster] || this.preload) && this.src &&
          !this[$preloadAnnounced];
    }

    updated(changedProperties) {
      super.updated(changedProperties);

      const posterElement = this[$posterElement];

      if (changedProperties.has('alt')) {
        posterElement.setAttribute(
            'aria-label',
            `${this[$ariaLabel]}. ${this[$ariaLabelCallToAction]}`);
      }

      if (changedProperties.has('poster') && this.poster) {
        posterElement.style.backgroundImage = `url("${this.poster}")`;
      }

      if (changedProperties.has('src')) {
        this[$preloadAnnounced] = false;
      }

      const preloaded = CachingGLTFLoader.hasFinishedLoading(this.src);

      if (this[$shouldAttemptPreload]) {
        const detail = {url: this.src};

        if (preloaded) {
          this.dispatchEvent(new CustomEvent('preload', {detail}));
        } else {
          loader.preload(this.src)
              .then(() => {
                this.dispatchEvent(new CustomEvent('preload', {detail}));
                this.requestUpdate();
              })
              .catch((error) => {
                this.dispatchEvent(new CustomEvent(
                    'error', {detail: {type: 'preload', sourceError: error}}));
              });
        }

        this[$preloadAnnounced] = true;
      }

      if (this[$shouldDismissPoster]) {
        if (!this[$posterHidden]) {
          this[$updateSource]();
          this[$hidePoster]();
        }
      } else {
        this[$showPoster]();
      }
    }

    async[$updateSource]() {
      if (this[$shouldDismissPoster]) {
        await super[$updateSource]();
      }
    }
  };
}
