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

import {Action, INITIAL_STATE, State} from '../../types.js';

/** Mostly for unit tests. */
export const RESET_STATE_ACTION_TYPE = 'RESET_SPACE_OPERA_STATE';
export function dispatchResetState() {
  return {type: RESET_STATE_ACTION_TYPE};
}

// TODO: Figure out how this could work exactly...
export function resetReducer(state: State, action: Action) {
  switch (action.type) {
    case RESET_STATE_ACTION_TYPE:
      return INITIAL_STATE;
    default:
      return state;
  }
}