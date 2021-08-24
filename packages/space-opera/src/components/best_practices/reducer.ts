/**
 * @license
 * Copyright 2021 Google LLC. All Rights Reserved.
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

import {Action, BestPracticesState, INITIAL_STATE, State} from '../../types';


const SET_PROGRESS_BAR = 'SET_PROGRESS_BAR';
export function dispatchSetProgressBar(isUsingCustomProgressBar: boolean) {
  return {type: SET_PROGRESS_BAR, payload: isUsingCustomProgressBar};
}

const SET_AR_BUTTON = 'SET_AR_BUTTON';
export function dispatchSetARButton(isUsingCustomARButton: boolean) {
  return {type: SET_AR_BUTTON, payload: isUsingCustomARButton};
}

const SET_AR_PROMPT = 'SET_AR_PROMPT';
export function dispatchSetARPrompt(isUsingCustomARPrompt: boolean) {
  return {type: SET_AR_PROMPT, payload: isUsingCustomARPrompt};
}

export const getBestPractices = (state: State) =>
    state.entities.modelViewerSnippet.bestPractices;

export function bestPracticesReducer(
    state: BestPracticesState =
        INITIAL_STATE.entities.modelViewerSnippet.bestPractices,
    action: Action): BestPracticesState {
  switch (action.type) {
    case SET_PROGRESS_BAR:
      return {...state, progressBar: action.payload};
    case SET_AR_BUTTON:
      return {...state, arButton: action.payload};
    case SET_AR_PROMPT:
      return {...state, arPrompt: action.payload};
    default:
      return state;
  }
}