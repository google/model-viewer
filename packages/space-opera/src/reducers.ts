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

import {combineReducers} from 'redux';

import {origEdits} from './'
import {animationNames} from './'
import {gltfJsonString} from './'
import {camera} from './'
import {initialCamera} from './'
import {hotspots} from './'
import {environmentImages} from './'
import {modelViewer} from './'
import {gltfUrl} from './'
import {currentCamera} from './'
import {gltf} from './'
import {edits} from './components/';
import {playAnimation} from './components/animation_controls/reducer.js';
import {config} from './components/config/reducer.js';


export const rootReducer = combineReducers({
  config,
  edits,
  origEdits,
  animationNames,
  gltfJsonString,
  camera,
  initialCamera,
  hotspots,
  playAnimation,
  environmentImages,
  modelViewer,
  gltfUrl,
  currentCamera,
  gltf
});
