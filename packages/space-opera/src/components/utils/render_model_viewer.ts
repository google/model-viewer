/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
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
 *
 */

import '@google/model-viewer';

import {ModelViewerConfig} from '@google/model-viewer-editing-adapter/lib/main.js'
import {html, TemplateResult} from 'lit-html';
import {ifDefined} from 'lit-html/directives/if-defined';
import {styleMap} from 'lit-html/directives/style-map';

/** Optional handlers for model-viewer events */
export interface ModelViewerEventHandlers {
  readonly load?: () => void;
  readonly cameraChange?: () => void;
  readonly modelVisibility?: () => void;
  readonly play?: () => void;
  readonly pause?: () => void;
  readonly click?: (event: MouseEvent) => void;
}

/**
 * Renders a model-viewer tag given the config.
 */
export function renderModelViewer(
    config: ModelViewerConfig,
    eventHandlers?: ModelViewerEventHandlers,
    childElements?: Array<TemplateResult|HTMLElement>) {
  const styles = {backgroundColor: config.bgColor || 'unset'};
  const skyboxImage =
      config.useEnvAsSkybox ? config.environmentImage : undefined;
  return html`<model-viewer
        src=${config.src || ''}
        ?autoplay=${!!config.autoplay}
        ?auto-rotate=${!!config.autoRotate}
        ?camera-controls=${!!config.cameraControls}
        environment-image=${ifDefined(config.environmentImage)}
        skybox-image=${ifDefined(skyboxImage)}
        exposure=${ifDefined(config.exposure)}
        poster=${ifDefined(config.poster)}
        shadow-intensity=${ifDefined(config.shadowIntensity)}
        shadow-softness=${ifDefined(config.shadowSoftness)}
        style=${styleMap(styles)}
        camera-target=${ifDefined(config.cameraTarget)}
        camera-orbit=${ifDefined(config.cameraOrbit)}
        field-of-view=${ifDefined(config.fieldOfView)}
        min-camera-orbit=${ifDefined(config.minCameraOrbit)}
        max-camera-orbit=${ifDefined(config.maxCameraOrbit)}
        min-field-of-view=${ifDefined(config.minFov)}
        max-field-of-view=${ifDefined(config.maxFov)}
        animation-name=${ifDefined(config.animationName)}
        @load=${eventHandlers?.load}
        @camera-change=${eventHandlers?.cameraChange}
        @model-visibility=${eventHandlers?.modelVisibility}
        @play=${eventHandlers?.play}
        @pause=${eventHandlers?.pause}
        @click=${eventHandlers?.click}
      >
      ${childElements}
    </model-viewer>
        `;
}
