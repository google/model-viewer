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

import {HotspotConfig} from '../hotspot_panel/types.js';

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
      errorList?.push(error as Error);
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
  const surface = element.dataset['surface'];
  if (!surface) {
    throw new Error(
        `Only surface hotspots are supported: no surface for hotspot at slot "${
            element.getAttribute('slot')}"`);
  }
  const annotation =
      element.querySelector('.HotspotAnnotation')?.innerHTML || undefined;
  return {name, surface, annotation};
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
