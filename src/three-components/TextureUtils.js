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

import {EventDispatcher, TextureLoader} from 'three';

import EquirectangularToCubemap from '../third_party/three.equirectangular-to-cubemap/EquirectangularToCubemap.js';

import EnvMapGenerator from './EnvMapGenerator.js';

const loader = new TextureLoader();
const defaultConfig = {
  cubemapSize: 1024,
  synthesizedEnvmapSize: 512,
};

export default class TextureManager extends EventDispatcher {
  /**
   * @param {THREE.WebGLRenderer} renderer
   * @param {?number} config.cubemapSize [1024]
   * @param {?number} config.synthesizedEnvmapSize [512]
   */
  constructor(renderer, config = {}) {
    super();
    this.config = {...defaultConfig, ...config};
    this.renderer = renderer;
    this.cubemapGenerator = new EquirectangularToCubemap(this.renderer);
    this.envMapGenerator = new EnvMapGenerator(this.renderer);
  }

  /**
   * @param {string} url
   * @return {Promise<THREE.Texture>}
   */
  load(url) {
    return new Promise(
        (resolve, reject) => loader.load(url, resolve, undefined, reject));
  }

  /**
   * @param {?number} size
   * @return {THREE.Texture}
   */
  generateDefaultEnvMap(size) {
    const mapSize = size || this.config.synthesizedEnvmapSize;
    return this.envMapGenerator.generate(mapSize);
  }

  /**
   * The texture returned here is from a WebGLRenderCubeTarget,
   * which is not the same as a THREE.CubeTexture, and just what
   * the current THREE.CubeCamera uses, and has the same effect
   * when being used as an environment map.
   *
   * @param {THREE.Texture} texture
   * @param {?number} size
   * @return {THREE.Texture}
   */
  equirectangularToCubemap(texture, size) {
    const mapSize = size || this.config.cubemapSize;
    const cubemap = this.cubemapGenerator.convert(texture, mapSize);
    return cubemap;
  }

  /**
   * Returns a { equirect, cubemap } object with the textures
   * accordingly, or null if cannot generate a texture from
   * the URL.
   *
   * @see equirectangularToCubemap with regard to the THREE types.
   * @param {string} url
   * @return {Promise<Object|null>}
   */
  async toCubemapAndEquirect(url) {
    let equirect, cubemap;
    try {
      equirect = await this.load(url);
      cubemap = await this.equirectangularToCubemap(equirect);
      return {equirect, cubemap};
    } catch (e) {
      if (equirect) {
        equirect.dispose();
      }
      if (cubemap) {
        cubemap.dispose();
      }
      return null;
    }
  }

  dispose() {
    this.cubemapGenerator.camera.renderTarget.dispose();
    this.envMapGenerator.camera.renderTarget.dispose();
    this.cubemapGenerator = null;
    this.envMapGenerator = null;
  }
}
