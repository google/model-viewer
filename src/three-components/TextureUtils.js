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

import {Cache, EventDispatcher, GammaEncoding, TextureLoader} from 'three';

import PatchedEquirectangularToCubeGenerator from './PatchedEquirectangularToCubeGenerator.js';

import EnvMapGenerator from './EnvMapGenerator.js';

// Enable three's loader cache so we don't create redundant
// Image objects to decode images fetched over the network.
Cache.enabled = true;

const loader = new TextureLoader();
const $cubeGenerator = Symbol('cubeGenerator');
const defaultConfig = {
  cubemapSize: 1024,
  synthesizedEnvmapSize: 512,
};

// Attach a `userData` object for arbitrary data on textures that
// originate from TextureUtils, similar to Object3D's userData,
// for help debugging, providing metadata for tests, and semantically
// describe the type of texture within the context of this application.
const userData = {
  url: null,
  // 'Equirectangular', 'EnvironmentMap'
  type: null,
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
    this.envMapGenerator = new EnvMapGenerator(this.renderer);
    this[$cubeGenerator] = null;
  }

  /**
   * The texture returned here is from a WebGLRenderCubeTarget,
   * which is not the same as a THREE.CubeTexture, and just what
   * the current THREE.CubeCamera uses, and has the same effect
   * when being used as an environment map.
   *
   * @param {THREE.Texture} texture
   * @return {THREE.Texture}
   */
  equirectangularToCubemap(texture) {
    // Use our "patched" generator due to three memory leak
    // @see https://github.com/mrdoob/three.js/issues/15288
    const generator = new PatchedEquirectangularToCubeGenerator(texture, {
      resolution: this.config.cubemapSize,
    });

    generator.update(this.renderer);

    const cubemap = generator.renderTarget.texture;
    cubemap.dispose = () => {
      generator.renderTarget.dispose();
    };

    cubemap.userData = {
      ...userData,
      ...({
        url: texture.userData ? texture.userData.url : null,
        type: 'EnvironmentMap',
      })
    };

    // It's up to the previously served texture to dispose itself,
    // and therefore the generator's render target.
    this[$cubeGenerator] = generator;

    return cubemap;
  }

  /**
   * @param {string} url
   * @return {Promise<THREE.Texture>}
   */
  async load(url) {
    const texture = await new Promise(
        (resolve, reject) => loader.load(url, resolve, undefined, reject));
    texture.userData = {
      ...userData,
      ...({
        url: url,
        type: 'Equirectangular',
      })
    };

    texture.encoding = GammaEncoding;
    return texture;
  }

  /**
   * @param {?number} size
   * @return {THREE.Texture}
   */
  generateDefaultEnvMap(size) {
    const mapSize = size || this.config.synthesizedEnvmapSize;
    const texture = this.envMapGenerator.generate(mapSize);
    texture.userData = {
      ...userData,
      ...({
        type: 'EnvironmentMap',
      })
    };

    return texture;
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
    this.envMapGenerator.camera.renderTarget.dispose();
    this.envMapGenerator = null;
    if (this[$cubeGenerator]) {
      this[$cubeGenerator].dispose();
      this[$cubeGenerator] = null;
    }
  }
}
