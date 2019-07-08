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

import {Texture, WebGLRenderer, WebGLRenderTarget, WebGLRenderTargetCube} from 'three';

import TextureUtils from '../../three-components/TextureUtils.js';
import {assetPath, textureMatchesMeta} from '../helpers.js';



const expect = chai.expect;

// Reuse the same canvas as to not stress the WebGL
// context limit
const canvas = document.createElement('canvas');
const EQUI_URL = assetPath('spruit_sunrise_2k_LDR.jpg');
const HDR_EQUI_URL = assetPath('spruit_sunrise_2k_HDR.hdr');

suite('TextureUtils', () => {
  let textureUtils: TextureUtils;
  let renderer: WebGLRenderer;

  setup(() => {
    renderer = new WebGLRenderer({canvas});
    // NOTE(cdata): We need to lower the samples here or else tests that use
    // PMREM have a tendency to time out on iOS Simulator
    textureUtils = new TextureUtils(renderer, {pmremSamples: 4});
  });
  teardown(() => {
    renderer.dispose();
    textureUtils.dispose();
  });

  suite('load', () => {
    test('loads a valid texture from URL', async () => {
      let texture = await textureUtils.load(EQUI_URL);
      texture.dispose();
      expect((texture as any).isTexture).to.be.ok;
      expect(textureMatchesMeta(
                 texture, {mapping: 'Equirectangular', url: EQUI_URL}))
          .to.be.ok;
    });
    test('loads a valid HDR texture from URL', async () => {
      let texture = await textureUtils.load(HDR_EQUI_URL);
      texture.dispose();
      expect((texture as any).isTexture).to.be.ok;
      expect(textureMatchesMeta(
                 texture, {mapping: 'Equirectangular', url: HDR_EQUI_URL}))
          .to.be.ok;
    });
    test('throws on invalid URL', async () => {
      try {
        await (textureUtils.load as any)(null);
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
      expect((target.texture as any).isTexture).to.be.ok;
      expect(
          textureMatchesMeta(target.texture, {mapping: 'Cube', url: EQUI_URL}))
          .to.be.ok;
    });
    test('throws on invalid texture', async () => {
      try {
        await textureUtils.equirectangularToCubemap({} as Texture);
        expect(false).to.be.ok;
      } catch (e) {
        expect(true).to.be.ok;
      }
    });
  });

  suite('generating an environment map and skybox', () => {
    let textures:
        {environmentMap: WebGLRenderTarget, skybox: WebGLRenderTargetCube|null}|
        null;
    teardown(() => {
      if (textures) {
        textures.environmentMap.dispose();
        textures.skybox!.dispose();
        textures = null;
      }
    });

    test('returns an environmentMap and skybox texture from url', async () => {
      textures = await textureUtils.generateEnvironmentMapAndSkybox(EQUI_URL);
      expect((textures.skybox!.texture as any).isTexture).to.be.ok;
      expect((textures.environmentMap.texture as any).isTexture).to.be.ok;

      expect(textureMatchesMeta(
                 textures.skybox!.texture, {mapping: 'Cube', url: EQUI_URL}))
          .to.be.ok;

      expect(textureMatchesMeta(textures.environmentMap.texture, {
        mapping: 'PMREM',
        url: EQUI_URL
      })).to.be.ok;
    });

    test(
        'returns an environmentMap and skybox texture from an HDR url',
        async () => {
          textures =
              await textureUtils.generateEnvironmentMapAndSkybox(HDR_EQUI_URL);
          expect((textures.skybox!.texture as any).isTexture).to.be.ok;
          expect((textures.environmentMap.texture as any).isTexture).to.be.ok;

          expect(textureMatchesMeta(textures.skybox!.texture, {
            mapping: 'Cube',
            url: HDR_EQUI_URL
          })).to.be.ok;

          expect(textureMatchesMeta(textures.environmentMap.texture, {
            mapping: 'PMREM',
            url: HDR_EQUI_URL
          })).to.be.ok;
        });

    test(
        'returns an environmentMap and skybox texture from two urls',
        async () => {
          textures = await textureUtils.generateEnvironmentMapAndSkybox(
              EQUI_URL, HDR_EQUI_URL);

          expect((textures.skybox!.texture as any).isTexture).to.be.ok;
          expect((textures.environmentMap.texture as any).isTexture).to.be.ok;

          expect(textureMatchesMeta(textures.skybox!.texture, {
            mapping: 'Cube',
            url: EQUI_URL
          })).to.be.ok;

          expect(textureMatchesMeta(textures.environmentMap.texture, {
            mapping: 'PMREM',
            url: HDR_EQUI_URL
          })).to.be.ok;
        });

    test('throws if given an invalid url', async () => {
      try {
        await textureUtils.generateEnvironmentMapAndSkybox({} as string);
        expect(false).to.be.ok;
      } catch (e) {
        expect(true).to.be.ok;
      }
    });
  });

  suite('dynamically generating environment maps', () => {
    test('creates a cubemap render target with PMREM', async () => {
      const {environmentMap} =
          await textureUtils.generateEnvironmentMapAndSkybox();

      expect(textureMatchesMeta(
                 environmentMap!.texture, {mapping: 'PMREM', url: null}))
          .to.be.ok;
    });
  });
});
