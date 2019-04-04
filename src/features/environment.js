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

import {IlluminationRole} from '../three-components/ModelScene.js';
const DEFAULT_BACKGROUND_COLOR = '#ffffff';
const DEFAULT_SHADOW_STRENGTH = 0.0;
const DEFAULT_EXPOSURE = 1.0;
const DEFAULT_STAGE_LIGHT_INTENSITY = 1.0;
const DEFAULT_ENVIRONMENT_INTENSITY = 1.0;

const WHITE = new Color('#ffffff');

const $currentEnvironmentMap = Symbol('currentEnvironmentMap');
const $applyEnvironmentMap = Symbol('applyEnvironmentMap');
const $setShadowLightColor = Symbol('setShadowLightColor');
const $deallocateTextures = Symbol('deallocateTextures');
const $updateLighting = Symbol('updateLighting');
const $updateToneMapping = Symbol('updateToneMapping');
const $updateShadow = Symbol('updateShadow');
const $updateEnvironment = Symbol('updateEnvironment');
const $cancelEnvironmentUpdate = Symbol('cancelEnvironmentUpdate');

export const EnvironmentMixin = (ModelViewerElement) => {
  return class extends ModelViewerElement {
    static get properties() {
      return {
        ...super.properties,
        environmentImage: {type: String, attribute: 'environment-image'},
        environmentIntensity:
            {type: Number, attribute: 'environment-intensity'},
        backgroundImage: {type: String, attribute: 'background-image'},
        backgroundColor: {type: String, attribute: 'background-color'},
        experimentalPmrem: {type: Boolean, attribute: 'experimental-pmrem'},
        shadowIntensity: {type: Number, attribute: 'shadow-intensity'},
        stageLightIntensity: {type: Number, attribute: 'stage-light-intensity'},
        exposure: {type: Number, attribute: 'exposure'}
      };
    }

    constructor(...args) {
      super(...args);
      this.shadowIntensity = DEFAULT_SHADOW_STRENGTH;
      this.stageLightIntensity = DEFAULT_STAGE_LIGHT_INTENSITY;
      this.environmentIntensity = DEFAULT_ENVIRONMENT_INTENSITY;
      this.exposure = DEFAULT_EXPOSURE;
      this[$cancelEnvironmentUpdate] = null;
    }

    update(changedProperties) {
      super.update(changedProperties);

      if (changedProperties.has('shadowIntensity')) {
        this[$updateShadow]();
      }

      if (changedProperties.has('exposure')) {
        this[$updateToneMapping]();
      }

      if (changedProperties.has('environmentIntensity') ||
          changedProperties.has('stageLightIntensity')) {
        this[$updateLighting]();
      }

      if (changedProperties.has('environmentImage') ||
          changedProperties.has('backgroundImage') ||
          changedProperties.has('backgroundColor') ||
          changedProperties.has('experimentalPmrem')) {
        this[$updateEnvironment]();
      }
    }

    firstUpdated(changedProperties) {
      // In case no environment-related properties were confiured, we should
      // make sure that the environment is updated at least once:
      if (this[$cancelEnvironmentUpdate] == null) {
        this[$updateEnvironment]();
      }
    }

    [$onModelLoad](e) {
      super[$onModelLoad](e);

      if (this[$currentEnvironmentMap]) {
        this[$applyEnvironmentMap](this[$currentEnvironmentMap]);
      }
    }

    async[$updateEnvironment]() {
      const {backgroundImage, environmentImage, experimentalPmrem: pmrem} =
          this;
      let {backgroundColor} = this;

      if (this[$cancelEnvironmentUpdate] != null) {
        this[$cancelEnvironmentUpdate]();
        this[$cancelEnvironmentUpdate] = null;
      }

      const {textureUtils} = this[$renderer];

      if (textureUtils == null) {
        return;
      }

      try {
        const {environmentMap, skybox} =
            await new Promise(async (resolve, reject) => {
              const texturesLoad = textureUtils.generateEnvironmentMapAndSkybox(
                  backgroundImage, environmentImage, {pmrem});
              this[$cancelEnvironmentUpdate] = () => reject(texturesLoad);
              resolve(await texturesLoad);
            });

        this[$deallocateTextures]();

        if (skybox != null) {
          this[$scene].background = skybox;
          this[$setShadowLightColor](WHITE);
        } else {
          if (!backgroundColor) {
            backgroundColor = DEFAULT_BACKGROUND_COLOR;
          }

          const parsedColor = new Color(backgroundColor);
          this[$scene].background = parsedColor;
          this[$setShadowLightColor](parsedColor);
        }

        this[$applyEnvironmentMap](environmentMap);
      } catch (errorOrPromise) {
        if (errorOrPromise instanceof Error) {
          this[$applyEnvironmentMap](null);
          throw errorOrPromise;
        }

        const {environmentMap, skybox} = await errorOrPromise;

        if (environmentMap != null) {
          environmentMap.dispose();
        }

        if (skybox != null) {
          skybox.dispose();
        }
      }
    }

    /**
     * Sets the Model to use the provided environment map,
     * or `null` if the Model should remove its' environment map.
     *
     * @param {THREE.Texture} environmentMap
     */
    [$applyEnvironmentMap](environmentMap) {
      this[$currentEnvironmentMap] = environmentMap;
      this[$scene].model.applyEnvironmentMap(this[$currentEnvironmentMap]);
      this.dispatchEvent(new CustomEvent('environment-change'));

      this[$updateLighting]();
      this[$needsRender]();
    }

    [$updateShadow]() {
      this[$scene].shadow.intensity = this.shadowIntensity;
      this[$needsRender]();
    }

    [$updateToneMapping]() {
      this[$scene].exposure = this.exposure;
      this[$needsRender]();
    }

    [$updateLighting]() {
      const scene = this[$scene];
      const illuminationRole = this.experimentalPmrem ?
          IlluminationRole.Secondary :
          IlluminationRole.Primary;

      scene.configureStageLighting(this.stageLightIntensity, illuminationRole);
      scene.model.setEnvironmentMapIntensity(this.environmentIntensity);
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
