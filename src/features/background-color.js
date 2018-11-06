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

import {Color} from 'three';
import {$needsRender, $scene} from '../xr-model-element-base.js';

const $setEnvironmentColor = Symbol('setEnvironmentColor');

/**
 * background-color is dependent of its parent mixin,
 * background-image, and applies a fallback color if background-image
 * is removed since they both share access to the skysphere.
 */
export const BackgroundColorMixin = (XRModelElement) => {
  return class extends XRModelElement {
    static get properties() {
      return {
        ...super.properties,
        backgroundColor: {type: String, attribute: 'background-color'}
      };
    }

    update(changedProperties) {
      super.update(changedProperties);

      if (!changedProperties.has('backgroundImage') &&
          !changedProperties.has('backgroundColor')) {
        return;
      }

      // @TODO #76
      if (!this.backgroundImage || this.backgroundImage == 'null') {
        this[$setEnvironmentColor](new Color(this.backgroundColor));
      }
    }

    /**
     * @param {string} color
     */
    [$setEnvironmentColor](color) {
      this[$scene].skysphere.material.color = new Color(color || 0xffffff);
      this[$scene].skysphere.material.map = null;
      this[$scene].skysphere.material.needsUpdate = true;
      this[$scene].model.applyEnvironmentMap(null);

      this[$needsRender]();
    }
  };
};
