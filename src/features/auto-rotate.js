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

import {$tick} from '../xr-model-element-base.js';

const $rotateEnabled = Symbol('rotate-enabled');

export const AutoRotateMixin = (XRModelElement) => {
  return class extends XRModelElement {
    static get properties() {
      return {
        ...super.properties,
        autoRotate: {type: Boolean, attribute: 'auto-rotate'}
      };
    }

    update(changedProperties) {
      super.update(changedProperties);

      if (!changedProperties.has('autoRotate')) {
        return;
      }

      if (this.autoRotate) {
        this.__modelView.domView.pivot.rotation.set(0, 0, 0);
      }
    }

    [$tick]() {
      super[$tick]();

      if (this.autoRotate) {
        this.__modelView.domView.pivot.rotation.y += 0.001;
      }
    }
  };
};
