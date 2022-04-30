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

import {html, TemplateResult} from 'lit';
import {ifDefined} from 'lit/directives/if-defined.js';

import {reduxStore} from '../../space_opera_base';
import {rafPasses} from '../../test/utils/test_utils';
import {spread} from '../utils/spread_directive';
import {ArConfigState, ModelViewerConfig} from '../../types';
import {getConfig, getOrbitString} from '../config/reducer';
import {getModelViewer} from '../model_viewer_preview/reducer';
import {getPosterConfig} from '../model_viewer_snippet/reducer';

/** Optional handlers for model-viewer events */
export interface ModelViewerEventHandlers {
  readonly load?: () => void;
  readonly cameraChange?: () => void;
  readonly modelVisibility?: () => void;
  readonly play?: () => void;
  readonly pause?: () => void;
  readonly click?: (event: MouseEvent) => void;
  readonly error?: (details: CustomEvent) => void;
}

export async function createPoster() {
  const modelViewer = getModelViewer();
  const ModelViewerElement = customElements.get('model-viewer');
  const oldMinScale = ModelViewerElement.minimumRenderScale;
  ModelViewerElement.minimumRenderScale = 1;

  const state = reduxStore.getState();
  const poster = getPosterConfig(state);

  const height = poster.height / window.devicePixelRatio;
  modelViewer.style.width = `${height}px`;
  modelViewer.style.height = `${height}px`;

  // Set to beginning of animation
  const oldTime = modelViewer.currentTime;
  modelViewer.autoplay = false;
  modelViewer.currentTime = 0;

  // Set to initial camera orbit
  const oldOrbit = modelViewer.getCameraOrbit();
  const config = getConfig(state);
  modelViewer.cameraOrbit = config.cameraOrbit!;
  modelViewer.jumpCameraToGoal();

  // Wait for model-viewer to resize and render.
  await rafPasses();
  await rafPasses();
  const posterBlob = await modelViewer.toBlob(
      {idealAspect: true, mimeType: poster.mimeType, qualityArgument: 0.85});

  // Reset to original state
  modelViewer.autoplay = !!config.autoplay;
  modelViewer.currentTime = oldTime;

  modelViewer.cameraOrbit = getOrbitString(oldOrbit);
  modelViewer.jumpCameraToGoal();

  modelViewer.style.width = '';
  modelViewer.style.height = '';

  ModelViewerElement.minimumRenderScale = oldMinScale;

  return posterBlob;
}

/**
 * Renders a model-viewer tag given the config.
 */
export function renderModelViewer(
    config: ModelViewerConfig,
    arConfig: ArConfigState,
    extraAttributes: any,
    eventHandlers?: ModelViewerEventHandlers,
    childElements?: Array<TemplateResult|HTMLElement>) {
  const skyboxImage =
      config.useEnvAsSkybox ? config.environmentImage : undefined;
  return html`<model-viewer ${spread(extraAttributes)}
        src=${config.src || ''}
        ?ar=${!!arConfig.ar}
        ar-modes=${ifDefined(arConfig.arModes)}
        ?autoplay=${!!config.autoplay}
        ?auto-rotate=${!!config.autoRotate}
        ?camera-controls=${!!config.cameraControls}
        environment-image=${ifDefined(config.environmentImage)}
        skybox-image=${ifDefined(skyboxImage)}
        exposure=${ifDefined(config.exposure)}
        poster=${ifDefined(config.poster)}
        reveal=${ifDefined(config.reveal)}
        interaction-prompt=${ifDefined(config.interactionPrompt)}
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
        @error=${eventHandlers?.error}
      >
      ${childElements}
      </model-viewer>`;
}
