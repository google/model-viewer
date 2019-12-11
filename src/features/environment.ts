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

import {property} from 'lit-element';
import {Color, Texture} from 'three';

import ModelViewerElementBase, {$container, $isInRenderTree, $needsRender, $onModelLoad, $progressTracker, $renderer, $scene} from '../model-viewer-base.js';
import {Constructor, deserializeUrl} from '../utilities.js';

const DEFAULT_BACKGROUND_COLOR = '#ffffff';
const DEFAULT_SHADOW_INTENSITY = 0.0;
const DEFAULT_SHADOW_SOFTNESS = 1.0;
const DEFAULT_EXPOSURE = 1.0;

const $currentEnvironmentMap = Symbol('currentEnvironmentMap');
const $applyEnvironmentMap = Symbol('applyEnvironmentMap');
const $updateEnvironment = Symbol('updateEnvironment');
const $cancelEnvironmentUpdate = Symbol('cancelEnvironmentUpdate');

export declare interface EnvironmentInterface {
  environmentImage: string|null;
  skyboxImage: string|null;
  backgroundColor: string;
  shadowIntensity: number;
  shadowSoftness: number;
  exposure: number;
}

export const EnvironmentMixin = <T extends Constructor<ModelViewerElementBase>>(
    ModelViewerElement: T): Constructor<EnvironmentInterface>&T => {
  class EnvironmentModelViewerElement extends ModelViewerElement {
    @property({
      type: String,
      attribute: 'environment-image',
      converter: {fromAttribute: deserializeUrl}
    })
    environmentImage: string|null = null;

    @property({
      type: String,
      attribute: 'skybox-image',
      converter: {fromAttribute: deserializeUrl}
    })
    skyboxImage: string|null = null;

    @property({type: String, attribute: 'background-color'})
    backgroundColor: string = DEFAULT_BACKGROUND_COLOR;

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

    updated(changedProperties: Map<string|number|symbol, unknown>) {
      super.updated(changedProperties);

      if (changedProperties.has('shadowIntensity')) {
        this[$scene].setShadowIntensity(this.shadowIntensity);
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

      if (changedProperties.has('environmentImage') ||
          changedProperties.has('skyboxImage') ||
          changedProperties.has('backgroundColor') ||
          changedProperties.has('experimentalPmrem') ||
          changedProperties.has($isInRenderTree)) {
        this[$updateEnvironment]();
      }
    }

    [$onModelLoad](event: any) {
      super[$onModelLoad](event);

      if (this[$currentEnvironmentMap] != null) {
        this[$applyEnvironmentMap](this[$currentEnvironmentMap]!);
      }
    }

    async[$updateEnvironment]() {
      if (!this[$isInRenderTree]) {
        return;
      }

      const {skyboxImage, backgroundColor, environmentImage} = this;
      // Set the container node's background color so that it matches
      // the background color configured for the scene. It's important
      // to do this because we round the size of the canvas off to the
      // nearest pixel, so it is possible (indeed likely) that there is
      // a marginal gap around one or two edges of the canvas.
      this[$container].style.backgroundColor = backgroundColor;

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
            await new Promise(async (resolve, reject) => {
              const texturesLoad = textureUtils.generateEnvironmentMapAndSkybox(
                  skyboxImage,
                  environmentImage,
                  {progressTracker: this[$progressTracker]});
              this[$cancelEnvironmentUpdate] = () => reject(texturesLoad);
              resolve(await texturesLoad);
            });

        if (skybox != null) {
          const material = this[$scene].skyboxMaterial();
          // This hack causes ShaderMaterial to populate the correct
          // envMapTexelToLinear function.
          (material as any).envMap = skybox.texture;
          material.uniforms.envMap.value = skybox.texture;
          material.needsUpdate = true;
          this[$scene].add(this[$scene].skyboxMesh);
        } else {
          this[$scene].remove(this[$scene].skyboxMesh);

          const parsedColor = new Color(backgroundColor);
          this[$scene].background = parsedColor;
        }

        this[$applyEnvironmentMap](environmentMap.texture);
        this[$scene].model.dispatchEvent({type: 'envmap-update'});
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
     */
    private[$applyEnvironmentMap](environmentMap: Texture|null) {
      this[$currentEnvironmentMap] = environmentMap;
      this[$scene].model.applyEnvironmentMap(this[$currentEnvironmentMap]);
      this.dispatchEvent(new CustomEvent('environment-change'));

      this[$needsRender]();
    }
  }

  return EnvironmentModelViewerElement;
};
