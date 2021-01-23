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

import {Action, State} from '../../types.js';
import {immutableArrayUpdate} from '../utils/reducer_utils.js';

import {HotspotConfig} from './types.js';

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

function addHotspot(state: HotspotConfig[], config: HotspotConfig) {
  if (hotspotNameSet.has(config.name)) {
    throw new Error(`Hotspot name duplicate: ${config.name}`);
  }
  hotspotNameSet.add(config.name);
  const hotspots = [...(state ?? []), config];
  return hotspots;
}

function updateHotspot(state: HotspotConfig[], config: HotspotConfig) {
  const index = findHotspotIndex(state, config.name);
  const hotspots = immutableArrayUpdate(state, index, config);
  return hotspots;
}

function removeHotspot(state: HotspotConfig[], name: string) {
  const index = findHotspotIndex(state, name);
  const hotspots = [...state];
  hotspots.splice(index, 1);
  hotspotNameSet.delete(name);
  return hotspots;
}

const SET_HOTSPOTS = 'SET_HOTSPOTS';
export function dispatchSetHotspots(hotspots: HotspotConfig[]) {
  hotspotNameSet = new Set(hotspots.map(hotspot => hotspot.name));
  nextHotspotId = 1;
  return {type: SET_HOTSPOTS, payload: hotspots};
}

const CLEAR_HOTSPOTS = 'CLEAR_HOTSPOTS';
export function dispatchClearHotspot() {
  hotspotNameSet.clear();
  nextHotspotId = 1;
  return {type: CLEAR_HOTSPOTS, payload: []};
}

const REMOVE_HOTSPOT = 'REMOVE_HOTSPOT';
export function dispatchRemoveHotspot(name?: string) {
  return {type: REMOVE_HOTSPOT, payload: name};
}

const UPDATE_HOTSPOT = 'UPDATE_HOTSPOT';
export function dispatchUpdateHotspot(config?: HotspotConfig) {
  return {type: UPDATE_HOTSPOT, payload: config};
};

const ADD_HOTSPOT = 'ADD_HOTSPOT';
export function dispatchAddHotspot(config?: HotspotConfig) {
  return {type: ADD_HOTSPOT, payload: config};
}

export const getHotspots = (state: State) =>
    state.entities.modelViewerSnippet.hotspots;

export function hotspotsReducer(
    state: HotspotConfig[] = [], action: Action): HotspotConfig[] {
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

const UPDATE_HOTSPOT_MODE = 'UPDATE_HOTSPOT_MODE';
export function dispatchUpdateHotspotMode(addHotspot: boolean) {
  return {type: UPDATE_HOTSPOT_MODE, payload: addHotspot};
}

export const getHotspotMode = (state: State) => state.ui.hotspots.addHotspot;

export function hotspotsUiReducer(
    state = {
      addHotspot: false
    },
    action: Action) {
  switch (action.type) {
    case UPDATE_HOTSPOT_MODE:
      return {
        ...state, addHotspot: action.payload
      }
    default:
      return state;
  }
}