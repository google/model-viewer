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

import ModelViewerElementBase, {$announceModelVisibility, $ariaLabel, $getModelIsVisible, $hasTransitioned, $isElementInViewport, $progressTracker, $scene, $sceneIsReady, $shouldAttemptPreload, $updateSource, $userInputElement, toVector3D, Vector3D} from '../model-viewer-base.js';
import {$loader, CachingGLTFLoader} from '../three-components/CachingGLTFLoader.js';
import {Renderer} from '../three-components/Renderer.js';
import {Constructor, throttle} from '../utilities.js';

import {LoadingStatusAnnouncer} from './loading/status-announcer.js';

export type RevealAttributeValue = 'auto'|'interaction'|'manual';
export type LoadingAttributeValue = 'auto'|'lazy'|'eager';
type DismissalSource = 'interaction';

export const POSTER_TRANSITION_TIME = 300;
export const PROGRESS_BAR_UPDATE_THRESHOLD = 100;
const PROGRESS_MASK_BASE_OPACITY = 0.2;

const DEFAULT_DRACO_DECODER_LOCATION =
    'https://www.gstatic.com/draco/versioned/decoders/1.4.1/';

const DEFAULT_KTX2_TRANSCODER_LOCATION =
    'https://www.gstatic.com/basis-universal/versioned/2021-04-15-ba1c3e4/';

const SPACE_KEY = 32;
const ENTER_KEY = 13;

const RevealStrategy: {[index: string]: RevealAttributeValue} = {
  AUTO: 'auto',
  INTERACTION: 'interaction',
  MANUAL: 'manual'
};

const LoadingStrategy: {[index: string]: LoadingAttributeValue} = {
  AUTO: 'auto',
  LAZY: 'lazy',
  EAGER: 'eager'
};

const PosterDismissalSource: {[index: string]: DismissalSource} = {
  INTERACTION: 'interaction'
};

const loadingStatusAnnouncer = new LoadingStatusAnnouncer();

export const $defaultProgressBarElement = Symbol('defaultProgressBarElement');
export const $defaultProgressMaskElement = Symbol('defaultProgressMaskElement');

export const $posterContainerElement = Symbol('posterContainerElement');
export const $defaultPosterElement = Symbol('defaultPosterElement');

const $posterDismissalSource = Symbol('posterDismissalSource');
const $hidePoster = Symbol('hidePoster');
const $modelIsRevealed = Symbol('modelIsRevealed');
const $updateProgressBar = Symbol('updateProgressBar');
const $lastReportedProgress = Symbol('lastReportedProgress');
const $transitioned = Symbol('transitioned');
const $onTransitionEnd = Symbol('onTransitionEnd')

const $ariaLabelCallToAction = Symbol('ariaLabelCallToAction');

const $onClick = Symbol('onClick');
const $onKeydown = Symbol('onKeydown');
const $onProgress = Symbol('onProgress');

export declare interface LoadingInterface {
  poster: string|null;
  reveal: RevealAttributeValue;
  loading: LoadingAttributeValue;
  generateSchema: boolean;
  seamlessPoster: boolean;
  readonly loaded: boolean;
  readonly modelIsVisible: boolean;
  dismissPoster(): void;
  showPoster(): void;
  getDimensions(): Vector3D;
}

export declare interface LoadingStaticInterface {
  dracoDecoderLocation: string;
  ktx2TranscoderLocation: string;
  meshoptDecoderLocation: string;
  mapURLs(callback: (url: string) => string): void;
}

export interface ModelViewerGlobalConfig {
  dracoDecoderLocation?: string;
  ktx2TranscoderLocation?: string;
  meshoptDecoderLocation?: string;
  powerPreference?: string;
}

