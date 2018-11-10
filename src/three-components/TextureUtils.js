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

import {NearestFilter, RGBEEncoding, TextureLoader} from 'three';

import PMREMGenerator from '../third_party/three/PMREMGenerator.js';
import PMREMCubeUVPacker from '../third_party/three/PMREMCubeUVPacker.js';
import EquirectangularToCubemap from '../third_party/three.equirectangular-to-cubemap/EquirectangularToCubemap.js';
import RGBELoader from '../third_party/three/RGBELoader.js';

const CUBE_MAP_SIZE = 1024;
const ldrLoader = new TextureLoader();
const hdrLoader = new RGBELoader();

const loadHDR =
    async (url) => {
  const texture =
      await new Promise((res, rej) => hdrLoader.load(url, res, undefined, rej));
  texture.encoding = RGBEEncoding;
  texture.minFilter = NearestFilter;
  texture.magFilter = NearestFilter;
  texture.flipY = true;
  return texture;
}

const loadLDR = (url) =>
    new Promise((res, rej) => ldrLoader.load(url, res, undefined, rej));

export const loadTexture = url =>
    /\.hdr$/.test(url) ? loadHDR(url) : loadLDR(url);

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

export const pmremPass = (renderer, texture) => {
  const generator = new PMREMGenerator(texture);
  generator.update(renderer);

  const packer = new PMREMCubeUVPacker(generator.cubeLods);
  packer.update(renderer);

  const renderTarget = packer.CubeUVRenderTarget;

  generator.dispose();
  packer.dispose();

  return renderTarget.texture;
}
