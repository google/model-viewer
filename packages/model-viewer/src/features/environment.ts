/* @license
 * Copyright 2019 Google LLC. All Rights Reserved.
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

import {property} from 'lit/decorators.js';
import {ACESFilmicToneMapping, AgXToneMapping, NeutralToneMapping, Texture} from 'three';

import ModelViewerElementBase, {$needsRender, $progressTracker, $renderer, $scene, $shouldAttemptPreload} from '../model-viewer-base.js';
import {clamp, Constructor, deserializeUrl} from '../utilities.js';

export const BASE_OPACITY = 0.5;
const DEFAULT_SHADOW_INTENSITY = 0.0;
const DEFAULT_SHADOW_SOFTNESS = 1.0;
const DEFAULT_EXPOSURE = 1.0;

export type ToneMappingValue = 'auto'|'aces'|'agx'|'commerce'|'neutral';

export const $currentEnvironmentMap = Symbol('currentEnvironmentMap');
export const $currentBackground = Symbol('currentBackground');
export const $updateEnvironment = Symbol('updateEnvironment');
const $cancelEnvironmentUpdate = Symbol('cancelEnvironmentUpdate');

export declare interface EnvironmentInterface {
  environmentImage: string|null;
  skyboxImage: string|null;
  skyboxHeight: string;
  shadowIntensity: number;
  shadowSoftness: number;
  exposure: number;
  hasBakedShadow(): boolean;
}

export const EnvironmentMixin = <T extends Constructor<ModelViewerElementBase>>(
    ModelViewerElement: T): Constructor<EnvironmentInterface>&T => {
  class EnvironmentModelViewerElement extends ModelViewerElement {
    @property({type: String, attribute: 'environment-image'})
    environmentImage: string|null = null;

    @property({type: String, attribute: 'skybox-image'})
    skyboxImage: string|null = null;

    @property({type: Number, attribute: 'shadow-intensity'})
    shadowIntensity: number = DEFAULT_SHADOW_INTENSITY;

    @property({type: Number, attribute: 'shadow-softness'})
    shadowSoftness: number = DEFAULT_SHADOW_SOFTNESS;

    @property({type: Number}) exposure: number = DEFAULT_EXPOSURE;

    @property({type: String, attribute: 'tone-mapping'})
    toneMapping: ToneMappingValue = 'auto';

    @property({type: String, attribute: 'skybox-height'})
    skyboxHeight: string = '0';

    protected[$currentEnvironmentMap]: Texture|null = null;
    protected[$currentBackground]: Texture|null = null;

    private[$cancelEnvironmentUpdate]: ((...args: any[]) => any)|null = null;

    updated(changedProperties: Map<string|number|symbol, unknown>) {
      super.updated(changedProperties);

      if (changedProperties.has('shadowIntensity')) {
        this[$scene].setShadowIntensity(this.shadowIntensity * BASE_OPACITY);
        this[$needsRender]();
      }

      if (changedProperties.has('shadowSoftness')) {
        this[$scene].setShadowSoftness(this.shadowSoftness);
        this[$needsRender]();
      }

      if (changedProperties.has('exposure')) {
        this[$scene].exposure = this.exposure;
        this[$needsRender]();
      }

      if (changedProperties.has('toneMapping')) {
        this[$scene].toneMapping = this.toneMapping === 'aces' ?
            ACESFilmicToneMapping :
            this.toneMapping === 'agx' ? AgXToneMapping :
                                         NeutralToneMapping;
        this[$needsRender]();
      }

      if ((changedProperties.has('environmentImage') ||
           changedProperties.has('skyboxImage')) &&
          this[$shouldAttemptPreload]()) {
        this[$updateEnvironment]();
      }

      if (changedProperties.has('skyboxHeight')) {
        this[$scene].setGroundedSkybox();
        this[$needsRender]();
      }
    }

    hasBakedShadow(): boolean {
      return this[$scene].bakedShadows.size > 0;
    }

    async[$updateEnvironment]() {
      const {skyboxImage, environmentImage} = this;

      if (this[$cancelEnvironmentUpdate] != null) {
        this[$cancelEnvironmentUpdate]!();
        this[$cancelEnvironmentUpdate] = null;
      }

      const {textureUtils} = this[$renderer];

      if (textureUtils == null) {
        return;
      }

      const updateEnvProgress =
          this[$progressTracker].beginActivity('environment-update');

      try {
        const {environmentMap, skybox} =
            await textureUtils.generateEnvironmentMapAndSkybox(
                deserializeUrl(skyboxImage),
                environmentImage,
                (progress: number) => updateEnvProgress(clamp(progress, 0, 1)),
                this.withCredentials);

        if (this[$currentEnvironmentMap] !== environmentMap) {
          this[$currentEnvironmentMap] = environmentMap;
          this.dispatchEvent(new CustomEvent('environment-change'));
        }
        if (skybox != null) {
          // When using the same environment and skybox, use the environment as
          // it gives HDR filtering.
          this[$currentBackground] =
              skybox.name === environmentMap.name ? environmentMap : skybox;
        } else {
          this[$currentBackground] = null;
        }

        this[$scene].setEnvironmentAndSkybox(
            this[$currentEnvironmentMap], this[$currentBackground]);
      } catch (errorOrPromise) {
        if (errorOrPromise instanceof Error) {
          this[$scene].setEnvironmentAndSkybox(null, null);
          throw errorOrPromise;
        }
      } finally {
        updateEnvProgress(1.0);
      }
    }
  }

  return EnvironmentModelViewerElement;
};
