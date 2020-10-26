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

import {Vector3D} from '@google/model-viewer/lib/model-viewer-base';

/** Config for a single hotspot */
export interface HotspotConfig {
  // Name of the hotspot, needs to be unique among all hotspots.
  name: string;
  position: Vector3D;
  normal?: Vector3D;
  annotation?: string;
}

/** Converts a number array to vector3D */
export const toVector3D = (v: [number, number, number]) => {
  return {
    x: v[0],
    y: v[1],
    z: v[2],
    toString() {
      return `${this.x}m ${this.y}m ${this.z}m`;
    }
  };
};