/**
 * LoadingMixin implements features related to lazy loading, as well as
 * presentation details related to the pre-load / pre-render presentation of a
 * <model-viewer>
 *
 * This mixin implements support for models with DRACO-compressed meshes.
 * The DRACO decoder will be loaded on-demand if a glTF that uses the DRACO mesh
 * compression extension is encountered.
 *
 * By default, the DRACO decoder will be loaded from a Google CDN. It is
 * possible to customize where the decoder is loaded from by defining a global
 * configuration option for `<model-viewer>` like so:
 *
 * ```html
 * <script>
 * self.ModelViewerElement = self.ModelViewerElement || {};
 * self.ModelViewerElement.dracoDecoderLocation =
 *     'http://example.com/location/of/draco/decoder/files/';
 * </script>
 * ```
 *
 * Note that the above configuration strategy must be performed *before* the
 * first `<model-viewer>` element is created in the browser. The configuration
 * can be done anywhere, but the easiest way to ensure it is done at the right
 * time is to do it in the `<head>` of the HTML document. This is the
 * recommended way to set the location because it is most compatible with
 * scenarios where the `<model-viewer>` library is lazily loaded.
 *
 * If you absolutely have to set the DRACO decoder location *after* the first
 * `<model-viewer>` element is created, you can do it this way:
 *
 * ```html
 * <script>
 * const ModelViewerElement = customElements.get('model-viewer');
 * ModelViewerElement.dracoDecoderLocation =
 *     'http://example.com/location/of/draco/decoder/files/';
 * </script>
 * ```
 *
 * Note that the above configuration approach will not work until *after*
 * `<model-viewer>` is defined in the browser. Also note that this configuration
 * *must* be set *before* the first DRACO model is fully loaded.
 *
 * It is recommended that users who intend to take advantage of DRACO mesh
 * compression consider whether or not it is acceptable for their use case to
 * have code side-loaded from a Google CDN. If it is not acceptable, then the
 * location must be customized before loading any DRACO models in order to cause
 * the decoder to be loaded from an alternative, acceptable location.
 */
