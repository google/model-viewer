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

const SET_ANIMATION_NAMES = 'SET_ANIMATION_NAMES';
export function dispatchSetAnimationNames(animationNames: string[]) {
  return {type: SET_ANIMATION_NAMES, payload: animationNames};
}

export const getAnimationNames = (state: State) =>
    state.entities.modelViewerSnippet.animationNames;

export function animationNamesReducer(
    state: string[] = [], action: Action): string[] {
  switch (action.type) {
    case SET_ANIMATION_NAMES:
      return action.payload;
    default:
      return state;
  }
}