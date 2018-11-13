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

import {IS_AR_CANDIDATE, IS_IOS} from '../constants.js';
import {$renderer, $scene} from '../model-viewer-element-base.js';
import {openIOSARQuickLook} from '../utils.js';
import {deserializeUrl} from '../utils.js';

const $enterARElement = Symbol('enterARElement');
const $enterARWithQuickLook = Symbol('enterARWithQuickLook');
const $enterARWithWebXR = Symbol('enterARWithWebXR');

export const ARMixin = (ModelViewerElement) => {
  return class extends ModelViewerElement {
    static get properties() {
      return {
        ...super.properties,
        unstableWebxr: {type: Boolean, attribute: 'unstable-webxr' },
        iosSrc: {type: deserializeUrl, attribute: 'ios-src'}
      };
    }

    get canActivateAR() {
      return window.getComputedStyle(this[$enterARElement]).display !== 'none';
    }

    constructor() {
      super();

      // TODO: Add this to the shadow root as part of this mixin's
      // implementation:
      this[$enterARElement] = this.shadowRoot.querySelector('.enter-ar');

      this[$enterARElement].addEventListener('click', e => {
        e.preventDefault();
        this.enterAR();
      });

      const renderer = this[$renderer];
      const scene = this[$scene];
      const onFullscreenchange = () => {
        if (document.fullscreenElement !== this &&
            renderer.presentedScene === scene) {
          try {
            renderer.stopPresenting();
          } catch (error) {
            console.warn('Unexpected error while stopping AR presentation');
            console.error(error);
          }
        }
      };

      document.addEventListener('fullscreenchange', onFullscreenchange);
    }

    /**
     * Enables the AR
     */
    enterAR() {
      if (IS_IOS) {
        this[$enterARWithQuickLook]();
      } else if (IS_AR_CANDIDATE) {
        this[$enterARWithWebXR]();
      }
    }

    async [$enterARWithQuickLook]() {
      openIOSARQuickLook(this.iosSrc);
    }

    async [$enterARWithWebXR]() {
      const renderer = this[$renderer];

      console.log('Attempting to enter fullscreen and present in AR...');

      try {
        const enterFullscreen = this.requestFullscreen();

        try {
          const outputElement = await renderer.present(this[$scene]);
          this.shadowRoot.appendChild(outputElement);
          await enterFullscreen;
        } catch (error) {
          console.warn('Error while trying to present to AR');
          console.error(error);
          await enterFullscreen;
          if (document.fullscreenElement === this) {
            console.warn('Exiting fullscreen under dire circumstances');
            document.exitFullscreen();
          }
        }
      } catch (error) {
        console.error(error);
        console.warn('AR will not activate without fullscreen permission');
      }
    }

    async update(changedProperties) {
      super.update(changedProperties);

      if (!changedProperties.has('unstableWebxr') && !changedProperties.has('iosSrc')) {
        return;
      }

      const canShowButton = this.unstableWebxr && IS_AR_CANDIDATE;
      const iosCandidate = IS_IOS && this.iosSrc != null;
      const renderer = this[$renderer];

      // On iOS, always enable the AR button. On non-iOS,
      // see if AR is supported, and if so, display the button after
      // an XRDevice has been initialized
      if (iosCandidate ||
          (canShowButton && await renderer.supportsPresentation())) {
        this[$enterARElement].style.display = 'block';
      } else {
        this[$enterARElement].style.display = 'none';
      }
    }
  };
}
