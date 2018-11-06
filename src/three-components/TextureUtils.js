/*
 * Copyright 2018 Google Inc. All Rights Reserved.
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
 */

import {TextureLoader} from 'three';
import EquirectangularToCubemap from 'three.equirectangular-to-cubemap';

const CUBE_MAP_SIZE = 1024;
const loader = new TextureLoader();

export const loadTexture = (url) =>
    new Promise((res, rej) => loader.load(url, res, undefined, rej));

export const equirectangularToCubemap = async function(renderer, texture) {
  const equiToCube = new EquirectangularToCubemap(renderer);
  const cubemap = equiToCube.convert(texture, CUBE_MAP_SIZE);
  return cubemap;
}
