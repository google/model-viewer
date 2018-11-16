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
import {textureMatchesMeta} from '../helpers.js';

const expect = chai.expect;

// Reuse the same canvas as to not stress the WebGL
// context limit
const canvas = document.createElement('canvas');
const EQUI_URL = './examples/assets/equirectangular.png';

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
      expect(
          textureMatchesMeta(texture, {type: 'Equirectangular', url: EQUI_URL}))
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
    test('creates a cubemap from texture', async () => {
      const texture = await textureUtils.load(EQUI_URL);
      const cubemap = textureUtils.equirectangularToCubemap(texture);
      texture.dispose();
      cubemap.dispose();
      expect(cubemap.isTexture).to.be.ok;
      expect(
          textureMatchesMeta(cubemap, {type: 'EnvironmentMap', url: EQUI_URL}))
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

  suite('toCubemapAndEquirect', () => {
    test('returns a cubemap and texture from url', async () => {
      const textures = await textureUtils.toCubemapAndEquirect(EQUI_URL);
      textures.equirect.dispose();
      textures.cubemap.dispose();
      expect(textures.equirect.isTexture).to.be.ok;
      expect(textures.cubemap.isTexture).to.be.ok;

      expect(textureMatchesMeta(
                 textures.equirect, {type: 'Equirectangular', url: EQUI_URL}))
          .to.be.ok;
      expect(textureMatchesMeta(
                 textures.cubemap, {type: 'EnvironmentMap', url: EQUI_URL}))
          .to.be.ok;
    });

    test('throws if given an invalid url', async () => {
      try {
        await textureUtils.toCubemapAndEquirect({});
        expect(false).to.be.ok;
      } catch (e) {
        expect(true).to.be.ok;
      }
    });
  });
});
