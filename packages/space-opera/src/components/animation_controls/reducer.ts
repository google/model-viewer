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

import {Action} from '../../types.js';
import {AnimationInfo} from './types.js';

const SET_ANIMATION_NAMES = 'SET_ANIMATION_NAMES';
export function dispatchSetAnimationNames(animationNames: string[]) {
  return {type: SET_ANIMATION_NAMES, payload: animationNames};
}

const PLAY_ANIMATION = 'PLAY_ANIMATION';
export function dispatchPlayAnimation(playAnimation: boolean) {
  return {type: PLAY_ANIMATION, payload: playAnimation};
}

export function animationInfoReducer(
    state: AnimationInfo = {
      animationNames: [],
      playAnimation: true
    },
    action: Action): AnimationInfo {
  switch (action.type) {
    case PLAY_ANIMATION:
      return {...state, playAnimation: !!action.payload};
    case SET_ANIMATION_NAMES:
      return {...state, animationNames: action.payload};
    default:
      return state;
  }
}