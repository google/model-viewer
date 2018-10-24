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

import {Component} from '../component.js';
import {$updateFeatures} from '../xr-model-element.js';

const DEFAULT_BACKGROUND_COLOR = new Color(0xffffff);

export const BackgroundColorMixin = (XRModelElement) => {
  return class extends XRModelElement {
    static get components() {
      return {...super.components, 'background-color': Component};
    }

    [$updateFeatures](modelView, components) {
      super[$updateFeatures](modelView, components);

      const {renderer} = modelView;
      const color = components.get('background-color').value;

      if (color && typeof color === 'string') {
        renderer.setClearColor(new Color(color));
      } else {
        renderer.setClearColor(DEFAULT_BACKGROUND_COLOR);
      }
    }
  };
};
