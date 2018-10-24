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

import {BooleanComponent} from '../component.js';
import {$tick, $updateFeatures} from '../xr-model-element-base.js';

const $rotateEnabled = Symbol('rotate-enabled');

export const AutoRotateMixin = (XRModelElement) => {
  return class extends XRModelElement {
    static get components() {
      return {...super.components, 'auto-rotate': BooleanComponent};
    }

    [$updateFeatures](modelView, components) {
      super[$updateFeatures](modelView, components);

      const {enabled} = components.get('auto-rotate');

      if (!enabled) {
        this.__modelView.domView.pivot.rotation.set(0, 0, 0);
      }

      this[$rotateEnabled] = enabled;
    }

    [$tick]() {
      super[$tick]();

      if (this[$rotateEnabled]) {
        this.__modelView.domView.pivot.rotation.y += 0.001;
      }
    }
  };
};
