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

import {TextureLoader, WebGLRenderer} from 'three';

import TextureUtils from '../../three-components/TextureUtils.js';
import {assetPath, textureMatchesMeta} from '../helpers.js';

const expect = chai.expect;

// Reuse the same canvas as to not stress the WebGL
// context limit
const canvas = document.createElement('canvas');
const EQUI_URL = assetPath('spruit_sunrise_2k.jpg');
const HDR_EQUI_URL = assetPath('spruit_sunrise_2k.hdr');

suite('TextureUtils', () => {
  let textureUtils;
  setup(() => {
    const renderer = new WebGLRenderer({canvas});
    textureUtils = new TextureUtils(renderer);
  });
  teardown(() => textureUtils.dispose());

  suite('load', () => {
    test('loads a valid texture from URL', async () => {
      let texture = await textureUtils.load(EQUI_URL);
      texture.dispose();
      expect(texture.isTexture).to.be.ok;
      expect(textureMatchesMeta(
                 texture, {mapping: 'Equirectangular', url: EQUI_URL}))
          .to.be.ok;
    });
    test('loads a valid HDR texture from URL', async () => {
      let texture = await textureUtils.load(HDR_EQUI_URL);
      texture.dispose();
      expect(texture.isTexture).to.be.ok;
      expect(textureMatchesMeta(
                 texture, {mapping: 'Equirectangular', url: HDR_EQUI_URL}))
          .to.be.ok;
    });
    test('throws on invalid URL', async () => {
      try {
        await textureUtils.load(null);
        expect(false).to.be.ok;
      } catch (e) {
        expect(true).to.be.ok;
      }
    });
    test('throws if texture not found', async () => {
      try {
        await textureUtils.load('./nope.png');
        expect(false).to.be.ok;
      } catch (e) {
        expect(true).to.be.ok;
      }
    });
  });

  suite('equirectangularToCubemap', () => {
    test('creates a cubemap render target from texture', async () => {
      const texture = await textureUtils.load(EQUI_URL);
      const target = textureUtils.equirectangularToCubemap(texture);
      texture.dispose();
      target.dispose();
      expect(target.texture.isTexture).to.be.ok;
      expect(
          textureMatchesMeta(target.texture, {mapping: 'Cube', url: EQUI_URL}))
          .to.be.ok;
    });
    test('throws on invalid texture', async () => {
      try {
        await textureUtils.equirectangularToCubemap({});
        expect(false).to.be.ok;
      } catch (e) {
        expect(true).to.be.ok;
      }
    });
  });

  suite('generateEnvironmentTextures', () => {
    let textures;
    teardown(() => {
      if (textures) {
        textures.skybox.dispose();
        textures.environmentMap.dispose();
        textures = null;
      }
    });

    test('returns an environmentMap and skybox texture from url', async () => {
      textures = await textureUtils.generateEnvironmentTextures(EQUI_URL);
      expect(textures.skybox.texture.isTexture).to.be.ok;
      expect(textures.environmentMap.isTexture).to.be.ok;

      expect(textureMatchesMeta(
                 textures.skybox.texture, {mapping: 'Cube', url: EQUI_URL}))
          .to.be.ok;

      // TODO (#215): Re-enable once PMREM is added
      /*
      expect(textureMatchesMeta(
                 textures.environmentMap, {mapping: 'Cube', url: EQUI_URL}))
          .to.be.ok;
       */
    });

    test('returns an environmentMap and skybox texture from an HDR url', async () => {
      textures = await textureUtils.generateEnvironmentTextures(HDR_EQUI_URL);
      expect(textures.skybox.texture.isTexture).to.be.ok;
      expect(textures.environmentMap.isTexture).to.be.ok;

      expect(textureMatchesMeta(
                 textures.skybox.texture, {mapping: 'Cube', url: HDR_EQUI_URL}))
          .to.be.ok;

      // TODO (#215): Re-enable once PMREM is added
      /*
      expect(textureMatchesMeta(
                 textures.environmentMap, {mapping: 'Cube', url: HDR_EQUI_URL}))
          .to.be.ok;
       */
    });

    test('throws if given an invalid url', async () => {
      try {
        await textureUtils.generateEnvironmentTextures({});
        expect(false).to.be.ok;
      } catch (e) {
        expect(true).to.be.ok;
      }
    });
  });
});
