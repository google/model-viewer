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
import {Event as ThreeEvent, Texture} from 'three';

import ModelViewerElementBase, {$needsRender, $onModelLoad, $progressTracker, $renderer, $scene, $shouldAttemptPreload} from '../model-viewer-base.js';
import {PreloadEvent} from '../three-components/CachingGLTFLoader.js';
import {EnvironmentMapAndSkybox} from '../three-components/TextureUtils.js';
import {Constructor, deserializeUrl} from '../utilities.js';

export const BASE_OPACITY = 0.5;
const DEFAULT_SHADOW_INTENSITY = 0.0;
const DEFAULT_SHADOW_SOFTNESS = 1.0;
const DEFAULT_EXPOSURE = 1.0;

const $currentEnvironmentMap = Symbol('currentEnvironmentMap');
const $applyEnvironmentMap = Symbol('applyEnvironmentMap');
export const $updateEnvironment = Symbol('updateEnvironment');
const $cancelEnvironmentUpdate = Symbol('cancelEnvironmentUpdate');
const $onPreload = Symbol('onPreload');

export declare interface EnvironmentInterface {
  environmentImage: string|null;
  skyboxImage: string|null;
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

    @property({
      type: Number,
    })
    exposure: number = DEFAULT_EXPOSURE;

    private[$currentEnvironmentMap]: Texture|null = null;

    private[$cancelEnvironmentUpdate]: ((...args: any[]) => any)|null = null;

    private[$onPreload] = (event: ThreeEvent) => {
      if ((event as PreloadEvent).element === this) {
        this[$updateEnvironment]();
      }
    };

    connectedCallback() {
      super.connectedCallback();
      this[$renderer].loader.addEventListener('preload', this[$onPreload]);
    }

    disconnectedCallback() {
      super.disconnectedCallback();
      this[$renderer].loader.removeEventListener('preload', this[$onPreload]);
    }

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

      if ((changedProperties.has('environmentImage') ||
           changedProperties.has('skyboxImage')) &&
          this[$shouldAttemptPreload]()) {
        this[$updateEnvironment]();
      }
    }

    hasBakedShadow(): boolean {
      return this[$scene].bakedShadows.size > 0;
    }

    [$onModelLoad]() {
      super[$onModelLoad]();

      if (this[$currentEnvironmentMap] != null) {
        this[$applyEnvironmentMap](this[$currentEnvironmentMap]);
      }
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

      try {
        const {environmentMap, skybox} =
            await new Promise<EnvironmentMapAndSkybox>(
                async (resolve, reject) => {
                  const texturesLoad =
                      textureUtils.generateEnvironmentMapAndSkybox(
                          deserializeUrl(skyboxImage),
                          environmentImage,
                          {progressTracker: this[$progressTracker]});
                  this[$cancelEnvironmentUpdate] = () => reject(texturesLoad);
                  resolve(await texturesLoad);
                });

        if (skybox != null) {
          // When using the same environment and skybox, use the environment as
          // it gives HDR filtering.
          this[$scene].background =
              skybox.name === environmentMap.name ? environmentMap : skybox;
        } else {
          this[$scene].background = null;
        }

        this[$applyEnvironmentMap](environmentMap);
        this[$scene].dispatchEvent({type: 'envmap-update'});
      } catch (errorOrPromise) {
        if (errorOrPromise instanceof Error) {
          this[$applyEnvironmentMap](null);
          throw errorOrPromise;
        }
      }
    }

    /**
     * Sets the Model to use the provided environment map,
     * or `null` if the Model should remove its' environment map.
     */
    private[$applyEnvironmentMap](environmentMap: Texture|null) {
      if (this[$scene].environment === environmentMap) {
        return;
      }
      this[$currentEnvironmentMap] = environmentMap;
      this[$scene].environment = this[$currentEnvironmentMap];
      this.dispatchEvent(new CustomEvent('environment-change'));

      this[$needsRender]();
    }
  }

  return EnvironmentModelViewerElement;
};
