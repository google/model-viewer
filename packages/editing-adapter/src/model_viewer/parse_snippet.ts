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

import {ModelViewerConfig} from './model_viewer_config.js';

function tryParseNumberAttribute(element: Element, attribute: string): number|
    undefined {
  const attributeValue = element.getAttribute(attribute);
  if (element.hasAttribute(attribute) && attributeValue !== '' &&
      isFinite(Number(attributeValue))) {
    return Number(attributeValue);
  }
  return undefined;
}

/**
 * Parse a string representation of a model-viewer tag.
 */
export function parseSnippet(snippet: string): ModelViewerConfig {
  const parsedInput = new DOMParser().parseFromString(snippet, 'text/html');
  const modelViewer = parsedInput.body.getElementsByTagName('model-viewer')[0];
  const config: ModelViewerConfig = {};
  config.src = modelViewer.getAttribute('src') || undefined;
  config.autoRotate = modelViewer.hasAttribute('auto-rotate');
  config.cameraControls = modelViewer.hasAttribute('camera-controls');
  // NOTE: bgcolor not well-supported yet, since real mv tags put this in
  // the style tag. Will need to reconsider how we approach style in general.
  config.environmentImage =
      modelViewer.getAttribute('environment-image') || undefined;
  config.useEnvAsSkybox = config.environmentImage !== undefined &&
      modelViewer.getAttribute('skybox-image') === config.environmentImage;
  config.exposure = tryParseNumberAttribute(modelViewer, 'exposure');
  config.shadowIntensity =
      tryParseNumberAttribute(modelViewer, 'shadow-intensity');
  config.shadowSoftness =
      tryParseNumberAttribute(modelViewer, 'shadow-softness');
  config.maxCameraOrbit =
      modelViewer.getAttribute('max-camera-orbit') || undefined;
  config.minCameraOrbit =
      modelViewer.getAttribute('min-camera-orbit') || undefined;
  config.maxFov = modelViewer.getAttribute('max-field-of-view') || undefined;
  config.minFov = modelViewer.getAttribute('min-field-of-view') || undefined;
  config.autoplay = modelViewer.hasAttribute('autoplay');
  config.animationName =
      modelViewer.getAttribute('animation-name') || undefined;
  config.cameraOrbit = modelViewer.getAttribute('camera-orbit') || undefined;
  config.cameraTarget = modelViewer.getAttribute('camera-target') || undefined;
  config.fieldOfView = modelViewer.getAttribute('field-of-view') || undefined;
  return config;
}
