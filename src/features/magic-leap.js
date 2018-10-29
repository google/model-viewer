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

const $isHeliosBrowser = Symbol('isHeliosBrowser');

export const PosterMixin = (XRModelElement) => {
  return class extends XRModelElement {
    static get properties() {
      return {
        ...super.properties,
        magicLeap: {type: Boolean, attribute: 'magic-leap'}
      };
    }

    constructor() {
      super();

      this[$isHeliosBrowser] = self.mlWorld != null;
    }

    update(changedProperties) {
      super.update(changedProperties);

      if (!changedProperties.has('magicLeap')) {
        return;
      }

      const modelView = this.__modelView;

      if (!this[$isHeliosBrowser]) {
        return;
      }

      if (this.magicLeap) {
        modelView.pause();
        this.__containerElement.setAttribute('style', 'display: none;');
      } else {
        modelView.resume();
        this.__containerElement.removeAttribute('style');
      }
    }
  };
}
