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

import {ArConfigState, ModelViewerConfig} from '../../../types';

// A list of accepted attributes in render_model_viewer. Used when parsing for
// extra attributes.
const ATTRIBUTE_LIST: string[] = [
  'src',
  'auto-rotate',
  'camera-controls',
  'environment-image',
  'skybox-image',
  'exposure',
  'poster',
  'reveal',
  'shadow-intensity',
  'shadow-softness',
  'max-camera-orbit',
  'min-camera-orbit',
  'max-field-of-view',
  'min-field-of-view',
  'autoplay',
  'animation-name',
  'camera-orbit',
  'camera-target',
  'field-of-view',
  'ar',
  'ar-modes'
];

// Creating object in this way such that "spread" works.
// https://open-wc.org/docs/development/lit-helpers/#regular-spread
export function parseExtraAttributes(snippet: string): string {
  // Parse snippet and extract attributes from model-viewer
  const parsedInput = new DOMParser().parseFromString(snippet, 'text/html');
  const modelViewer = parsedInput.body.getElementsByTagName('model-viewer')[0];
  let extraAttributes: any = {};
  const attributes = modelViewer.attributes;

  // Loop through every attribute, only add the attributes to extraAttributes
  // if they are not a part of config or arConfig
  for (let i = 0; i < attributes.length; i++) {
    const name: string = attributes[i].name;
    const value = attributes[i].value;
    // if neither config has the key, add it to extra attribute string
    if (!(ATTRIBUTE_LIST.includes(name))) {
      if (value.length === 0) {
        // Boolean attribute is true
        extraAttributes[`?${name}`] = true;
      } else {
        // Normal attribute is set to it's snippet's value
        extraAttributes[`${name}`] = value;
      }
    }
  }
  return extraAttributes;
}

// logic similar to parseSnippet inside of editing adapter.
export function parseSnippetAr(snippet: string): ArConfigState {
  const parsedInput = new DOMParser().parseFromString(snippet, 'text/html');
  const modelViewer = parsedInput.body.getElementsByTagName('model-viewer')[0];
  const arConfig: ArConfigState = {};
  arConfig.ar = modelViewer.hasAttribute('ar') || undefined;
  arConfig.arModes = modelViewer.getAttribute('ar-modes') || undefined;
  return arConfig
}

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
  config.poster = modelViewer.getAttribute('poster') || undefined;
  config.reveal = modelViewer.getAttribute('reveal') || undefined;
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