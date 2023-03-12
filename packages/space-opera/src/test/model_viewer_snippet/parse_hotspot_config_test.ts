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



import {parseHotspotsFromSnippet} from '../../components/model_viewer_snippet/parse_hotspot_config.js';

describe('parse hotspot config test', () => {
  it('returns a list with one hotspot when given a valid config', () => {
    const snippet = `<style></style>
<model-viewer src='test.glb'>
<div slot="hotspot-1" data-surface="data">
  <div class="HotspotAnnotation">Test Annotation</div>
</div>
</model-viewer>`;
    const hotspots = parseHotspotsFromSnippet(snippet);
    expect(hotspots.length).toBe(1);
    expect(hotspots[0].name).toBe('1');
    expect(hotspots[0].surface).toBe('data');
    expect(hotspots[0].annotation).toBe('Test Annotation');
  });

  it('returns a list with two hotspots when given a valid config', () => {
    const snippet = `<model-viewer src='test.glb'>
<div slot="hotspot-1" data-surface="data"></div>
<div slot="hotspot-2" data-surface="data2"></div>
</model-viewer>`;
    const hotspots = parseHotspotsFromSnippet(snippet);
    expect(hotspots.length).toBe(2);
    expect(hotspots[0].name).toBe('1');
    expect(hotspots[0].surface).toBe('data');
    expect(hotspots[1].name).toBe('2');
    expect(hotspots[1].surface).toBe('data2');
  });

  it('throws an error when given an invalid config without model-viewer tag',
     () => {
       const snippet = ``;
       expect(() => {
         parseHotspotsFromSnippet(snippet);
       }).toThrow(new Error('Invalid snippet, no model-viewer tag found.'));
     });

  it('returns an empty hotspot list and ignores unrelated child nodes when \
given a snippet with non-hotspot childnode',
     () => {
       const errorList: Error[] = [];
       const snippet = `<model-viewer src='test.glb'>
<div slot="test"></div>
</model-viewer>`;
       const hotspots = parseHotspotsFromSnippet(snippet, errorList);
       expect(hotspots.length).toBe(0);
       expect(errorList.length).toBe(0);
     });

  it('returns an empty hotspot list and registers an error when given an invalid \
snippet without position',
     () => {
       const errorList: Error[] = [];
       const snippet = `<model-viewer src='test.glb'>
<div slot="hotspot-1"></div>
</model-viewer>`;
       const hotspots = parseHotspotsFromSnippet(snippet, errorList);
       expect(hotspots.length).toBe(0);
       expect(errorList.length).toBe(1);
       expect(errorList[0])
           .toEqual(new Error(
               'Only surface hotspots are supported: no surface for hotspot at slot "hotspot-1"'));
     });
});
