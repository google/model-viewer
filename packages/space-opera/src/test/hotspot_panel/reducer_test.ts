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
import {reduxStore} from '../../space_opera_base.js';


describe('hotspot dispatchers test', () => {
  const config = {
    name: 'test',
    surface: 'stuff',
  };

  afterEach(() => {
    // Redux store is preserved between tests, clear it between tests
    reduxStore.dispatch(dispatchClearHotspot());
  });

  it('adds a hotspot to reduxStore when dispatchAddHotspot is called with \
    valid config',
     () => {
       reduxStore.dispatch(dispatchAddHotspot(config));
       const hotspots = getHotspots(reduxStore.getState());
       expect(hotspots.length).toBe(1);
       expect(hotspots[0].name).toBe('test');
       expect(hotspots[0].surface).toBe('stuff');
     });

  it('throws an error when dispatchAddHotspot is called with configs with \
    duplicated hotspot names',
     () => {
       reduxStore.dispatch(dispatchAddHotspot(config));
       expect(() => {
         reduxStore.dispatch(dispatchAddHotspot(config));
       }).toThrow(new Error('Hotspot name duplicate: test'));
     });

  it('updates a hotspot when dispatchUpdateHotspot is called with valid config',
     () => {
       reduxStore.dispatch(dispatchAddHotspot(config));

       reduxStore.dispatch(dispatchUpdateHotspot({
         name: 'test',
         surface: 'stuff',
         annotation: 'test-annotation',
       }));
       const hotspots = getHotspots(reduxStore.getState());
       expect(hotspots.length).toBe(1);
       expect(hotspots[0].annotation).toBe('test-annotation');
     });

  it('throws an error when dispatchUpdateHotspot is called with configs with \ non - existing hotspot names',
     () => {
       expect(() => {
         reduxStore.dispatch(dispatchUpdateHotspot(config));
       }).toThrow(new Error('Hotspot name doesn\'t exist: test'));
     });

  it('removes a hotspot when dispatchRemoveHotspot is called with valid config',
     () => {
       reduxStore.dispatch(dispatchAddHotspot({
         name: 'test',
         surface: 'stuff',
       }));

       reduxStore.dispatch(dispatchAddHotspot({
         name: 'test-1',
         surface: 'stuff',
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
       reduxStore.dispatch(dispatchAddHotspot(config));

       expect(() => {
         reduxStore.dispatch(dispatchRemoveHotspot('test-1'));
       }).toThrow(new Error('Hotspot name doesn\'t exist: test-1'));
     });

  it('generates unique hotspot name when genearteUniqueHotspotName is called',
     () => {
       reduxStore.dispatch(dispatchAddHotspot(
           {name: generateUniqueHotspotName(), surface: 'stuff'}));
       let hotspots = getHotspots(reduxStore.getState());
       expect(hotspots.length).toBe(1);
       reduxStore.dispatch(dispatchAddHotspot(
           {name: generateUniqueHotspotName(), surface: 'stuff'}));
       hotspots = getHotspots(reduxStore.getState());
       expect(hotspots.length).toBe(2);
     });

  it('generates unique hotspot name when genearteUniqueHotspotName is called with existing hotspots',
     () => {
       reduxStore.dispatch(dispatchAddHotspot({name: '1', surface: 'stuff'}));
       reduxStore.dispatch(dispatchAddHotspot({name: '2', surface: 'stuff'}));
       reduxStore.dispatch(dispatchAddHotspot(
           {name: generateUniqueHotspotName(), surface: 'stuff'}));
       const hotspots = getHotspots(reduxStore.getState());
       expect(hotspots.length).toBe(3);
     });

  it('sets hotspot list when dispatchSetHotspots is called', () => {
    reduxStore.dispatch(dispatchSetHotspots([
      {name: '1', surface: 'stuff'},
      {name: '2', surface: 'stuff2'},
    ]));
    const hotspots = getHotspots(reduxStore.getState());
    expect(hotspots.length).toBe(2);
    expect(hotspots[0].name).toBe('1');
    expect(hotspots[1].name).toBe('2');
  });


  it('generates unique hotspot name when generateUniqueHotspotName is called after loading previously set hotspots',
     () => {
       reduxStore.dispatch(dispatchSetHotspots([
         {name: generateUniqueHotspotName(), surface: 'stuff'},
         {name: generateUniqueHotspotName(), surface: 'stuff2'},
       ]));
       let hotspots = getHotspots(reduxStore.getState());
       reduxStore.dispatch(dispatchClearHotspot());
       reduxStore.dispatch(dispatchSetHotspots(hotspots));

       reduxStore.dispatch(dispatchAddHotspot({
         name: generateUniqueHotspotName(),
         surface: 'stuff',
       }));
       hotspots = getHotspots(reduxStore.getState());
       expect(hotspots.length).toBe(3);
     });
});
