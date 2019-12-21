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

import {IS_ANDROID, IS_AR_QUICKLOOK_CANDIDATE, IS_IOS, IS_IOS_CHROME, IS_IOS_SAFARI, IS_WEBXR_AR_CANDIDATE} from '../constants.js';
import ModelViewerElementBase, {$container, $renderer, $scene} from '../model-viewer-base.js';
import {enumerationDeserializer} from '../styles/deserializers.js';
import {Constructor, deserializeUrl} from '../utilities.js';

/**
 * Takes a URL to a USDZ file and sets the appropriate fields so that Safari
 * iOS can intent to their AR Quick Look.
 */
export const openIOSARQuickLook = (() => {
  const anchor = document.createElement('a');
  anchor.setAttribute('rel', 'ar');
  anchor.appendChild(document.createElement('img'));

  return (usdzSrc: string) => {
    anchor.setAttribute('href', usdzSrc);
    anchor.click();
  };
})();

/**
 * Takes a URL and a title string, and attempts to launch Scene Viewer on the
 * current device.
 */
export const openSceneViewer = (() => {
  const anchor = document.createElement('a');
  const linkOrTitle = /(link|title)(=|&)|(\?|&)(link|title)$/;
  const noArViewerSigil = '#model-viewer-no-ar-fallback';
  let fallbackInvoked = false;

  return (gltfSrc: string, title: string, arScale: string) => {
    // If the fallback has ever been invoked this session, bounce early:
    if (fallbackInvoked) {
      return;
    }

    const location = self.location.toString();
    const locationUrl = new URL(location);
    const modelUrl = new URL(gltfSrc);
    const link = encodeURIComponent(location);
    const scheme = modelUrl.protocol.replace(':', '');

    if (modelUrl.search && modelUrl.search.match(linkOrTitle)) {
      console.warn(`The model URL (${
          modelUrl
              .toString()}) contains a "link" and/or "title" query parameter.
 These parameters are used to configure Scene Viewer and will be duplicated in the URL.
 You should choose different query parameter names if possible!`);
    }

    locationUrl.hash = noArViewerSigil;

    title = encodeURIComponent(title);
    modelUrl.protocol = 'intent://';

    // It's possible for a model URL to have meaningful query parameters
    // already. Sure hope they aren't called 'link' or 'title' though 😅
    modelUrl.search +=
        (modelUrl.search ? '&' : '') + `link=${link}&title=${title}`;

    if (arScale === 'fixed') {
      modelUrl.search += `&resizable=false`;
    }

    const intent = `${modelUrl.toString()}#Intent;scheme=${
        scheme};package=com.google.ar.core;action=android.intent.action.VIEW;S.browser_fallback_url=${
        encodeURIComponent(locationUrl.toString())};end;`;

    const undoHashChange = () => {
      if (self.location.hash === noArViewerSigil && !fallbackInvoked) {
        fallbackInvoked = true;
        // The new history will be the current URL with a new hash.
        // Go back one step so that we reset to the expected URL.
        // NOTE(cdata): this should not invoke any browser-level navigation
        // because hash-only changes modify the URL in-place without
        // navigating:
        self.history.back();
      }
    };

    self.addEventListener('hashchange', undoHashChange, {once: true});

    anchor.setAttribute('href', intent);
    anchor.click();
  };
})();

export type QuickLookBrowser = 'safari'|'chrome';

const deserializeQuickLookBrowsers =
    enumerationDeserializer<QuickLookBrowser>(['safari', 'chrome']);

export type ARMode = 'quick-look'|'ar-viewer'|'unstable-webxr'|'none';

const ARMode: {[index: string]: ARMode} = {
  QUICK_LOOK: 'quick-look',
  AR_VIEWER: 'ar-viewer',
  UNSTABLE_WEBXR: 'unstable-webxr',
  NONE: 'none'
};

const $exitFullscreenButtonContainer = Symbol('exitFullscreenButtonContainer');
const $arButtonContainer = Symbol('arButtonContainer');
const $defaultExitFullscreenButton = Symbol('defaultExitFullscreenButton');
const $enterARWithWebXR = Symbol('enterARWithWebXR');
const $canActivateAR = Symbol('canActivateAR');
const $arMode = Symbol('arMode');
const $canLaunchQuickLook = Symbol('canLaunchQuickLook');
const $quickLookBrowsers = Symbol('quickLookBrowsers');

