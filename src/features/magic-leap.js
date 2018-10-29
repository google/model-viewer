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

// import '@magicleap/prismatic/prismatic.min.js';

const $showMlModel = Symbol('showMlModel');
const $hideMlModel = Symbol('hideMlModel');
const $isHeliosBrowser = Symbol('isHeliosBrowser');
const $mlModel = Symbol('mlModel');


/**
 * In order to use Magic Leap support, please include prismatic.js in your
 * page. If you do not include prismatic.js, Magic Leap support will not work.
 *
 * @see https://www.npmjs.com/package/@magicleap/prismatic
 */
export const MagicLeapMixin = (XRModelElement) => {
  return class extends XRModelElement {
    static get properties() {
      return {
        ...super.properties,
        magicLeap: {type: Boolean, attribute: 'magic-leap'}
      };
    }

    constructor() {
      super();

      // NOTE(cdata): Check at construction time because the check is cheap and
      // it makes testing easier
      this[$isHeliosBrowser] = self.mlWorld != null;
      this[$mlModel] = null;
    }

    update(changedProperties) {
      super.update(changedProperties);

      if (!this[$isHeliosBrowser]) {
        return;
      }

      if (!(changedProperties.has('magicLeap') ||
            changedProperties.has('src'))) {
        return;
      }

      const modelView = this.__modelView;

      if (this.magicLeap) {
        const hasMlModel = !!customElements.get('ml-model');

        if (!hasMlModel) {
          console.warn('<ml-model> is not registered. Is prismatic.js loaded?');
        }

        modelView.pause();
        this.__containerElement.setAttribute('style', 'display: none;');
        this[$showMlModel]();

        if (changedProperties.has('src') && this.src &&
            this.src !== this[$mlModel].getAttribute('src')) {
          this[$mlModel].setAttribute('src', this.src);
        }

      } else {
        this[$hideMlModel]();
        modelView.resume();
        this.__containerElement.removeAttribute('style');
      }
    }

    [$showMlModel]() {
      if (this[$mlModel] == null) {
        this[$mlModel] = document.createElement('ml-model');
        this[$mlModel].setAttribute(
            'style',
            'display: block; top: 0; left: 0; width: 100%; height: 100%');
        // @see https://creator.magicleap.com/learn/guides/prismatic-getting-started
        this[$mlModel].setAttribute('model-scale', '0.65 0.65 0.65');
        this[$mlModel].setAttribute('z-offset', '500px');
        this[$mlModel].setAttribute('extractable', 'true');
        this[$mlModel].setAttribute('extracted-scale', '1');
        this[$mlModel].setAttribute(
            'environment-lighting', 'color-intensity: 1;');


        if (this.src != null) {
          this[$mlModel].setAttribute('src', this.src);
        }
      }

      this.appendChild(this[$mlModel]);
    }

    [$hideMlModel]() {
      if (this[$mlModel] == null) {
        return;
      }

      this[$mlModel].remove();
    }
  };
}
