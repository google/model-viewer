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

import ModelViewerElementBase, {$ariaLabel, $canvas, $progressTracker, $updateSource} from '../model-viewer-base.js';
import {CachingGLTFLoader} from '../three-components/CachingGLTFLoader.js';
import {Constructor, debounce, deserializeUrl, throttle} from '../utilities.js';

import {LoadingStatusAnnouncer} from './loading/status-announcer.js';

export type RevealAttributeValue = 'auto'|'interaction';
type DismissalSource = 'interaction';

export const POSTER_TRANSITION_TIME = 300;
export const PROGRESS_BAR_UPDATE_THRESHOLD = 100;
const PROGRESS_MASK_BASE_OPACITY = 0.2;
const ANNOUNCE_MODEL_VISIBILITY_DEBOUNCE_THRESHOLD = 0;

const SPACE_KEY = 32;
const ENTER_KEY = 13;

const RevealStrategy: {[index: string]: RevealAttributeValue} = {
  AUTO: 'auto',
  INTERACTION: 'interaction'
};

const PosterDismissalSource: {[index: string]: DismissalSource} = {
  INTERACTION: 'interaction'
};

const loader = new CachingGLTFLoader();
const loadingStatusAnnouncer = new LoadingStatusAnnouncer();

export const $defaultProgressBarElement = Symbol('defaultProgressBarElement');
export const $defaultProgressMaskElement = Symbol('defaultProgressMaskElement');

export const $posterContainerElement = Symbol('posterContainerElement');
export const $defaultPosterElement = Symbol('defaultPosterElement');

const $posterDismissalSource = Symbol('posterDismissalSource');

const $announceModelVisibility = Symbol('announceModelVisibility');
const $modelIsReadyForReveal = Symbol('modelIsReadyForReveal');
const $shouldAttemptPreload = Symbol('shouldAttemptPreload');
const $shouldRevealModel = Symbol('shouldRevealModel');
const $showPoster = Symbol('showPoster');
const $hidePoster = Symbol('hidePoster');
const $modelIsVisible = Symbol('modelIsVisible');
const $preloadAttempted = Symbol('preloadAttempted');
const $sourceUpdated = Symbol('sourceUpdated');

const $updateLoadingAndVisibility = Symbol('updateLoadingAndVisibility');

const $updateProgressBar = Symbol('updateProgressBar');
const $lastReportedProgress = Symbol('lastReportedProgress');

const $ariaLabelCallToAction = Symbol('ariaLabelCallToAction');

const $clickHandler = Symbol('clickHandler');
const $keydownHandler = Symbol('keydownHandler');
const $progressHandler = Symbol('processHandler');
const $onClick = Symbol('onClick');
const $onKeydown = Symbol('onKeydown');
const $onProgress = Symbol('onProgress');


/**
 * LoadingMixin implements features related to lazy loading, as well as
 * presentation details related to the pre-load / pre-render presentation of a
 * <model-viewer>
 */
