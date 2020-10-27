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



import {dispatchAddHotspot, dispatchClearHotspot, dispatchRemoveHotspot, dispatchSetHotspots, dispatchUpdateHotspot, generateUniqueHotspotName, getHotspots} from '../../components/hotspot_panel/reducer.js';
import {toVector3D} from '../../components/hotspot_panel/types.js';
import {reduxStore} from '../../space_opera_base.js';


describe('hotspot dispatchers test', () => {
  afterEach(() => {
    // Redux store is preserved between tests, clear it between tests
    reduxStore.dispatch(dispatchClearHotspot());
  });

  it('adds a hotspot to reduxStore when dispatchAddHotspot is called with \
    valid config',
     () => {
       const config = {
         name: 'test',
         position: toVector3D([1, 0, 0]),
       };
       reduxStore.dispatch(dispatchAddHotspot(config));
       const hotspots = getHotspots(reduxStore.getState());
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
       reduxStore.dispatch(dispatchAddHotspot(config));
       expect(() => {
         reduxStore.dispatch(dispatchAddHotspot(config));
       }).toThrow(new Error('Hotspot name duplicate: test'));
     });

  it('updates a hotspot when dispatchUpdateHotspot is called with valid config',
     () => {
       const config = {
         name: 'test',
         position: toVector3D([1, 0, 0]),
       };
       reduxStore.dispatch(dispatchAddHotspot(config));

       reduxStore.dispatch(dispatchUpdateHotspot({
         name: 'test',
         position: toVector3D([1, 0, 0]),
         annotation: 'test-annotation',
       }));
       const hotspots = getHotspots(reduxStore.getState());
       expect(hotspots.length).toBe(1);
       expect(hotspots[0].annotation).toBe('test-annotation');
     });

  it('throws an error when dispatchUpdateHotspot is called with configs with \ non - existing hotspot names',
     () => {
       const config = {
         name: 'test',
         position: toVector3D([1, 0, 0]),
       };

       expect(() => {
         reduxStore.dispatch(dispatchUpdateHotspot(config));
       }).toThrow(new Error('Hotspot name doesn\'t exist: test'));
     });

  it('removes a hotspot when dispatchRemoveHotspot is called with valid config',
     () => {
       reduxStore.dispatch(dispatchAddHotspot({
         name: 'test',
         position: toVector3D([1, 0, 0]),
       }));

       reduxStore.dispatch(dispatchAddHotspot({
         name: 'test-1',
         position: toVector3D([1, 0, 0]),
       }));

       reduxStore.dispatch(dispatchRemoveHotspot('test'));

       let hotspots = getHotspots(reduxStore.getState());
       expect(hotspots).toBeDefined();
       expect(hotspots.length).toBe(1);
       expect(hotspots[0].name).toBe('test-1');

       reduxStore.dispatch(dispatchRemoveHotspot('test-1'));
       hotspots = getHotspots(reduxStore.getState());
       expect(hotspots.length).toBe(0);
     });

  it('throws an error when dispatchRemoveHotspot is called with configs with \ non - existing hotspot names',
     () => {
       const config = {
         name: 'test',
         position: toVector3D([1, 0, 0]),
       };

       reduxStore.dispatch(dispatchAddHotspot(config));

       expect(() => {
         reduxStore.dispatch(dispatchRemoveHotspot('test-1'));
       }).toThrow(new Error('Hotspot name doesn\'t exist: test-1'));
     });

  it('generates unique hotspot name when genearteUniqueHotspotName is called',
     () => {
       reduxStore.dispatch(dispatchAddHotspot({
         name: generateUniqueHotspotName(),
         position: toVector3D([1, 0, 0])
       }));
       let hotspots = getHotspots(reduxStore.getState());
       expect(hotspots.length).toBe(1);
       reduxStore.dispatch(dispatchAddHotspot({
         name: generateUniqueHotspotName(),
         position: toVector3D([1, 0, 0])
       }));
       hotspots = getHotspots(reduxStore.getState());
       expect(hotspots.length).toBe(2);
     });

  it('generates unique hotspot name when genearteUniqueHotspotName is called with existing hotspots',
     () => {
       reduxStore.dispatch(
           dispatchAddHotspot({name: '1', position: toVector3D([1, 0, 0])}));
       reduxStore.dispatch(
           dispatchAddHotspot({name: '2', position: toVector3D([1, 0, 0])}));
       reduxStore.dispatch(dispatchAddHotspot({
         name: generateUniqueHotspotName(),
         position: toVector3D([1, 0, 0])
       }));
       const hotspots = getHotspots(reduxStore.getState());
       expect(hotspots.length).toBe(3);
     });

  it('sets hotspot list when dispatchSetHotspots is called', () => {
    reduxStore.dispatch(dispatchSetHotspots([
      {name: '1', position: toVector3D([1, 0, 0])},
      {name: '2', position: toVector3D([2, 0, 0])},
    ]));
    const hotspots = getHotspots(reduxStore.getState());
    expect(hotspots.length).toBe(2);
    expect(hotspots[0].name).toBe('1');
    expect(hotspots[1].name).toBe('2');
  });


  it('generates unique hotspot name when generateUniqueHotspotName is called after loading previously set hotspots',
     () => {
       reduxStore.dispatch(dispatchSetHotspots([
         {name: generateUniqueHotspotName(), position: toVector3D([1, 0, 0])},
         {name: generateUniqueHotspotName(), position: toVector3D([2, 0, 0])},
       ]));
       let hotspots = getHotspots(reduxStore.getState());
       reduxStore.dispatch(dispatchClearHotspot());
       reduxStore.dispatch(dispatchSetHotspots(hotspots));

       reduxStore.dispatch(dispatchAddHotspot({
         name: generateUniqueHotspotName(),
         position: toVector3D([1, 0, 0]),
       }));
       hotspots = getHotspots(reduxStore.getState());
       expect(hotspots.length).toBe(3);
     });
});
