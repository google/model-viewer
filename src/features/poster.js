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

import {$scene} from '../model-viewer-element-base.js';
import {deserializeUrl} from '../utils.js';

const $posterElement = Symbol('posterElement');
const $clickToViewElement = Symbol('clickToViewElement');

export const PosterMixin = (ModelViewerElement) => {
  return class extends ModelViewerElement {
    static get properties() {
      return {...super.properties, poster: {type: deserializeUrl}};
    }

    constructor() {
      super();

      // TODO: Add this to the shadow root as part of this mixin's
      // implementation:
      this[$posterElement] = this.shadowRoot.querySelector('.poster');
      this[$clickToViewElement] =
          this.shadowRoot.querySelector('.click-to-view');
      this.addEventListener('click', () => this.hidePoster());
      this[$scene].addEventListener('model-load', () => this.hidePoster());
    }

    hidePoster() {
      this[$posterElement].classList.remove('show');
      this[$clickToViewElement].classList.remove('show');
    }

    update(changedProperties) {
      super.update(changedProperties);

      if (!changedProperties.has('poster')) {
        return;
      }

      const src = this.poster;

      if (src) {
        if (!this.__loaded && !this.__userInput) {
          this[$posterElement].classList.add('show');
          this[$clickToViewElement].classList.add('show');
        }
        this[$posterElement].style.backgroundImage = `url("${src}")`;
      } else {
        this[$posterElement].style.backgroundImage = '';
        this.hidePoster();
      }
    }
  };
}