export const LoadingMixin = (ModelViewerElement:
                                 Constructor<ModelViewerElementBase>) => {
  class LoadingModelViewerElement extends ModelViewerElement {
    /**
     * A URL pointing to the image to use as a poster in scenarios where the
     * <model-viewer> is not ready to reveal a rendered model to the viewer.
     */
    @property({converter: {fromAttribute: deserializeUrl}})
    poster: string|null = null;

    /**
     * An enumerable attribute describing under what conditions the
     * <model-viewer> should reveal a model to the viewer.
     *
     * The default value is "auto". The only supported alternative value as of
     * now is "interaction".
     */
    @property({type: String})
    reveal: RevealAttributeValue = RevealStrategy.AUTO;

    /**
     * If true, a configured model file will be aggressively loaded, even if the
     * <model-viewer> is only configured to reveal upon interaction.
     */
    @property({type: Boolean}) preload: boolean = false;

    /**
     * True if the model has finished loading. Note that a model can be loaded,
     * but not yet be rendered.
     */
    get loaded(): boolean {
      const src = this.src;
      return super.loaded ||
          !!(src && CachingGLTFLoader.hasFinishedLoading(src));
    }

    /**
     * True if the model is visible. Visibility implies that a model has
     * finished loading, that it has rendered at least once and that the poster
     * is no longer obscuring it.
     */
    get modelIsVisible(): boolean {
      return super.modelIsVisible && this[$modelIsVisible];
    }

    /**
     * Dismisses the poster, causing the model to load and render if necessary.
     * This is currently effectively the same as interacting with the poster via
     * user input.
     */
    dismissPoster() {
      this[$posterDismissalSource] = PosterDismissalSource.INTERACTION;
      this.requestUpdate();
    }

    protected[$modelIsVisible] = false;
    protected[$preloadAttempted] = false;
    protected[$sourceUpdated] = false;

    protected[$lastReportedProgress]: number = 0;

    protected[$posterDismissalSource]: DismissalSource|null = null;

    // TODO: Add this to the shadow root as part of this mixin's
    // implementation:
    protected[$posterContainerElement]: HTMLElement =
        this.shadowRoot!.querySelector('.slot.poster') as HTMLElement;

    protected[$defaultPosterElement]: HTMLElement =
        this.shadowRoot!.querySelector('#default-poster') as HTMLElement;

    protected[$defaultProgressBarElement]: HTMLElement =
        this.shadowRoot!.querySelector('#default-progress-bar > .bar') as
        HTMLElement;

    protected[$defaultProgressMaskElement]: HTMLElement =
        this.shadowRoot!.querySelector('#default-progress-bar > .mask') as
        HTMLElement;

    protected[$ariaLabelCallToAction] =
        this[$defaultPosterElement].getAttribute('aria-label');

    protected[$clickHandler]: () => void = () => this[$onClick]();
    protected[$keydownHandler]:
        (event: KeyboardEvent) => void = (event) => this[$onKeydown](event);
    protected[$progressHandler]:
        (event: Event) => void = (event) => this[$onProgress](event);

    protected[$announceModelVisibility] = debounce((visible: boolean) => {
      this.dispatchEvent(
          new CustomEvent('model-visibility', {detail: {visible}}));
    }, ANNOUNCE_MODEL_VISIBILITY_DEBOUNCE_THRESHOLD);

    protected[$updateProgressBar] = throttle((progress: number) => {
      const parentNode = this[$defaultProgressBarElement].parentNode as Element;

      requestAnimationFrame(() => {
        this[$defaultProgressMaskElement].style.opacity =
            `${(1.0 - progress) * PROGRESS_MASK_BASE_OPACITY}`;

        this[$defaultProgressBarElement].style.transform =
            `scaleX(${progress})`;

        if (progress === 0) {
          // NOTE(cdata): We remove and re-append the progress bar in this
          // condition so that the progress bar does not appear to transition
          // backwards from the right when we reset to 0 (or otherwise <1)
          // progress after having already reached 1 progress previously.
          parentNode.removeChild(this[$defaultProgressBarElement]);
          parentNode.appendChild(this[$defaultProgressBarElement]);
        }

        // NOTE(cdata): IE11 does not properly respect the second parameter of
        // classList.toggle, which this implementation originally used.
        // @see https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/11865865/
        if (progress === 1.0) {
          this[$defaultProgressBarElement].classList.add('hide');
        } else {
          this[$defaultProgressBarElement].classList.remove('hide');
        }
      });
    }, PROGRESS_BAR_UPDATE_THRESHOLD);

    connectedCallback() {
      super.connectedCallback();

      // Fired when a user first clicks the model element. Used to
      // change the visibility of a poster image, or start loading
      // a model.
      this[$posterContainerElement].addEventListener(
          'click', this[$clickHandler]);
      this[$posterContainerElement].addEventListener(
          'keydown', this[$keydownHandler]);
      this[$progressTracker].addEventListener(
          'progress', this[$progressHandler]);

      loadingStatusAnnouncer.registerInstance(this);
    }

    disconnectedCallback() {
      super.disconnectedCallback();

      this[$posterContainerElement].removeEventListener(
          'click', this[$clickHandler]);
      this[$posterContainerElement].removeEventListener(
          'keydown', this[$keydownHandler]);
      this[$progressTracker].removeEventListener(
          'progress', this[$progressHandler]);

      loadingStatusAnnouncer.unregisterInstance(this)
    }

    async updated(changedProperties: Map<string, any>) {
      super.updated(changedProperties);

      if (changedProperties.has('poster') && this.poster != null) {
        this[$defaultPosterElement].style.backgroundImage =
            `url(${this.poster})`;
      }

      if (changedProperties.has('src')) {
        this[$posterDismissalSource] = null;
        this[$preloadAttempted] = false;
        this[$lastReportedProgress] = 0;
        this[$sourceUpdated] = false;
      }

      if (changedProperties.has('alt')) {
        this[$defaultPosterElement].setAttribute(
            'aria-label',
            `${this[$ariaLabel]}. ${this[$ariaLabelCallToAction]}`);
      }

      this[$updateLoadingAndVisibility]()
    }

    [$onClick]() {
      this[$posterDismissalSource] = PosterDismissalSource.INTERACTION;
      this.requestUpdate();
    }

    [$onKeydown](event: KeyboardEvent) {
      switch (event.keyCode) {
        // NOTE(cdata): Links and buttons can typically be activated with
        // both spacebar and enter to produce a synthetic click action
        case SPACE_KEY:
        case ENTER_KEY:
          this[$posterDismissalSource] = PosterDismissalSource.INTERACTION;
          break;
        default:
          break;
      }

      this.requestUpdate();
    }

    [$onProgress](event: Event) {
      const progress = (event as any).detail.totalProgress;

      this.requestUpdate();

      if (progress === 1.0) {
        this[$updateProgressBar].flush();
      }

      this[$updateProgressBar](progress);

      this.dispatchEvent(
          new CustomEvent('progress', {detail: {totalProgress: progress}}));

      this[$lastReportedProgress] =
          Math.max(progress, this[$lastReportedProgress]);
    }

    get[$modelIsReadyForReveal](): boolean {
      const {src} = this;

      return !!src && CachingGLTFLoader.hasFinishedLoading(src) &&
          this[$lastReportedProgress] === 1.0 && this[$shouldRevealModel]
    }

    get[$shouldRevealModel](): boolean {
      return this.reveal === RevealStrategy.AUTO ||
          !!this[$posterDismissalSource];
    }

    get[$shouldAttemptPreload](): boolean {
      const {src} = this;

      return !!src && !CachingGLTFLoader.hasFinishedLoading(src) &&
          (this.preload || this[$shouldRevealModel]);
    }

    async[$updateLoadingAndVisibility]() {
      if (this[$shouldAttemptPreload] && !this[$preloadAttempted]) {
        this[$preloadAttempted] = true;

        const updatePreloadProgress = this[$progressTracker].beginActivity();

        try {
          const src = this.src!;
          const detail = {url: src};

          await loader.preload(src, updatePreloadProgress);
          this.dispatchEvent(new CustomEvent('preload', {detail}));
        } catch (error) {
          this.dispatchEvent(new CustomEvent(
              'error', {detail: {type: 'preload', sourceError: error}}));
        } finally {
          updatePreloadProgress(1.0);
          this.requestUpdate();
        }
      }

      if (this[$modelIsReadyForReveal]) {
        if (!this[$sourceUpdated]) {
          this[$updateSource]();
          this[$hidePoster]();
        }
      } else {
        this[$showPoster]();
      }
    }

    [$showPoster]() {
      const posterContainerElement = this[$posterContainerElement];
      const defaultPosterElement = this[$defaultPosterElement];
      const posterContainerOpacity =
          parseFloat(self.getComputedStyle(posterContainerElement).opacity!);

      defaultPosterElement.tabIndex = 1;
      defaultPosterElement.removeAttribute('aria-hidden');
      posterContainerElement.classList.add('show');

      if (posterContainerOpacity < 1.0) {
        posterContainerElement.addEventListener('transitionend', () => {
          this[$modelIsVisible] = false;
          this[$announceModelVisibility](false);
        }, {once: true});
      }
    }

    [$hidePoster]() {
      const posterContainerElement = this[$posterContainerElement];
      const defaultPosterElement = this[$defaultPosterElement];

      if (posterContainerElement.classList.contains('show')) {
        posterContainerElement.classList.remove('show');

        // We might need to forward focus to our internal canvas, but that
        // cannot happen until the poster has completely transitioned away
        posterContainerElement.addEventListener('transitionend', () => {
          this[$announceModelVisibility](true);
          requestAnimationFrame(() => {
            this[$modelIsVisible] = true;

            const root = this.getRootNode();

            // If the <model-viewer> is still focused, forward the focus to the
            // canvas that has just been revealed
            if (root &&
                (root as Document | ShadowRoot).activeElement === this) {
              this[$canvas].focus();
            }

            // Ensure that the poster is no longer focusable or visible to
            // screen readers
            defaultPosterElement.setAttribute('aria-hidden', 'true');
            defaultPosterElement.removeAttribute('tabindex');
          });
        }, {once: true});
      }
    }

    async[$updateSource]() {
      if (this[$modelIsReadyForReveal]) {
        this[$sourceUpdated] = true;
        await super[$updateSource]();
      }
    }
  }

  return LoadingModelViewerElement;
};
