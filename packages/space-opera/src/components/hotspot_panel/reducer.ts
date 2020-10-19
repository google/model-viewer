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

import {Action, reduxStore, registerStateMutator, State} from '../../space_opera_base.js';
import {immutableArrayUpdate} from '../utils/reducer_utils.js';

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

// HOTSPOT MODE ////////////

const ADD_HOTSPOT_MODE = 'ADD_HOTSPOT_MODE';
export const dispatchAddHotspotMode = registerStateMutator(
    ADD_HOTSPOT_MODE, (state: State, addHotspotMode?: boolean) => {
      state.addHotspotMode = addHotspotMode;
    });

interface HotspotModeState {
  addHotspotMode: boolean;
}

export function hotspotModeReducer(state: HotspotModeState, action: Action) {
  switch (action.type) {
    case ADD_HOTSPOT_MODE:
      return action.payload;
    default:
      return state;
  }
}


// HOTSPOTS ////////////

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

const ADD_HOTSPOT = 'ADD_HOTSPOT';
export function dispatchAddHotspot(config?: HotspotConfig) {
  if (!config)
    return;
  reduxStore.dispatch({type: ADD_HOTSPOT, payload: config});
}

function addHotspot(state: HotspotState, config: HotspotConfig) {
  if (hotspotNameSet.has(config.name)) {
    throw new Error(`Hotspot name duplicate: ${config.name}`);
  }
  hotspotNameSet.add(config.name);
  const hotspots = [...(state.hotspots ?? []), config];
  return hotspots;
}

const UPDATE_HOTSPOT = 'UPDATE_HOTSPOT';
export function dispatchUpdateHotspot(config?: HotspotConfig) {
  if (!config)
    return;
  reduxStore.dispatch({type: UPDATE_HOTSPOT, payload: config});
};

function updateHotspot(state: HotspotState, config: HotspotConfig) {
  const index = findHotspotIndex(state.hotspots, config.name);
  const hotspots = immutableArrayUpdate(state.hotspots, index, config);
  return hotspots;
}

const REMOVE_HOTSPOT = 'REMOVE_HOTSPOT';
export function dispatchRemoveHotspot(name?: string) {
  if (!name)
    return;
  reduxStore.dispatch({type: REMOVE_HOTSPOT, payload: name});
}

function removeHotspot(state: HotspotState, name: string) {
  const index = findHotspotIndex(state.hotspots, name);
  const hotspots = [...state.hotspots];
  hotspots.splice(index, 1);
  hotspotNameSet.delete(name);
  return hotspots;
}

const CLEAR_HOTSPOTS = 'CLEAR_HOTSPOTS';
export function dispatchClearHotspot() {
  hotspotNameSet.clear();
  nextHotspotId = 1;
  reduxStore.dispatch({type: CLEAR_HOTSPOTS, payload: []});
}

const SET_HOTSPOTS = 'SET_HOTSPOTS';
export function dispatchSetHotspots(hotspots?: HotspotConfig[]) {
  if (!hotspots)
    return;
  hotspotNameSet = new Set(hotspots.map(hotspot => hotspot.name));
  nextHotspotId = 1;
  reduxStore.dispatch({type: SET_HOTSPOTS, payload: hotspots});
}

interface HotspotState {
  hotspots: HotspotConfig[];
}

export function hotspotsReducer(state: HotspotState, action: Action) {
  switch (action.type) {
    case SET_HOTSPOTS:
      return action.payload;
    case CLEAR_HOTSPOTS:
      return action.payload;
    case REMOVE_HOTSPOT:
      return removeHotspot(state, action.payload);
    case UPDATE_HOTSPOT:
      return updateHotspot(state, action.payload);
    case ADD_HOTSPOT:
      return addHotspot(state, action.payload);
    default:
      return state;
  }
}
