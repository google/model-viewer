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

import {
  $scene, $tick, $needsRender
} from '../xr-model-element-base.js';

// How much the model should rotate per
// second in radians.
const ROTATION_SPEED = Math.PI / 32;

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
        this[$scene].pivot.rotation.set(0, 0, 0);
        this[$needsRender]();
      }
    }

    [$tick](time, delta) {
      super[$tick](time, delta);

      if (this.autoRotate) {
        this[$scene].pivot.rotation.y += ROTATION_SPEED * delta * 0.001;
        this[$needsRender]();
      }
    }
  };
};
