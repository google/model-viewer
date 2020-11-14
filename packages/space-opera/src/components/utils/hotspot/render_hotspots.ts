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

import {HotspotConfig} from '../../hotspot_panel/types.js';

/**
 * Renders a list of hotspots
 */
export function renderHotspots(hotspots: HotspotConfig[]) {
  const existingNames = new Set();
  for (const hotspot of hotspots) {
    if (existingNames.has(hotspot.name)) {
      throw new Error(`Hotspot contains duplicate name: ${hotspot.name}`);
    }
    existingNames.add(hotspot.name);
  }
  return hotspots.map(hotspot => renderHotspot(hotspot));
}

/**
 * Render a hotspot
 */
export function renderHotspot(config: HotspotConfig) {
  // Note that we have to do this without lit html because rendering slot name
  // will result in zClosurez
  const hotspotElement = document.createElement('button');
  hotspotElement.classList.add('Hotspot');
  hotspotElement.slot = `hotspot-${config.name}`;
  hotspotElement.dataset['position'] = config.position.toString();
  if (config.normal) {
    hotspotElement.dataset['normal'] = config.normal.toString();
  }
  hotspotElement.dataset['visibilityAttribute'] = 'visible';

  if (config.annotation) {
    const annotationElement = document.createElement('div');
    annotationElement.classList.add('HotspotAnnotation');
    annotationElement.textContent = config.annotation;
    hotspotElement.appendChild(annotationElement);
  }

  return hotspotElement;
}
