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
import {Event as ThreeEvent} from 'three';

import {IS_ANDROID, IS_AR_QUICKLOOK_CANDIDATE, IS_IOS_CHROME, IS_IOS_SAFARI, IS_WEBXR_AR_CANDIDATE} from '../constants.js';
import ModelViewerElementBase, {$renderer, $scene} from '../model-viewer-base.js';
import {enumerationDeserializer} from '../styles/deserializers.js';
import {ARStatus} from '../three-components/ARRenderer.js';
import {Constructor} from '../utilities.js';

/**
 * Takes a URL to a USDZ file and sets the appropriate fields so that Safari
 * iOS can intent to their AR Quick Look.
 */
export const openIOSARQuickLook = (() => {
  return (usdzSrc: string, arScale: string, anchor: HTMLAnchorElement) => {
    const modelUrl = new URL(usdzSrc, self.location.toString());
    if (arScale === 'fixed') {
      modelUrl.hash = 'allowsContentScaling=0';
    }
    anchor.setAttribute('rel', 'ar');
    anchor.appendChild(document.createElement('img'));
    anchor.setAttribute('href', modelUrl.toString());
    anchor.click();
  };
})();

/**
 * Takes a URL and a title string, and attempts to launch Scene Viewer on the
 * current device.
 */
export const openSceneViewer = (() => {
  const noArViewerSigil = '#model-viewer-no-ar-fallback';
  let fallbackInvoked = false;

  return (gltfSrc: string,
          title: string,
          arScale: string,
          anchor: HTMLAnchorElement) => {
    // If the fallback has ever been invoked this session, bounce early:
    if (fallbackInvoked) {
      return;
    }

    // This is necessary because the original URL might have query parameters.
    // Since we're appending the whole URL as query parameter,
    // ? needs to be turned into & to not lose any of them.
    gltfSrc = gltfSrc.replace('?', '&');

    const location = self.location.toString();
    const locationUrl = new URL(location);
    const modelUrl = new URL(gltfSrc, location);
    const scheme = modelUrl.protocol.replace(':', '');

    locationUrl.hash = noArViewerSigil;

    // modelUrl can contain title/link/sound etc.
    // These are already URL-encoded, so we shouldn't do that again here.
    let intentParams = `?file=${modelUrl.toString()}&mode=ar_only`;
    if (!gltfSrc.includes('&link='))
      intentParams += `&link=${location}`;
    if (!gltfSrc.includes('&title='))
      intentParams += `&title=${encodeURIComponent(title)}`;

    if (arScale === 'fixed') {
      intentParams += `&resizable=false`;
    }

    const intent = `intent://arvr.google.com/scene-viewer/1.0${
        intentParams}#Intent;scheme=${
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

export type ARMode = 'quick-look'|'scene-viewer'|'webxr'|'none';

const deserializeARModes = enumerationDeserializer<ARMode>(
    ['quick-look', 'scene-viewer', 'webxr', 'none']);

const DEFAULT_AR_MODES = 'webxr scene-viewer quick-look';

const ARMode: {[index: string]: ARMode} = {
  QUICK_LOOK: 'quick-look',
  SCENE_VIEWER: 'scene-viewer',
  WEBXR: 'webxr',
  NONE: 'none'
};

export interface ARStatusDetails {
  status: ARStatus;
}

const $arButtonContainer = Symbol('arButtonContainer');
const $enterARWithWebXR = Symbol('enterARWithWebXR');
const $canActivateAR = Symbol('canActivateAR');
const $arMode = Symbol('arMode');
const $arModes = Symbol('arModes');
const $canLaunchQuickLook = Symbol('canLaunchQuickLook');
const $quickLookBrowsers = Symbol('quickLookBrowsers');
const $arAnchor = Symbol('arAnchor');

const $onARButtonContainerClick = Symbol('onARButtonContainerClick');
const $onARStatus = Symbol('onARStatus');

export declare interface ARInterface {
  ar: boolean;
  arModes: string;
  arScale: string;
  iosSrc: string|null;
  quickLookBrowsers: string;
  readonly canActivateAR: boolean;
  activateAR(): Promise<void>;
}

export const ARMixin = <T extends Constructor<ModelViewerElementBase>>(
    ModelViewerElement: T): Constructor<ARInterface>&T => {
  class ARModelViewerElement extends ModelViewerElement {
    @property({type: Boolean, attribute: 'ar'}) ar: boolean = false;

    @property({type: String, attribute: 'ar-scale'}) arScale: string = 'auto';

    @property({type: String, attribute: 'ar-modes'})
    arModes: string = DEFAULT_AR_MODES;

    @property({type: String, attribute: 'ios-src'}) iosSrc: string|null = null;

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

    protected[$arAnchor] = document.createElement('a');

    protected[$arModes]: Set<ARMode> = new Set();
    protected[$arMode]: ARMode = ARMode.NONE;

    protected[$quickLookBrowsers]: Set<QuickLookBrowser> = new Set();

    private[$onARButtonContainerClick] = (event: Event) => {
      event.preventDefault();
      this.activateAR();
    };

    private[$onARStatus] = ({status}: ThreeEvent) => {
      if (status === ARStatus.NOT_PRESENTING ||
          this[$renderer].arRenderer.presentedScene === this[$scene]) {
        this.setAttribute('ar-status', status);
        this.dispatchEvent(
            new CustomEvent<ARStatusDetails>('ar-status', {detail: {status}}));
      }
    };

    /**
     * Activates AR. Note that for any mode that is not WebXR-based, this
     * method most likely has to be called synchronous from a user
     * interaction handler. Otherwise, attempts to activate modes that
     * require user interaction will most likely be ignored.
     */
    async activateAR() {
      switch (this[$arMode]) {
        case ARMode.QUICK_LOOK:
          openIOSARQuickLook(this.iosSrc!, this.arScale, this[$arAnchor]);
          break;
        case ARMode.WEBXR:
          await this[$enterARWithWebXR]();
          break;
        case ARMode.SCENE_VIEWER:
          openSceneViewer(
              this.src!, this.alt || '', this.arScale, this[$arAnchor]);
          break;
        default:
          console.warn(
              'No AR Mode can be activated. This is probably due to missing \
configuration or device capabilities');
          break;
      }
    }

    protected async[$enterARWithWebXR]() {
      console.log('Attempting to present in AR...');

      try {
        await this[$renderer].arRenderer.present(this[$scene]);
      } catch (error) {
        console.warn('Error while trying to present to AR');
        console.error(error);
        await this[$renderer].arRenderer.stopPresenting();
      }
    }

    connectedCallback() {
      super.connectedCallback();

      this[$renderer].arRenderer.addEventListener('status', this[$onARStatus]);
      this.setAttribute('ar-status', ARStatus.NOT_PRESENTING);
    }

    disconnectedCallback() {
      super.disconnectedCallback();

      this[$renderer].arRenderer.removeEventListener(
          'status', this[$onARStatus]);
    }

    async update(changedProperties: Map<string, any>) {
      super.update(changedProperties);

      if (changedProperties.has('quickLookBrowsers')) {
        this[$quickLookBrowsers] =
            deserializeQuickLookBrowsers(this.quickLookBrowsers);
      }

      if (!changedProperties.has('ar') && !changedProperties.has('arModes') &&
          !changedProperties.has('iosSrc')) {
        return;
      }

      if (changedProperties.has('arModes')) {
        this[$arModes] = deserializeARModes(this.arModes);
      }

      if (changedProperties.has('arScale')) {
        this[$scene].canScale = this.arScale !== 'fixed';
      }

      this[$arMode] = ARMode.NONE;
      if (this.ar) {
        const arModes: ARMode[] = [];
        this[$arModes].forEach((value) => {
          arModes.push(value);
        });

        for (const value of arModes) {
          if (value === 'webxr' && IS_WEBXR_AR_CANDIDATE &&
              await this[$renderer].arRenderer.supportsPresentation()) {
            this[$arMode] = ARMode.WEBXR;
            break;
          } else if (value === 'scene-viewer' && IS_ANDROID) {
            this[$arMode] = ARMode.SCENE_VIEWER;
            break;
          } else if (
              value === 'quick-look' && !!this.iosSrc &&
              this[$canLaunchQuickLook] && IS_AR_QUICKLOOK_CANDIDATE) {
            this[$arMode] = ARMode.QUICK_LOOK;
            break;
          }
        }
      }

      if (this.canActivateAR) {
        this[$arButtonContainer].classList.add('enabled');
        this[$arButtonContainer].addEventListener(
            'click', this[$onARButtonContainerClick]);
      } else {
        this[$arButtonContainer].removeEventListener(
            'click', this[$onARButtonContainerClick]);
        this[$arButtonContainer].classList.remove('enabled');
      }
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
