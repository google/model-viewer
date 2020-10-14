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



import {toVector3D} from './hotspot_config.js';
import {dispatchAddHotspot, dispatchClearHotspot, dispatchRemoveHotspot, dispatchSetHotspots, dispatchUpdateHotspot, generateUniqueHotspotName} from './hotspot_dispatchers.js';
import {reduxStore} from './space_opera_base.js';

fdescribe('hotspot dispatchers test', () => {
  afterEach(() => {
    // Redux store is preserved between tests, clear it between tests
    dispatchClearHotspot();
  });

  it('adds a hotspot to reduxStore when dispatchAddHotspot is called with \
  valid config',
     () => {
       const config = {
         name: 'test',
         position: toVector3D([1, 0, 0]),
       };
       dispatchAddHotspot(config);
       const hotspots = reduxStore.getState().hotspots;
       expect(hotspots.length).toBe(1);
       expect(hotspots[0].name).toBe('test');
       expect(hotspots[0].position.x).toBe(1);
       expect(hotspots[0].position.y).toBe(0);
       expect(hotspots[0].position.z).toBe(0);
     });

  it('throws an error when dispatchAddHotspot is called with configs with \
  duplicated hotspot names',
     () => {
       const config = {
         name: 'test',
         position: toVector3D([1, 0, 0]),
       };
       dispatchAddHotspot(config);
       expect(() => {
         dispatchAddHotspot(config);
       }).toThrow(new Error('Hotspot name duplicate: test'));
     });

  it('updates a hotspot when dispatchUpdateHotspot is called with valid config',
     () => {
       const config = {
         name: 'test',
         position: toVector3D([1, 0, 0]),
       };
       dispatchAddHotspot(config);

       dispatchUpdateHotspot({
         name: 'test',
         position: toVector3D([1, 0, 0]),
         annotation: 'test-annotation',
       });
       const hotspots = reduxStore.getState().hotspots;
       expect(hotspots.length).toBe(1);
       expect(hotspots[0].annotation).toBe('test-annotation');
     });

  it('throws an error when dispatchUpdateHotspot is called with configs with \
  non-existing hotspot names',
     () => {
       const config = {
         name: 'test',
         position: toVector3D([1, 0, 0]),
       };

       expect(() => {
         dispatchUpdateHotspot(config);
       }).toThrow(new Error('Hotspot name doesn\'t exist: test'));
     });

  it('removes a hotspot when dispatchRemoveHotspot is called with valid config',
     () => {
       dispatchAddHotspot({
         name: 'test',
         position: toVector3D([1, 0, 0]),
       });

       dispatchAddHotspot({
         name: 'test-1',
         position: toVector3D([1, 0, 0]),
       });

       dispatchRemoveHotspot('test');

       let hotspots = reduxStore.getState().hotspots;
       expect(hotspots).toBeDefined();
       expect(hotspots.length).toBe(1);
       expect(hotspots[0].name).toBe('test-1');

       dispatchRemoveHotspot('test-1');
       hotspots = reduxStore.getState().hotspots;
       expect(hotspots.length).toBe(0);
     });

  it('throws an error when dispatchRemoveHotspot is called with configs with \
  non-existing hotspot names',
     () => {
       const config = {
         name: 'test',
         position: toVector3D([1, 0, 0]),
       };

       dispatchAddHotspot(config);

       expect(() => {
         dispatchRemoveHotspot('test-1');
       }).toThrow(new Error('Hotspot name doesn\'t exist: test-1'));
     });

  it('generates unique hotspot name when genearteUniqueHotspotName is called',
     () => {
       dispatchAddHotspot({
         name: generateUniqueHotspotName(),
         position: toVector3D([1, 0, 0])
       });
       let hotspots = reduxStore.getState().hotspots;
       expect(hotspots.length).toBe(1);
       dispatchAddHotspot({
         name: generateUniqueHotspotName(),
         position: toVector3D([1, 0, 0])
       });
       hotspots = reduxStore.getState().hotspots;
       expect(hotspots.length).toBe(2);
     });

  it('generates unique hotspot name when genearteUniqueHotspotName is called \
with existing hotspots',
     () => {
       dispatchAddHotspot({name: '1', position: toVector3D([1, 0, 0])});
       dispatchAddHotspot({name: '2', position: toVector3D([1, 0, 0])});
       dispatchAddHotspot({
         name: generateUniqueHotspotName(),
         position: toVector3D([1, 0, 0])
       });
       const hotspots = reduxStore.getState().hotspots;
       expect(hotspots.length).toBe(3);
     });

  it('sets hotspot list when dispatchSetHotspots is called', () => {
    dispatchSetHotspots([
      {name: '1', position: toVector3D([1, 0, 0])},
      {name: '2', position: toVector3D([2, 0, 0])},
    ]);
    const hotspots = reduxStore.getState().hotspots;
    expect(hotspots.length).toBe(2);
    expect(hotspots[0].name).toBe('1');
    expect(hotspots[1].name).toBe('2');
  });


  it('generates unique hotspot name when generateUniqueHotspotName is called \
  after loading previously set hotspots',
     () => {
       dispatchSetHotspots([
         {name: generateUniqueHotspotName(), position: toVector3D([1, 0, 0])},
         {name: generateUniqueHotspotName(), position: toVector3D([2, 0, 0])},
       ]);
       let hotspots = reduxStore.getState().hotspots;
       dispatchClearHotspot();
       dispatchSetHotspots(hotspots);

       dispatchAddHotspot({
         name: generateUniqueHotspotName(),
         position: toVector3D([1, 0, 0]),
       });
       hotspots = reduxStore.getState().hotspots;
       expect(hotspots.length).toBe(3);
     });
});
