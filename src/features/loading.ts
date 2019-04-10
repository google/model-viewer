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

import ModelViewerElementBase, {$ariaLabel, $canvas, $updateSource} from '../model-viewer-base.js';
import {CachingGLTFLoader} from '../three-components/CachingGLTFLoader.js';
import {Constructor, deserializeUrl} from '../utils.js';

import {LoadingStatusAnnouncer} from './loading/status-announcer.js';

export const $posterContainerElement = Symbol('posterContainerElement');
export const $defaultPosterElement = Symbol('defaultPosterElement');

const $showPoster = Symbol('showPoster');
const $hidePoster = Symbol('hidePoster');
const $posterHidden = Symbol('posterHidden');
const $userDismissedPoster = Symbol('userDismissedPoster');
const $shouldDismissPoster = Symbol('shouldDismissPoster');
const $shouldAttemptPreload = Symbol('shouldAttemptPreload');
const $ensurePreloaded = Symbol('ensurePreloaded');
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


export const LoadingMixin = (ModelViewerElement:
                                 Constructor<ModelViewerElementBase>) => {
  class LoadingModelViewerElement extends ModelViewerElement {
    @property({type: deserializeUrl}) poster: string|null = null;

    @property({type: Boolean}) preload: boolean = false;

    @property({type: Boolean, attribute: 'reveal-when-loaded'})
    revealWhenLoaded: boolean = false;

    protected[$posterHidden]: boolean = true;
    protected[$preloadAnnounced]: boolean = false;

    // Used to determine whether or not to display a poster image or
    // to load the model if not preloaded.
    protected[$userDismissedPoster]: boolean = false;

    // TODO: Add this to the shadow root as part of this mixin's
    // implementation:
    protected[$posterContainerElement]: HTMLElement =
        this.shadowRoot!.querySelector('.slot.poster') as HTMLElement;

    protected[$defaultPosterElement]: HTMLElement =
        this.shadowRoot!.querySelector('#default-poster') as HTMLElement;

    protected[$ariaLabelCallToAction] =
        this[$defaultPosterElement].getAttribute('aria-label');

    protected[$clickHandler]: () => void = () => this[$onClick]();
    protected[$keydownHandler]:
        (event: KeyboardEvent) => void = (event) => this[$onKeydown](event);

    get loaded(): boolean {
      const src = (this as any).src;
      return super.loaded || (src && CachingGLTFLoader.hasFinishedLoading(src));
    }

    get modelIsVisible(): boolean {
      return super.modelIsVisible && this[$posterHidden];
    }

    connectedCallback() {
      super.connectedCallback();

      // Fired when a user first clicks the model element. Used to
      // change the visibility of a poster image, or start loading
      // a model.
      this[$posterContainerElement].addEventListener(
          'click', this[$clickHandler]);
      this[$posterContainerElement].addEventListener(
          'keydown', this[$keydownHandler]);

      loadingStatusAnnouncer.registerInstance(this);
    }

    disconnectedCallback() {
      super.disconnectedCallback();

      this[$posterContainerElement].removeEventListener(
          'click', this[$clickHandler]);
      this[$posterContainerElement].removeEventListener(
          'keydown', this[$keydownHandler]);

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
      const posterContainerElement = this[$posterContainerElement];
      const defaultPosterElement = this[$defaultPosterElement];

      const posterOpacity =
          parseFloat(self.getComputedStyle(posterContainerElement).opacity!);
      const onPosterHidden = () => {
        requestAnimationFrame(() => {
          this.dispatchEvent(
              new CustomEvent('poster-visibility', {detail: {visible: false}}));
          (this as any)[$canvas].focus();
        });
      };

      this[$posterHidden] = true;

      if (posterOpacity > 0) {
        // NOTE(cdata): The canvas cannot receive focus until the poster has
        // been completely hidden:
        posterContainerElement.addEventListener(
            'transitionend', onPosterHidden, {once: true});
      } else {
        // NOTE(cdata): Depending on timing, the opacity may already be 0, in
        // which case we will never receive a transitionend event. So, just
        // focus on the next animation frame:
        onPosterHidden();
      }

      posterContainerElement.classList.remove('show');

      defaultPosterElement.setAttribute('aria-hidden', 'true');
      defaultPosterElement.removeAttribute('tabindex');
    }

    [$showPoster]() {
      const posterContainerElement = this[$posterContainerElement];
      const defaultPosterElement = this[$defaultPosterElement];

      posterContainerElement.classList.add('show');

      defaultPosterElement.setAttribute('aria-hidden', 'false');
      defaultPosterElement.tabIndex = 1;

      this[$posterHidden] = false;

      this.dispatchEvent(
          new CustomEvent('poster-visibility', {detail: {visible: true}}));
    }

    [$onClick]() {
      this.dismissPoster();
    }

    [$onKeydown](event: KeyboardEvent) {
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
      const src = (this as any).src;
      return !this.poster ||
          (CachingGLTFLoader.hasFinishedLoading(src) &&
           (this.revealWhenLoaded || this[$userDismissedPoster]));
    }

    get[$shouldAttemptPreload]() {
      return (this[$userDismissedPoster] || this.preload) &&
          (this as any).src && !this[$preloadAnnounced];
    }

    updated(changedProperties: Map<string, any>) {
      super.updated(changedProperties);

      const defaultPosterElement = this[$defaultPosterElement];

      if (changedProperties.has('alt')) {
        defaultPosterElement.setAttribute(
            'aria-label',
            `${this[$ariaLabel]}. ${this[$ariaLabelCallToAction]}`);
      }

      if (changedProperties.has('poster') && this.poster) {
        defaultPosterElement.style.backgroundImage = `url("${this.poster}")`;
      }

      if (changedProperties.has('src')) {
        this[$preloadAnnounced] = false;
      }

      this[$ensurePreloaded]();

      if (this[$shouldDismissPoster]) {
        if (!this[$posterHidden]) {
          this[$updateSource]();
          this[$hidePoster]();
        }
      } else {
        this[$showPoster]();
      }
    }

    async[$ensurePreloaded]() {
      const preloaded = CachingGLTFLoader.hasFinishedLoading((this as any).src);

      if (this[$shouldAttemptPreload]) {
        const src = (this as any).src;
        const detail = {url: src};

        this[$preloadAnnounced] = true;

        if (preloaded) {
          this.dispatchEvent(new CustomEvent('preload', {detail}));
        } else {
          try {
            await loader.preload(src);

            this.dispatchEvent(new CustomEvent('preload', {detail}));
            this.requestUpdate();
          } catch (error) {
            this.dispatchEvent(new CustomEvent(
                'error', {detail: {type: 'preload', sourceError: error}}));
          }
        }
      }
    }

    async[$updateSource]() {
      if (this[$shouldDismissPoster]) {
        await super[$updateSource]();
      }
    }
  };

  return LoadingModelViewerElement;
}
