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

import {EventDispatcher, GammaEncoding, NearestFilter, RGBEEncoding, TextureLoader} from 'three';


import PMREMCubeUVPacker from '../third_party/three/PMREMCubeUVPacker.js';
import PMREMGenerator from '../third_party/three/PMREMGenerator.js';
import RGBELoader from '../third_party/three/RGBELoader.js';
import EquirectangularToCubeGenerator from '../third_party/three/EquirectangularToCubeGenerator.js';

import EnvMapGenerator from './EnvMapGenerator.js';

// Enable three's loader cache so we don't create redundant
// Image objects to decode images fetched over the network.
Cache.enabled = true;

const ldrLoader = new TextureLoader();
const hdrLoader = new RGBELoader();

const $cubeGenerator = Symbol('cubeGenerator');

const defaultConfig = {
  cubemapSize: 1024,
  synthesizedEnvmapSize: 512,
  pmremSamples: 32,
  pmremSize: 256,
  defaultEnvPmremSamples: 8,
  defaultEnvPmremSize: 256,
};

// Attach a `userData` object for arbitrary data on textures that
// originate from TextureUtils, similar to Object3D's userData,
// for help debugging, providing metadata for tests, and semantically
// describe the type of texture within the context of this application.
const userData = {
  url: null,
  // 'Equirectangular', 'CubeMap', 'EnvironmentMap'
  type: null,
};

export default class TextureUtils extends EventDispatcher {
  /**
   * @param {THREE.WebGLRenderer} renderer
   * @param {?number} config.cubemapSize [1024]
   * @param {?number} config.synthesizedEnvmapSize [512]
   * @param {?number} config.pmremSamples [24]
   * @param {?number} config.pmremSize [256]
   */
  constructor(renderer, config = {}) {
    super();
    this.config = {...defaultConfig, ...config};
    this.renderer = renderer;
    this.envMapGenerator = new EnvMapGenerator(this.renderer);
    this[$cubeGenerator] = null;
  }

  /**
   * @param {THREE.Texture} texture
   * @return {THREE.WebGLRenderCubeTarget}
   */
  equirectangularToCubemap(texture) {
    const generator = new EquirectangularToCubeGenerator(texture, {
      resolution: this.config.cubemapSize,
    });

    generator.update(this.renderer);

    generator.renderTarget.texture.userData = {
      ...userData,
      ...({
        url: texture.userData ? texture.userData.url : null,
        type: 'CubeMap',
      })
    };

    // It's up to the previously served texture to dispose itself,
    // and therefore the generator's render target.
    this[$cubeGenerator] = generator;

    return generator.renderTarget;
  }

  /**
   * @param {string} url
   * @return {Promise<THREE.Texture>}
   */
  async load(url) {
    const isHDR = /\.hdr$/.test(url);
    const loader = isHDR ? hdrLoader : ldrLoader;
    const texture = await new Promise(
        (resolve, reject) => loader.load(url, resolve, undefined, reject));
    texture.userData = {
      ...userData,
      ...({
        url: url,
        type: 'Equirectangular',
      })
    };

    if (isHDR) {
      texture.encoding = RGBEEncoding;
      texture.minFilter = NearestFilter;
      texture.magFilter = NearestFilter;
      texture.flipY = true;
    } else {
      texture.encoding = GammaEncoding;
    }

    return texture;
  }

  /**
   * @param {?number} size
   * @return {THREE.Texture}
   */
  generateDefaultEnvMap(size) {
    const mapSize = size || this.config.synthesizedEnvmapSize;
    const cubemap = this.envMapGenerator.generate(mapSize);
    const pmremCubemap = this.pmremPass(
        cubemap,
        this.config.defaultEnvPmremSamples,
        this.config.defaultEnvPmremResolution);
    cubemap.dispose();

    return pmremCubemap;
  }

  /**
   * Takes a cube-ish (@see equirectangularToCubemap) texture and
   * returns a texture of the prefiltered mipmapped radiance environment map
   * to be used as environment maps in models.
   *
   * @param {THREE.Texture} texture
   * @param {number} samples [16]
   * @param {number} resolution [256]
   * @return {THREE.Texture}
   */
  pmremPass(texture, samples = 16, size = 256) {
    const generator = new PMREMGenerator(texture, samples, size);
    generator.update(this.renderer);

    const packer = new PMREMCubeUVPacker(generator.cubeLods);
    packer.update(this.renderer);

    const renderTarget = packer.CubeUVRenderTarget;

    generator.dispose();
    packer.dispose();

    renderTarget.texture.userData = {
      ...userData,
      ...({
        url: texture.userData ? texture.userData.url : null,
        type: 'EnvironmentMap',
      })
    };

    return renderTarget.texture;
  }

  /**
   * Returns a { skybox, envmap } object with the targets/textures
   * accordingly, or null if cannot generate a texture from
   * the URL. `skybox` is a WebGLRenderCubeTarget, and `envmap`
   * is a Texture from a WebGLRenderCubeTarget.
   *
   * @see equirectangularToCubemap with regard to the THREE types.
   * @param {string} url
   * @return {Promise<Object|null>}
   */
  async generateEnvironmentTextures(url) {
    let equirect, skybox, envmap;
    try {
      equirect = await this.load(url);
      skybox = await this.equirectangularToCubemap(equirect);
      envmap = this.pmremPass(
          skybox.texture, this.config.pmremSamples, this.config.pmremSize);

      equirect.dispose();

      return {envmap, skybox};
    } catch (e) {
      if (equirect) {
        equirect.dispose();
      }
      if (skybox) {
        skybox.dispose();
      }
      if (envmap) {
        envmap.dispose();
      }

      console.error(e);

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
