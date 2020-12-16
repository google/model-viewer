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

import {Action, ArConfigState, State} from '../../types.js';

const SET_AR = 'SET_AR';
export function dispatchAr(isAr: boolean) {
  return {type: SET_AR, payload: isAr};
}

const SET_AR_MODES = 'SET_AR_MODES';
export function dispatchArModes(arModes: string) {
  return {type: SET_AR_MODES, payload: arModes};
}

const SET_AR_CONFIG = 'SET_AR_CONFIG';
export function dispatchArConfig(arConfig: ArConfigState) {
  return {type: SET_AR_CONFIG, payload: arConfig};
}

export const getArConfig = (state: State) =>
    state.entities.modelViewerSnippet.arConfig;

export function arReducer(
    state: ArConfigState = {}, action: Action): ArConfigState {
  switch (action.type) {
    case SET_AR_CONFIG:
      return action.payload;
    case SET_AR:
      return {...state, ar: action.payload};
    case SET_AR_MODES:
      return {...state, arModes: action.payload};
    default:
      return state;
  }
}