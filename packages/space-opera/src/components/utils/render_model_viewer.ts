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

import '@google/model-viewer/lib/model-viewer';

import {ModelViewerConfig} from '@google/model-viewer-editing-adapter/lib/main.js'
import {html, TemplateResult} from 'lit-html';
import {ifDefined} from 'lit-html/directives/if-defined';
import {ArConfigState} from '../../types';

/** Optional handlers for model-viewer events */
export interface ModelViewerEventHandlers {
  readonly load?: () => void;
  readonly cameraChange?: () => void;
  readonly modelVisibility?: () => void;
  readonly play?: () => void;
  readonly pause?: () => void;
  readonly click?: (event: MouseEvent) => void;
}

// implement:
// https://github.com/Polymer/lit-html/issues/923#issuecomment-548547460
// https://open-wc.org/docs/development/lit-helpers/#spread-directives

/**
 * Renders a model-viewer tag given the config.
 */
export function renderModelViewer(
    config: ModelViewerConfig,
    arConfig: ArConfigState,
    extraAttributes: string,
    eventHandlers?: ModelViewerEventHandlers,
    childElements?: Array<TemplateResult|HTMLElement>) {
  console.log(extraAttributes, extraAttributes.length);
  const extraA =
      extraAttributes.length > 0 ? extraAttributes : `\nar-placement=floor\n`;
  console.log(extraA);
  const skyboxImage =
      config.useEnvAsSkybox ? config.environmentImage : undefined;
  const mv = html`<model-viewer
        src=${config.src || ''}
        ?ar=${!!arConfig.ar}
        ar-modes=${ifDefined(arConfig.arModes)}
        ios-src=${ifDefined(arConfig.iosSrc)}
        ?autoplay=${!!config.autoplay}
        ?auto-rotate=${!!config.autoRotate}
        ?camera-controls=${!!config.cameraControls}
        environment-image=${ifDefined(config.environmentImage)}
        skybox-image=${ifDefined(skyboxImage)}
        exposure=${ifDefined(config.exposure)}
        poster=${ifDefined(config.poster)}
        reveal=${ifDefined(config.reveal)}
        shadow-intensity=${ifDefined(config.shadowIntensity)}
        shadow-softness=${ifDefined(config.shadowSoftness)}
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
  console.log('mv', mv);
  // TODO: Force the extra attributes into the model viewer lists..
  return mv;
}