export const LoadingMixin = <T extends Constructor<ModelViewerElementBase>>(
    ModelViewerElement:
        T): Constructor<LoadingInterface, LoadingStaticInterface>&T => {
  class LoadingModelViewerElement extends ModelViewerElement {
    static set dracoDecoderLocation(value: string) {
      CachingGLTFLoader.setDRACODecoderLocation(value);
    }

    static get dracoDecoderLocation() {
      return CachingGLTFLoader.getDRACODecoderLocation();
    }

    static set ktx2TranscoderLocation(value: string) {
      CachingGLTFLoader.setKTX2TranscoderLocation(value);
    }

    static get ktx2TranscoderLocation() {
      return CachingGLTFLoader.getKTX2TranscoderLocation();
    }

    static set meshoptDecoderLocation(value: string) {
      CachingGLTFLoader.setMeshoptDecoderLocation(value);
    }

    static get meshoptDecoderLocation() {
      return CachingGLTFLoader.getMeshoptDecoderLocation();
    }

    /**
     * If provided, the callback will be passed each resource URL before a
     * request is sent. The callback may return the original URL, or a new URL
     * to override loading behavior. This behavior can be used to load assets
     * from .ZIP files, drag-and-drop APIs, and Data URIs.
     */
    static mapURLs(callback: (url: string) => string) {
      Renderer.singleton.loader[$loader].manager.setURLModifier(callback);
    }

    /**
     * A URL pointing to the image to use as a poster in scenarios where the
     * <model-viewer> is not ready to reveal a rendered model to the viewer.
     */
    @property({type: String}) poster: string|null = null;

    /**
     * An enumerable attribute describing under what conditions the
     * <model-viewer> should reveal a model to the viewer.
     *
     * The default value is "auto". The only supported alternative values are
     * "interaction" and "manual".
     */
    @property({type: String})
    reveal: RevealAttributeValue = RevealStrategy.AUTO;

    /**
     * An enumerable attribute describing under what conditions the
     * <model-viewer> should preload a model.
     *
     * The default value is "auto". The only supported alternative values are
     * "lazy" and "eager". Auto is equivalent to lazy, which loads the model
     * when it is near the viewport for reveal = "auto", and when interacted
     * with for reveal = "interaction". Eager loads the model immediately.
     */
    @property({type: String})
    loading: LoadingAttributeValue = LoadingStrategy.AUTO;

    /**
     * Generates a 3D model schema https://schema.org/3DModel associated with
     * the loaded src and inserts it into the header of the page for search
     * engines to crawl.
     */
    @property({type: Boolean, attribute: 'generate-schema'})
    generateSchema = false;

    /**
     * If you're using a seamless poster as generated by toBlob({idealAspect:
     * true}) with --poster-color transparent (which is recommended), then set
     * this attribute to true to turn off the poster's transition. This keeps
     * the shadow from blinking and the transition is no longer necessary since
     * the poster matches the rendering.
     */
    @property({type: Boolean, attribute: 'seamless-poster'})
    seamlessPoster = false;

    /**
     * Dismisses the poster, causing the model to load and render if
     * necessary. This is currently effectively the same as interacting with
     * the poster via user input.
     */
    dismissPoster() {
      if (this[$sceneIsReady]()) {
        this[$hidePoster]();
      } else {
        this[$posterDismissalSource] = PosterDismissalSource.INTERACTION;
        this[$updateSource]();
      }
    }

    /**
     * Displays the poster, hiding the 3D model. If this is called after the 3D
     * model has been revealed, then it will behave as though
     * reveal='interaction', being dismissed either by a user click or a call to
     * dismissPoster().
     */
    showPoster() {
      const posterContainerElement = this[$posterContainerElement];
      const defaultPosterElement = this[$defaultPosterElement];

      defaultPosterElement.removeAttribute('tabindex');
      defaultPosterElement.removeAttribute('aria-hidden');
      posterContainerElement.classList.add('show');

      const oldVisibility = this.modelIsVisible;
      this[$modelIsRevealed] = false;
      this[$announceModelVisibility](oldVisibility);
      this[$transitioned] = false;
    }

    /**
     * Returns the model's bounding box dimensions in meters, independent of
     * turntable rotation.
     */
    getDimensions(): Vector3D {
      return toVector3D(this[$scene].size);
    }

    protected[$modelIsRevealed] = false;
    protected[$transitioned] = false;

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

    protected[$updateProgressBar] = throttle((progress: number) => {
      const parentNode = this[$defaultProgressBarElement].parentNode as Element;

      requestAnimationFrame(() => {
        this[$defaultProgressMaskElement].style.opacity =
            `${(1.0 - progress) * PROGRESS_MASK_BASE_OPACITY}`;

        this[$defaultProgressBarElement].style.transform =
            `scaleX(${progress})`;

        if (progress === 0) {
          // NOTE(cdata): We remove and re-append the progress bar in this
          // condition so that the progress bar does not appear to
          // transition backwards from the right when we reset to 0 (or
          // otherwise <1) progress after having already reached 1 progress
          // previously.
          parentNode.removeChild(this[$defaultProgressBarElement]);
          parentNode.appendChild(this[$defaultProgressBarElement]);
        }

        // NOTE(cdata): IE11 does not properly respect the second parameter
        // of classList.toggle, which this implementation originally used.
        // @see https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/11865865/
        if (progress === 1.0) {
          this[$defaultProgressBarElement].classList.add('hide');
        } else {
          this[$defaultProgressBarElement].classList.remove('hide');
        }
      });
    }, PROGRESS_BAR_UPDATE_THRESHOLD);

    constructor(...args: Array<any>) {
      super(...args);

      const ModelViewerElement: ModelViewerGlobalConfig =
          (self as any).ModelViewerElement || {};

      const dracoDecoderLocation = ModelViewerElement.dracoDecoderLocation ||
          DEFAULT_DRACO_DECODER_LOCATION;
      CachingGLTFLoader.setDRACODecoderLocation(dracoDecoderLocation);

      const ktx2TranscoderLocation =
          ModelViewerElement.ktx2TranscoderLocation ||
          DEFAULT_KTX2_TRANSCODER_LOCATION;
      CachingGLTFLoader.setKTX2TranscoderLocation(ktx2TranscoderLocation);

      if (ModelViewerElement.meshoptDecoderLocation) {
        CachingGLTFLoader.setMeshoptDecoderLocation(
            ModelViewerElement.meshoptDecoderLocation);
      }
    }

    connectedCallback() {
      super.connectedCallback();

      // Fired when a user first clicks the model element. Used to
      // change the visibility of a poster image, or start loading
      // a model.
      this[$posterContainerElement].addEventListener('click', this[$onClick]);
      this[$posterContainerElement].addEventListener(
          'keydown', this[$onKeydown]);
      this[$progressTracker].addEventListener('progress', this[$onProgress]);

      loadingStatusAnnouncer.registerInstance(this);
    }

    disconnectedCallback() {
      super.disconnectedCallback();

      this[$posterContainerElement].removeEventListener(
          'click', this[$onClick]);
      this[$posterContainerElement].removeEventListener(
          'keydown', this[$onKeydown]);
      this[$progressTracker].removeEventListener('progress', this[$onProgress]);

      loadingStatusAnnouncer.unregisterInstance(this)
    }

    async updated(changedProperties: Map<string, any>) {
      super.updated(changedProperties);

      if (changedProperties.has('poster') && this.poster != null) {
        this[$defaultPosterElement].style.backgroundImage =
            `url(${this.poster})`;
      }

      if (changedProperties.has('alt')) {
        this[$defaultPosterElement].setAttribute(
            'aria-label',
            `${this[$ariaLabel]}. ${this[$ariaLabelCallToAction]}`);
      }

      if (changedProperties.has('reveal') || changedProperties.has('loading')) {
        this[$updateSource]();
      }

      if (changedProperties.has('generateSchema')) {
        if (this.generateSchema === true) {
          this[$scene].updateSchema(this.src);
        } else {
          this[$scene].updateSchema(null);
        }
      }

      if (changedProperties.has('seamlessPoster')) {
        if (this.seamlessPoster === true) {
          this[$posterContainerElement].classList.add('quick');
        } else {
          this[$posterContainerElement].classList.remove('quick');
        }
      }
    }

    [$onClick] = () => {
      if (this.reveal === RevealStrategy.MANUAL) {
        return;
      }
      this.dismissPoster();
    };

    [$onKeydown] = (event: KeyboardEvent) => {
      if (this.reveal === RevealStrategy.MANUAL) {
        return;
      }
      switch (event.keyCode) {
        // NOTE(cdata): Links and buttons can typically be activated with
        // both spacebar and enter to produce a synthetic click action
        case SPACE_KEY:
        case ENTER_KEY:
          this.dismissPoster();
          break;
        default:
          break;
      }
    };

    [$onProgress] = (event: Event) => {
      const progress = (event as any).detail.totalProgress;
      this[$lastReportedProgress] =
          Math.max(progress, this[$lastReportedProgress]);

      if (progress === 1.0) {
        this[$updateProgressBar].flush();
        if (this[$sceneIsReady]() &&
            (this[$posterDismissalSource] != null ||
             this.reveal === RevealStrategy.AUTO)) {
          this[$hidePoster]();
        }
      }

      this[$updateProgressBar](progress);

      this.dispatchEvent(
          new CustomEvent('progress', {detail: {totalProgress: progress}}));
    };

    [$shouldAttemptPreload](): boolean {
      return !!this.src &&
          (this[$posterDismissalSource] != null ||
           this.loading === LoadingStrategy.EAGER ||
           (this.reveal === RevealStrategy.AUTO && this[$isElementInViewport]));
    }

    [$sceneIsReady](): boolean {
      const {src} = this;
      return !!src && super[$sceneIsReady]() &&
          this[$lastReportedProgress] === 1.0;
    }

    [$onTransitionEnd] = () => {
      this[$transitioned] = true;
      const root = this.getRootNode();

      // If the <model-viewer> is still focused, forward the focus to
      // the canvas that has just been revealed
      if (root && (root as Document | ShadowRoot).activeElement === this) {
        this[$userInputElement].focus();
      }

      // Ensure that the poster is no longer focusable or visible to
      // screen readers
      const defaultPosterElement = this[$defaultPosterElement];
      defaultPosterElement.setAttribute('aria-hidden', 'true');
      defaultPosterElement.tabIndex = -1;
      this.dispatchEvent(new CustomEvent('poster-dismissed'));
    };

    [$hidePoster]() {
      this[$posterDismissalSource] = null;
      const posterContainerElement = this[$posterContainerElement];

      if (posterContainerElement.classList.contains('show')) {
        const oldVisibility = this.modelIsVisible;
        this[$modelIsRevealed] = true;
        this[$announceModelVisibility](oldVisibility);

        requestAnimationFrame(() => {
          posterContainerElement.classList.remove('show');
          if (this.seamlessPoster === true) {
            this[$onTransitionEnd]();
          } else {
            // We might need to forward focus to our internal canvas, but that
            // cannot happen until the poster has completely transitioned away
            posterContainerElement.addEventListener(
                'transitionend', this[$onTransitionEnd], {once: true});
          }
        });
      } else {
        this[$transitioned] = true;
      }
    }

    [$getModelIsVisible]() {
      return super[$getModelIsVisible]() && this[$modelIsRevealed];
    }

    [$hasTransitioned](): boolean {
      return super[$hasTransitioned]() && this[$transitioned];
    }

    async[$updateSource]() {
      this[$lastReportedProgress] = 0;
      if (this.generateSchema === true) {
        this[$scene].updateSchema(this.src);
      }
      if (this[$scene].currentGLTF == null || this.src == null ||
          !this[$shouldAttemptPreload]()) {
        // Don't show the poster when switching models.
        this.showPoster();
      }
      await super[$updateSource]();
    }
  }

  return LoadingModelViewerElement;
};
