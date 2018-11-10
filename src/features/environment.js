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

import {$needsRender, $onModelLoad, $renderer, $scene, $tick} from '../model-viewer-element-base.js';
import EnvMapGenerator from '../three-components/EnvMapGenerator.js';
import {pmremPass, toCubemapAndEquirect} from '../three-components/TextureUtils.js';

const DEFAULT_BACKGROUND_COLOR = '#ffffff';
const DEFAULT_ENVMAP_SIZE = 512;
const GAMMA_TO_LINEAR = 2.2;

const $currentCubemap = Symbol('currentCubemap');
const $setEnvironmentImage = Symbol('setEnvironmentImage');
const $setEnvironmentColor = Symbol('setEnvironmentColor');
const $envMapGenerator = Symbol('envMapGenerator');

export const EnvironmentMixin = (ModelViewerElement) => {
  return class extends ModelViewerElement {
    static get properties() {
      return {
        ...super.properties,
        backgroundImage: {type: String, attribute: 'background-image'},
        backgroundColor: {type: String, attribute: 'background-color'}
      };
    }

    constructor() {
      super();
      this[$envMapGenerator] = new EnvMapGenerator(this[$renderer].renderer);
    }

    connectedCallback() {
      super.connectedCallback();
      this[$setEnvironmentColor]();
    }

    async update(changedProperties) {
      super.update(changedProperties);

      if (!changedProperties.has('backgroundImage') &&
          !changedProperties.has('backgroundColor')) {
        return;
      }

      let backgroundImage = this.backgroundImage;

      // @TODO #76
      let hasBackgroundImage = backgroundImage && backgroundImage !== 'null';

      if (hasBackgroundImage) {
        let textures = await toCubemapAndEquirect(
            this[$renderer].renderer, backgroundImage);

        // If the background image has changed
        // while fetching textures, abort and defer to that
        // invocation of this function.
        if (backgroundImage !== this.backgroundImage) {
          return;
        }

        if (textures) {
          const cubemap = pmremPass(this[$renderer].renderer, textures.cubemap);
          textures.cubemap.dispose();
          cubemap.name = backgroundImage;

          textures.equirect.name = backgroundImage;
          this[$setEnvironmentImage](textures.equirect, cubemap);
          return;
        }
      }

      this[$setEnvironmentColor](this.backgroundColor);
    }

    [$tick](time, delta) {
      super[$tick](time, delta);
      const camera = this[$scene].getCamera();
      this[$scene].skysphere.position.copy(camera.position);
    }

    [$onModelLoad](e) {
      super[$onModelLoad](e);

      if (this[$currentCubemap]) {
        this[$scene].model.applyEnvironmentMap(this[$currentCubemap]);
        this[$needsRender]();
      }
    }

    /**
     * @param {THREE.Texture} equirect
     * @param {THREE.Texture} cubemap
     */
    [$setEnvironmentImage](equirect, cubemap) {
      this[$scene].skysphere.material.color = new Color(0xffffff);
      this[$scene].skysphere.material.map = equirect;
      this[$scene].skysphere.material.needsUpdate = true;
      this[$currentCubemap] = cubemap;
      this[$scene].model.applyEnvironmentMap(cubemap);

      this[$needsRender]();
    }

    /**
     * @param {string} color
     */
    [$setEnvironmentColor](color) {
      // @TODO #76
      color = color === 'null' || !color ? DEFAULT_BACKGROUND_COLOR : color;

      this[$scene].skysphere.material.color = new Color(color);
      this[$scene].skysphere.material.color.convertGammaToLinear(
          GAMMA_TO_LINEAR);
      this[$scene].skysphere.material.map = null;
      this[$scene].skysphere.material.needsUpdate = true;

      // TODO can cache this per renderer and color
      const cubemap = this[$envMapGenerator].generate(DEFAULT_ENVMAP_SIZE);
      const pmremCubemap = pmremPass(this[$renderer].renderer, cubemap);
      pmremCubemap.name = cubemap.name;
      cubemap.dispose();
      this[$currentCubemap] = pmremCubemap;
      this[$scene].model.applyEnvironmentMap(this[$currentCubemap]);

      this[$needsRender]();
    }
  }
};
