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

/**
 * An environment image that can be used in model-viewer environment attribute
 */
export interface EnvironmentImage {
  readonly uri: string;

  // The display name of the environment image to users
  readonly name?: string;
}

/** Default exposure for model-viewer */
export const DEFAULT_EXPOSURE = 1.0;

/** Default shadow intensity for model-viewer */
export const DEFAULT_SHADOW_INTENSITY = 0;

/** Default shadow softness for model-viewer */
export const DEFAULT_SHADOW_SOFTNESS = 1;

export const INITIAL_ENVIRONMENT_IMAGES: EnvironmentImage[] = [
  {
    uri: '../shared-assets/environments/spruit_sunrise_1k_HDR.hdr',
    name: 'Spruit Sunrise'
  },
  {
    uri: '../shared-assets/environments/aircraft_workshop_01_1k.hdr',
    name: 'Aircraft Workshop'
  },
  {uri: '../shared-assets/environments/lightroom_14b.hdr', name: 'Lightroom'},
  {uri: '../shared-assets/environments/spot1Lux.hdr', name: 'Spot'},
  {
    uri: '../shared-assets/environments/white_furnace.hdr',
    name: 'White Furnace'
  },
];
