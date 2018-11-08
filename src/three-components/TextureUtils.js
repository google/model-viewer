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
import EquirectangularToCubemap from '../third_party/three.equirectangular-to-cubemap/EquirectangularToCubemap.js';

const CUBE_MAP_SIZE = 1024;
const loader = new TextureLoader();

export const loadTexture = (url) =>
    new Promise((res, rej) => loader.load(url, res, undefined, rej));

/**
 * The texture returned here is from a WebGLRenderCubeTarget,
 * which is not the same as a THREE.CubeTexture, and just what
 * the current THREE.CubeCamera uses, and has the same effect
 * when being used as an environment map.
 *
 * @param {THREE.Renderer} renderer
 * @param {THREE.Texture} texture
 * @return {THREE.Texture}
 */
export const equirectangularToCubemap =
    async function(renderer, texture) {
  const equiToCube = new EquirectangularToCubemap(renderer);
  const cubemap = equiToCube.convert(texture, CUBE_MAP_SIZE);
  return cubemap;
}

/**
 * Returns a { equirect, cubemap } object with the textures
 * accordingly, or null if cannot generate a texture from
 * the URL.
 *
 * @see equirectangularToCubemap with regard to the THREE types.
 * @param {THREE.Renderer} renderer
 * @param {string} url
 * @return {object}
 */
export const toCubemapAndEquirect = async (renderer, url) => {
  try {
    const equirect = await loadTexture(url);
    const cubemap = await equirectangularToCubemap(renderer, equirect);
    return {equirect, cubemap};
  } catch (e) {
    return null;
  }
}
