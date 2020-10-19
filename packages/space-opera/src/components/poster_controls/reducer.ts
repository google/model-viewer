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

import {registerStateMutator, State} from '../../space_opera_base';

/** Dispatch a state mutator to set model-viewer poster. */
const SET_POSTER = 'SET_POSTER';
export const dispatchSetPoster =
    registerStateMutator(SET_POSTER, (state: State, poster?: string) => {
      state.config = {...state.config, poster};
    });

/** Dispatch a state mutator to set setPosterTrigger. */
const SET_REVEAL = 'SET_REVEAL';
export const dispatchSetReveal =
    registerStateMutator(SET_REVEAL, (state: State, reveal?: string) => {
      state.config = {...state.config, reveal};
    });
