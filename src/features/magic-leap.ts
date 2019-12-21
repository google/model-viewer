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

import ModelViewerElementBase, {$container, $scene} from '../model-viewer-base.js';
import {Constructor} from '../utilities.js';

const $showMlModel = Symbol('showMlModel');
const $hideMlModel = Symbol('hideMlModel');
const $isHeliosBrowser = Symbol('isHeliosBrowser');
const $mlModel = Symbol('mlModel');


// NOTE(cdata): In tests, this seemed to line the hologram up with the scale of
// an inline rendering in WebGL. Probably needs some tweaking, and possibly even
// user-configuration, before we perfect this:
const DEFAULT_HOLOGRAM_INLINE_SCALE = 0.65;

// NOTE(cdata): This probably needs to scale proportionally with the dimensions
// of the inline model, but we need more experimentation to decide how that
// should work:
const DEFAULT_HOLOGRAM_Z_OFFSET = '150px';

export declare interface MagicLeapInterface {
  magicLeap: boolean;
}

/**
 * In order to use Magic Leap support, please include prismatic.js in your
 * page. If you do not include prismatic.js, Magic Leap support will not work.
 *
 * @see https://www.npmjs.com/package/@magicleap/prismatic
 */
export const MagicLeapMixin = <T extends Constructor<ModelViewerElementBase>>(
    ModelViewerElement: T): Constructor<MagicLeapInterface>&T => {
  class MagicLeapModelViewerElement extends ModelViewerElement {
    @property({type: Boolean, attribute: 'magic-leap'})
    magicLeap: boolean = false;

    // NOTE(cdata): Check at construction time because the check is cheap
    // and it makes testing easier
    private[$isHeliosBrowser]: boolean = self.mlWorld != null;

    private[$mlModel]: HTMLElement|null = null;

    updated(changedProperties: Map<string, any>) {
      super.updated(changedProperties);

      if (!this[$isHeliosBrowser]) {
        return;
      }

      if (!(changedProperties.has('magicLeap') ||
            changedProperties.has('src'))) {
        return;
      }

      const scene = this[$scene];

      if (this.magicLeap) {
        const hasMlModel = !!customElements.get('ml-model');

        if (!hasMlModel) {
          console.warn('<ml-model> is not registered. Is prismatic.js loaded?');
        }

        scene.pause();
        this[$container].setAttribute('style', 'display: none;');
        this[$showMlModel]();

        if (changedProperties.has('src') && this.src &&
            this.src !== this[$mlModel]!.getAttribute('src')) {
          this[$mlModel]!.setAttribute('src', this.src);
        }
      } else {
        this[$hideMlModel]();
        scene.resume();
        this[$container].removeAttribute('style');
      }
    }

    private[$showMlModel]() {
      if (this[$mlModel] == null) {
        this[$mlModel] = document.createElement('ml-model');
        this[$mlModel]!.setAttribute(
            'style',
            'display: block; top: 0; left: 0; width: 100%; height: 100%');
        // @see https://creator.magicleap.com/learn/guides/prismatic-getting-started
        this[$mlModel]!.setAttribute(
            'model-scale',
            `${DEFAULT_HOLOGRAM_INLINE_SCALE} ${
                DEFAULT_HOLOGRAM_INLINE_SCALE} ${
                DEFAULT_HOLOGRAM_INLINE_SCALE}`);
        this[$mlModel]!.setAttribute('z-offset', DEFAULT_HOLOGRAM_Z_OFFSET);
        this[$mlModel]!.setAttribute('extractable', 'true');
        this[$mlModel]!.setAttribute('extracted-scale', '1');
        this[$mlModel]!.setAttribute(
            'environment-lighting', 'color-intensity: 5;');

        if (this.src != null) {
          this[$mlModel]!.setAttribute('src', this.src);
        }
      }

      this.shadowRoot!.appendChild(this[$mlModel]!);
    }

    private[$hideMlModel]() {
      if (this[$mlModel] == null) {
        return;
      }

      if (this[$mlModel]!.parentNode != null) {
        this[$mlModel]!.parentNode!.removeChild(this[$mlModel]!);
      }
    }
  }

  return MagicLeapModelViewerElement;
}
