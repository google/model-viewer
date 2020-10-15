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

import {registerStateMutator, State} from '../../redux/space_opera_base.js';

/** Set auto play enabled or not */
const SET_AUTOPLAY_ENABLED = 'SET_AUTOPLAY_ENABLED';
export const dispatchAutoplayEnabled = registerStateMutator(
    SET_AUTOPLAY_ENABLED, (state: State, enabled?: boolean) => {
      state.config = {...state.config, autoplay: !!enabled};
    });

/** Set animation name */
const SET_ANIMATION_NAME = 'SET_ANIMATION_NAME';
export const dispatchAnimationName = registerStateMutator(
    SET_ANIMATION_NAME, (state: State, animationName?: string) => {
      // Allow animationName === undefined to unset animationName
      if (animationName && state.animationNames.indexOf(animationName) === -1) {
        return;
      }

      state.config = {
        ...state.config,
        animationName,
      };
    });

/** Set playAnimation or not */
const PLAY_ANIMATION = 'PLAY_ANIMATION';
export const dispatchPlayAnimation = registerStateMutator(
    PLAY_ANIMATION, (state: State, playAnimation?: boolean) => {
      // No need to copy state - we're always given a new copy.
      state.playAnimation = !!playAnimation;
    });