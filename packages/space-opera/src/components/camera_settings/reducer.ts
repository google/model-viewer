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

// DIRTY CAMERA//////////////

const IS_DIRTY_CAMERA = 'IS_DIRTY_CAMERA';
export function dispatchCameraIsDirty() {
  return {type: IS_DIRTY_CAMERA};
}

export const getIsDirtyCamera = (state: State) => state.entities.isDirtyCamera;

export function isDirtyCameraReducer(
    state: boolean = false, action: Action): boolean {
  switch (action.type) {
    case IS_DIRTY_CAMERA:
      return !state;
    default:
      return state;
  }
}
