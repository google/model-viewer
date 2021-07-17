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

import {HotspotConfig, toVector3D} from '../hotspot_panel/types.js';
import {checkFinite} from '../utils/reducer_utils.js';

/**
 * Parses a paragraph of model-viewer tag snippet and extracts the hotspot
 * configs. Add corresponding error to errorList if exists
 */
export function parseHotspotsFromSnippet(
    snippet: string, errorList?: Error[]): HotspotConfig[] {
  const parsedInput = new DOMParser().parseFromString(snippet, 'text/html');
  const modelViewer = parsedInput.body.getElementsByTagName('model-viewer')[0];
  if (!modelViewer) {
    throw new Error('Invalid snippet, no model-viewer tag found.');
  }
  const configs: HotspotConfig[] = [];
  const childElements = Array.from(modelViewer.children);

  for (const hotspotElement of childElements) {
    try {
      const hotspotHtmlElement = hotspotElement as HTMLElement;
      // Parse the hotspot config if the slot-name fit hotspot format, continue
      // if it doesn't
      if (parseHotspotName(hotspotHtmlElement)) {
        const config = parseHotspotConfig(hotspotElement as HTMLElement);
        configs.push(config);
      }
    } catch (error) {
      errorList?.push(error);
    }
  }
  return configs;
}

function parseHotspotConfig(element: HTMLElement): HotspotConfig {
  const name = parseHotspotName(element);
  if (!name) {
    throw new Error(
        `Invalid hotspot slot name: ${element.getAttribute('slot')}`);
  }
  if (!element.dataset['position']) {
    throw new Error(`No position found for hotspot at slot "${
        element.getAttribute('slot')}"`);
  }
  const position = parseVector3D(element.dataset['position']);
  const normal = element.dataset['normal'] ?
      parseVector3D(element.dataset['normal']) :
      undefined;
  const annotation =
      element.querySelector('.HotspotAnnotation')?.innerHTML || undefined;
  return {name, position, normal, annotation};
}

/**
 * Converts a string representation of Vector3D such as "1m 2m 3m" into
 * Vector3D. Throws an error if not formatted correctly.
 */
function parseVector3D(str: string) {
  const components = str.split(' ').map((str) => parseVectorComponent(str));
  if (components.length !== 3) {
    throw new Error(`Invalid vector: '${str}'`);
  }
  return toVector3D([components[0], components[1], components[2]]);
}

/**
 * Returns the slot name of the element without 'hotspot-'. Returns undefined if
 * the slot name doesn't fit hotspot- format required by model-viewer.
 */
function parseHotspotName(element: HTMLElement): string|undefined {
  let name = element.getAttribute('slot');
  if (!name || !name.match(/^hotspot-/)) {
    return undefined;
  }
  name = name.replace(/^hotspot-/, '');
  return name;
}

/**
 * Parse vector component, in number or number with unit, for example '1' or
 * 1m', into number. Throws an error if the string is not formatted correctly.
 */
function parseVectorComponent(str: string): number {
  if (!str.match(/^-?\d*\.?\d*m?$/)) {
    throw new Error(`Number with unit invalid: ${str}`);
  }
  return checkFinite(Number(str.replace(/m/, '')));
}
