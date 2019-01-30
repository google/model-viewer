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

import {BackSide, BoxBufferGeometry, Color, Mesh, ShaderLib, ShaderMaterial, UniformsUtils} from 'three';

import {$needsRender, $onModelLoad, $renderer, $scene, $tick} from '../model-viewer-base.js';

const DEFAULT_BACKGROUND_COLOR = '#ffffff';

const WHITE = new Color('#ffffff');

const $currentEnvironmentMap = Symbol('currentEnvironmentMap');
const $setEnvironmentImage = Symbol('setEnvironmentImage');
const $setEnvironmentColor = Symbol('setEnvironmentColor');
const $setShadowLightColor = Symbol('setShadowLightColor');
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

    get[$hasBackgroundImage]() {
      // @TODO #76
      return this.backgroundImage && this.backgroundImage !== 'null';
    }

    get[$hasBackgroundColor]() {
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

    [$onModelLoad](e) {
      super[$onModelLoad](e);

      if (this[$currentEnvironmentMap]) {
        this[$scene].model.applyEnvironmentMap(this[$currentEnvironmentMap]);
        this[$needsRender]();
      }
    }

    /**
     * @param {string} url
     */
    async[$setEnvironmentImage](url) {
      const textureUtils = this[$renderer].textureUtils;

      if (textureUtils == null) {
        return;
      }

      const textures = await textureUtils.generateEnvironmentTextures(url);

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

      const {skybox, environmentMap} = textures;

      this[$scene].background = skybox;

      this[$currentEnvironmentMap] = environmentMap;
      this[$scene].model.applyEnvironmentMap(environmentMap);

      this[$setShadowLightColor](WHITE);

      this[$needsRender]();
    }

    /**
     * @param {string} color
     */
    [$setEnvironmentColor](color) {
      const textureUtils = this[$renderer].textureUtils;

      if (textureUtils == null) {
        return;
      }

      this[$deallocateTextures]();

      const parsedColor = new Color(color);

      this[$scene].background = parsedColor;

      this[$setShadowLightColor](parsedColor);

      // TODO(#336): can cache this per renderer and color
      const environmentMap = textureUtils.generateDefaultEnvironmentMap();
      this[$currentEnvironmentMap] = environmentMap;
      this[$scene].model.applyEnvironmentMap(this[$currentEnvironmentMap]);

      this[$needsRender]();
    }

    [$setShadowLightColor](color) {
      this[$scene].shadowLight.color.copy(color);
      this[$scene].shadowLight.color.lerpHSL(WHITE, 0.5);
    }

    [$deallocateTextures]() {
      const background = this[$scene].background;
      if (background && background.dispose) {
        background.dispose();
      }
      if (this[$currentEnvironmentMap]) {
        this[$currentEnvironmentMap].dispose();
        this[$currentEnvironmentMap] = null;
      }
    }
  }
};
