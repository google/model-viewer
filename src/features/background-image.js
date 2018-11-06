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

import {equirectangularToCubemap, loadTexture} from '../three-components/TextureUtils.js';
import {$needsRender, $onModelLoad, $renderer, $scene} from '../xr-model-element-base.js';

const $currentEquiRect = Symbol('currentEquiRect');
const $currentCubemap = Symbol('currentCubemap');
const $clearEnvironment = Symbol('clearEnvironment');
const $setEnvironment = Symbol('setEnvironment');

export const BackgroundImageMixin = (XRModelElement) => {
  return class extends XRModelElement {
    static get properties() {
      return {
        ...super.properties,
        backgroundImage: {type: String, attribute: 'background-image'}
      };
    }

    async update(changedProperties) {
      super.update(changedProperties);

      if (!changedProperties.has('backgroundImage')) {
        return;
      }

      let backgroundImage = this.backgroundImage;

      // @TODO #76
      if (!backgroundImage || backgroundImage === 'null') {
        this[$clearEnvironment]();
        return;
      }

      try {
        const renderer = this[$renderer].renderer;
        const texture = await loadTexture(backgroundImage);
        const cubemap = await equirectangularToCubemap(renderer, texture);

        // Ensure the value hasn't changed since the start
        if (backgroundImage === this.backgroundImage) {
          // Tag the name of the textures with the source URL
          // since we will lose reference to the original URL.
          texture.name = backgroundImage;
          cubemap.name = backgroundImage;
          this[$setEnvironment](texture, cubemap);
        }
      } catch (e) {
        this[$clearEnvironment]();
      }
    }

    [$onModelLoad](e) {
      super[$onModelLoad](e);

      if (this[$currentCubemap]) {
        this[$scene].model.applyEnvironmentMap(this[$currentCubemap]);
        this[$needsRender]();
      }
    }

    [$clearEnvironment]() {
      this[$scene].skysphere.material.color = null;
      this[$scene].skysphere.material.map = null;
      this[$scene].skysphere.material.needsUpdate = true;
      this[$scene].model.applyEnvironmentMap(null);
      this[$currentEquiRect] = null;
      this[$currentCubemap] = null;

      this[$needsRender]();
    }

    [$setEnvironment](equiRect, cubemap) {
      this[$scene].skysphere.material.color = new Color(0xffffff);
      this[$scene].skysphere.material.map = equiRect;
      this[$scene].skysphere.material.needsUpdate = true;
      this[$scene].model.applyEnvironmentMap(cubemap);
      this[$currentEquiRect] = equiRect;
      this[$currentCubemap] = cubemap;

      this[$needsRender]();
    }
  }
};
