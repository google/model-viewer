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


import {toVector3D} from '../../../components/hotspot_panel/types.js';
import {renderHotspot, renderHotspots} from '../../../components/utils/hotspot/render_hotspots.js';

describe('renders hotspot test', () => {
  it('renders a hotspot when given a valid config', () => {
    const hotspot =
        renderHotspot({name: 'test', position: toVector3D([1, 0, 0])});
    expect(hotspot.dataset['position']).toBe('1m 0m 0m');
    expect(hotspot.slot).toBe('hotspot-test');
  });

  it('renders two hotspots when called with valid config', () => {
    const configs = [
      {name: 'test-0', position: toVector3D([1, 0, 0])},
      {name: 'test-1', position: toVector3D([2, 0, 0])},
    ];
    const hotspots = renderHotspots(configs);
    expect(hotspots).toBeDefined();
    expect(hotspots.length).toBe(2);
    expect(hotspots[0].slot).toBe('hotspot-test-0');
    expect(hotspots[1].slot).toBe('hotspot-test-1');
  });

  it('throws an error when called with duplicated name', () => {
    const configs = [
      {name: 'test', position: toVector3D([1, 0, 0])},
      {name: 'test', position: toVector3D([2, 0, 0])},
    ];
    expect(() => {
      renderHotspots(configs);
    }).toThrow(new Error('Hotspot contains duplicate name: test'));
  });
});
