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

import {immutableArrayUpdate} from '../../reducer_utils.js';
import {registerStateMutator, State} from '../../space_opera_base.js';

import {HotspotConfig} from './hotspot_config.js';

let nextHotspotId = 1;
let hotspotNameSet = new Set();

/** Generates a unique hotspot name */
export function generateUniqueHotspotName() {
  let name = (nextHotspotId++).toString();
  while (hotspotNameSet.has(name)) {
    name = (nextHotspotId++).toString();
  }
  return name;
}

/**
 * Helper function to find the index of hotspot with given name, throws an
 * Error if not found.
 */
function findHotspotIndex(hotspots: HotspotConfig[], name: string) {
  const index = hotspots.findIndex((hotspot) => hotspot.name === name);
  if (index === -1) {
    throw new Error(`Hotspot name doesn't exist: ${name}`);
  }
  return index;
}

/** Dispatch a state mutator to add a hotspot */
const ADD_HOTSPOT = 'ADD_HOTSPOT';
export const dispatchAddHotspot = registerStateMutator(
    ADD_HOTSPOT, (state: State, config?: HotspotConfig) => {
      if (!config)
        return;
      if (hotspotNameSet.has(config.name)) {
        throw new Error(`Hotspot name duplicate: ${config.name}`);
      }
      state.hotspots = [...(state.hotspots ?? []), config];
      hotspotNameSet.add(config.name);
    });

/** Dispatch a state mutator to update a hotspot */
const UPDATE_HOTSPOT = 'UPDATE_HOTSPOT';
export const dispatchUpdateHotspot = registerStateMutator(
    UPDATE_HOTSPOT, (state: State, config?: HotspotConfig) => {
      if (!config)
        return;

      const index = findHotspotIndex(state.hotspots, config.name);

      state.hotspots = immutableArrayUpdate(state.hotspots, index, config);
    });

/** Dispatch a state mutator to clear hotspot configs */
const REMOVE_HOTSPOT = 'REMOVE_HOTSPOT';
export const dispatchRemoveHotspot =
    registerStateMutator(REMOVE_HOTSPOT, (state: State, name?: string) => {
      if (!name)
        return;

      const index = findHotspotIndex(state.hotspots, name);
      const hotspots = [...state.hotspots];
      hotspots.splice(index, 1);
      state.hotspots = hotspots;

      hotspotNameSet.delete(name);
    });

/** Dispatch a state mutator to clear hotspot configs */
const CLEAR_HOTSPOTS = 'CLEAR_HOTSPOTS';
export const dispatchClearHotspot =
    registerStateMutator(CLEAR_HOTSPOTS, (state: State) => {
      state.hotspots = [];
      hotspotNameSet.clear();
      nextHotspotId = 1;
    });

/** Dispatch a state mutator to set all hotspots */
const SET_HOTSPOTS = 'SET_HOTSPOTS';
export const dispatchSetHotspots = registerStateMutator(
    SET_HOTSPOTS, (state: State, hotspots?: HotspotConfig[]) => {
      if (!hotspots)
        return;
      state.hotspots = hotspots;
      hotspotNameSet = new Set(hotspots.map(hotspot => hotspot.name));
      nextHotspotId = 1;
    });

/** Dispatch a state mutator to enter / exit addHospotMode */
const ADD_HOTSPOT_MODE = 'ADD_HOTSPOT_MODE';
export const dispatchAddHotspotMode = registerStateMutator(
    ADD_HOTSPOT_MODE, (state: State, addHotspotMode?: boolean) => {
      state.addHotspotMode = addHotspotMode;
    });
