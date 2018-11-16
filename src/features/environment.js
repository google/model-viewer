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

import {$needsRender, $onModelLoad, $renderer, $scene, $tick} from '../model-viewer-base.js';
const DEFAULT_BACKGROUND_COLOR = '#ffffff';
const GAMMA_TO_LINEAR = 2.2;

const $currentCubemap = Symbol('currentCubemap');
const $setEnvironmentImage = Symbol('setEnvironmentImage');
const $setEnvironmentColor = Symbol('setEnvironmentColor');
const $hasBackgroundImage = Symbol('hasBackgroundImage');
const $hasBackgroundColor = Symbol('hasBackgroundColor');
const $deallocateTextures = Symbol('deallocateTextures');

export const EnvironmentMixin = (ModelViewerElement) => {
  return class extends ModelViewerElement {
    static get properties() {
      return {
        ...super.properties,
        backgroundImage: {type: String, attribute: 'background-image'},
        backgroundColor: {type: String, attribute: 'background-color'}
      };
    }

    get [$hasBackgroundImage]() {
      // @TODO #76
      return this.backgroundImage && this.backgroundImage !== 'null';
    }

    get [$hasBackgroundColor]() {
      // @TODO #76
      return this.backgroundColor && this.backgroundColor !== 'null';
    }

    connectedCallback() {
      super.connectedCallback();
    }

    async update(changedProperties) {
      super.update(changedProperties);

      // If no background-image/background-color set, use the default
      // color.
      if (!this[$hasBackgroundImage] && !this[$hasBackgroundColor]) {
        this[$setEnvironmentColor](DEFAULT_BACKGROUND_COLOR);
        return;
      }

      if (!changedProperties.has('backgroundImage') &&
          !changedProperties.has('backgroundColor')) {
        return;
      }

      if (this[$hasBackgroundImage]) {
        this[$setEnvironmentImage](this.backgroundImage);
      } else if (this[$hasBackgroundColor]) {
        this[$setEnvironmentColor](this.backgroundColor);
      }
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
     * @param {string} url
     */
    async [$setEnvironmentImage](url) {
      const textureUtils = this[$renderer].textureUtils;
      const textures = await textureUtils.toCubemapAndEquirect(url);

      // If the background image has changed
      // while fetching textures, abort and defer to that
      // invocation of this function.
      if (url !== this.backgroundImage) {
        return;
      }

      this[$deallocateTextures]();

      // If could not load textures (probably an invalid URL), then abort
      // after deallocating textures.
      if (!textures) {
        this[$scene].model.applyEnvironmentMap(null);
        return;
      }

      const { cubemap, equirect } = textures;

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
      const textureUtils = this[$renderer].textureUtils;

      this[$deallocateTextures]();

      this[$scene].skysphere.material.color = new Color(color);
      this[$scene].skysphere.material.color.convertGammaToLinear(
          GAMMA_TO_LINEAR);
      this[$scene].skysphere.material.map = null;
      this[$scene].skysphere.material.needsUpdate = true;

      // TODO can cache this per renderer and color
      const cubemap = textureUtils.generateDefaultEnvMap();
      this[$currentCubemap] = cubemap;
      this[$scene].model.applyEnvironmentMap(this[$currentCubemap]);

      this[$needsRender]();
    }

    [$deallocateTextures]() {
      if (this[$scene].skysphere.material.map) {
        this[$scene].skysphere.material.map.dispose();
        this[$scene].skysphere.material.map = null;
      }
      if (this[$currentCubemap]) {
        this[$currentCubemap].dispose();
        this[$currentCubemap] = null;
      }
    }
  }
};