const $arButtonContainerFallbackClickHandler =
    Symbol('arButtonContainerFallbackClickHandler');
const $onARButtonContainerFallbackClick =
    Symbol('onARButtonContainerFallbackClick');
const $arButtonContainerClickHandler = Symbol('arButtonContainerClickHandler');
const $onARButtonContainerClick = Symbol('onARButtonContainerClick');

const $exitFullscreenButtonContainerClickHandler =
    Symbol('exitFullscreenButtonContainerClickHandler');
const $onExitFullscreenButtonClick = Symbol('onExitFullscreenButtonClick');

const $fullscreenchangeHandler = Symbol('fullscreenHandler');
const $onFullscreenchange = Symbol('onFullscreen');

export declare interface ARInterface {
  ar: boolean;
  arScale: string;
  unstableWebxr: boolean;
  iosSrc: string|null;
  quickLookBrowsers: string;
  readonly canActivateAR: boolean;
  activateAR(): Promise<void>;
}

export const ARMixin = <T extends Constructor<ModelViewerElementBase>>(
    ModelViewerElement: T): Constructor<ARInterface>&T => {
  class ARModelViewerElement extends ModelViewerElement {
    @property({type: Boolean, attribute: 'ar'}) ar: boolean = false;

    @property({type: String, attribute: 'ar-scale'}) arScale: string =
      'auto';

    @property({type: Boolean, attribute: 'unstable-webxr'})
    unstableWebxr: boolean = false;

    @property(
        {converter: {fromAttribute: deserializeUrl}, attribute: 'ios-src'})
    iosSrc: string|null = null;

    @property({type: String, attribute: 'quick-look-browsers'})
    quickLookBrowsers: string = 'safari';

    get canActivateAR(): boolean {
      return this[$arMode] !== ARMode.NONE;
    }

    protected[$canActivateAR]: boolean = false;

    // TODO: Add this to the shadow root as part of this mixin's
    // implementation:
    protected[$arButtonContainer]: HTMLElement =
        this.shadowRoot!.querySelector('.ar-button') as HTMLElement;

    protected[$exitFullscreenButtonContainer]: HTMLElement =
        this.shadowRoot!.querySelector('.slot.exit-fullscreen-button') as
        HTMLElement;
    protected[$defaultExitFullscreenButton]: HTMLElement =
        this.shadowRoot!.querySelector('#default-exit-fullscreen-button') as
        HTMLElement;

    // NOTE(cdata): We use a second, separate "fallback" click handler in
    // order to work around a regression in how Chrome on Android behaves
    // when requesting fullscreen at the same time as triggering an intent.
    // As of m76, intents could no longer be triggered successfully if they
    // were dispatched in the same handler as the fullscreen request. The
    // workaround is to split both effects into their own event handlers.
    // @see https://github.com/GoogleWebComponents/model-viewer/issues/693
    protected[$arButtonContainerFallbackClickHandler] = (event: Event) =>
        this[$onARButtonContainerFallbackClick](event);

    protected[$arButtonContainerClickHandler]: (event: Event) => void =
        (event) => this[$onARButtonContainerClick](event);

    protected[$exitFullscreenButtonContainerClickHandler]:
        () => void = () => this[$onExitFullscreenButtonClick]();

    protected[$fullscreenchangeHandler]:
        () => void = () => this[$onFullscreenchange]();

    protected[$arMode]: ARMode = ARMode.NONE;

    protected[$quickLookBrowsers]: Set<QuickLookBrowser> = new Set();

    /**
     * Activates AR. Note that for any mode that is not WebXR-based, this
     * method most likely has to be called synchronous from a user
     * interaction handler. Otherwise, attempts to activate modes that
     * require user interaction will most likely be ignored.
     */
    async activateAR() {
      switch (this[$arMode]) {
        case ARMode.QUICK_LOOK:
          openIOSARQuickLook(this.iosSrc!);
          break;
        case ARMode.UNSTABLE_WEBXR:
          await this[$enterARWithWebXR]();
          break;
        case ARMode.AR_VIEWER:
          openSceneViewer(this.src!, this.alt || '', this.arScale);
          break;
        default:
          console.warn(
              'No AR Mode can be activated. This is probably due to missing \
configuration or device capabilities');
          break;
      }
    }

    connectedCallback() {
      super.connectedCallback();
      document.addEventListener(
          'fullscreenchange', this[$fullscreenchangeHandler]);
    }

    disconnectedCallback() {
      super.disconnectedCallback();
      document.removeEventListener(
          'fullscreenchange', this[$fullscreenchangeHandler]);
    }

    [$onExitFullscreenButtonClick]() {
      if (document.fullscreenElement === this) {
        document.exitFullscreen();
      }
    }

    [$onFullscreenchange]() {
      const scene = this[$scene];
      const isFullscreen = document.fullscreenElement === this;

      if (isFullscreen) {
        this[$container].classList.add('fullscreen');
      } else {
        this[$container].classList.remove('fullscreen');
      }

      if (document.fullscreenElement !== this &&
          this[$renderer].presentedScene === scene) {
        try {
          this[$renderer].stopPresenting();
        } catch (error) {
          console.warn('Unexpected error while stopping AR presentation');
          console.error(error);
        }
      }
    }

    protected async[$enterARWithWebXR]() {
      console.log('Attempting to present in AR...');

      try {
        await this[$renderer].present(this[$scene]);
      } catch (error) {
        console.warn('Error while trying to present to AR');
        console.error(error);
      }
    }

    async update(changedProperties: Map<string, any>) {
      super.update(changedProperties);

      if (changedProperties.has('quickLookBrowsers')) {
        this[$quickLookBrowsers] =
            deserializeQuickLookBrowsers(this.quickLookBrowsers);
      }

      if (!changedProperties.has('unstableWebxr') &&
          !changedProperties.has('iosSrc') && !changedProperties.has('ar') &&
          !changedProperties.has('src') && !changedProperties.has('alt')) {
        return;
      }

      const unstableWebxrCandidate = this.unstableWebxr &&
          IS_WEBXR_AR_CANDIDATE && await this[$renderer].supportsPresentation();
      const arViewerCandidate = IS_ANDROID && this.ar;
      const iosQuickLookCandidate = IS_IOS && IS_AR_QUICKLOOK_CANDIDATE &&
          this[$canLaunchQuickLook] && !!this.iosSrc;

      const showArButton =
          unstableWebxrCandidate || arViewerCandidate || iosQuickLookCandidate;

      if (unstableWebxrCandidate) {
        this[$arMode] = ARMode.UNSTABLE_WEBXR;
      } else if (arViewerCandidate) {
        this[$arMode] = ARMode.AR_VIEWER;
      } else if (iosQuickLookCandidate) {
        this[$arMode] = ARMode.QUICK_LOOK;
      } else {
        this[$arMode] = ARMode.NONE;
      }

      if (showArButton) {
        this[$arButtonContainer].classList.add('enabled');
        // NOTE(cdata): The order of the two click handlers on the "ar
        // button container" is important, vital to the workaround described
        // earlier in this file. Reversing their order will cause our Scene
        // Viewer integration to break.
        // @see https://github.com/GoogleWebComponents/model-viewer/issues/693
        this[$arButtonContainer].addEventListener(
            'click', this[$arButtonContainerClickHandler]);
        this[$arButtonContainer].addEventListener(
            'click', this[$arButtonContainerFallbackClickHandler]);
        this[$exitFullscreenButtonContainer].addEventListener(
            'click', this[$exitFullscreenButtonContainerClickHandler]);
      } else {
        this[$arButtonContainer].removeEventListener(
            'click', this[$arButtonContainerClickHandler]);
        this[$arButtonContainer].removeEventListener(
            'click', this[$arButtonContainerFallbackClickHandler]);
        this[$exitFullscreenButtonContainer].removeEventListener(
            'click', this[$exitFullscreenButtonContainerClickHandler]);
        this[$arButtonContainer].classList.remove('enabled');
      }
    }

    [$onARButtonContainerFallbackClick](_event: Event) {
      if (this[$arMode] === ARMode.AR_VIEWER) {
        this.requestFullscreen();
      }
    }

    [$onARButtonContainerClick](event: Event) {
      event.preventDefault();
      this.activateAR();
    }

    get[$canLaunchQuickLook](): boolean {
      if (IS_IOS_CHROME) {
        return this[$quickLookBrowsers].has('chrome');
      } else if (IS_IOS_SAFARI) {
        return this[$quickLookBrowsers].has('safari');
      }

      return false;
    }
  }

  return ARModelViewerElement;
};
