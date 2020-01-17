/* @license
 * Copyright 2019 Google LLC. All Rights Reserved.
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

import {Cache, WebGLRenderer} from 'three';

import TextureUtils from '../../three-components/TextureUtils.js';
import {assetPath, textureMatchesMeta} from '../helpers.js';


const expect = chai.expect;

// Reuse the same canvas as to not stress the WebGL
// context limit
const canvas = document.createElement('canvas');
const EQUI_URL = assetPath('environments/spruit_sunrise_1k_LDR.jpg');
const HDR_EQUI_URL = assetPath('environments/spruit_sunrise_1k_HDR.hdr');

suite('TextureUtils', () => {
  let threeRenderer: WebGLRenderer;

  suiteSetup(() => {
    // The threeRenderer can retain state, so these tests have the possibility
    // of getting different results in different orders. However, our use of the
    // threeRenderer *should* always return its state to what it was before to
    // avoid this kind of problem (and many other headaches).
    threeRenderer = new WebGLRenderer({canvas});
    threeRenderer.debug.checkShaderErrors = true;
  });

  suiteTeardown(() => {
    // Ensure we free up memory from loading large environment maps:
    Cache.clear();
    threeRenderer.dispose();
  });

  let textureUtils: TextureUtils;

  setup(() => {
    textureUtils = new TextureUtils(threeRenderer);
  });

  teardown(async () => {
    await textureUtils.dispose();
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
      const target = await textureUtils.loadEquirectAsCubeUV(EQUI_URL);
      target.dispose();
      expect((target.texture as any).isTexture).to.be.ok;
      expect(textureMatchesMeta(
                 target.texture, {mapping: 'CubeUV', url: EQUI_URL}))
          .to.be.ok;
      target.texture.dispose();
    });
    test('throws on invalid texture', async () => {
      try {
        await textureUtils.loadEquirectAsCubeUV('');
        expect(false).to.be.ok;
      } catch (e) {
        expect(true).to.be.ok;
      }
    });
  });

  suite('generating an environment map and skybox', () => {
    test('returns an environmentMap and skybox texture from url', async () => {
      const textures =
          await textureUtils.generateEnvironmentMapAndSkybox(EQUI_URL);
      expect((textures.skybox!.texture as any).isTexture).to.be.ok;
      expect((textures.environmentMap.texture as any).isTexture).to.be.ok;

      expect(textureMatchesMeta(
                 textures.skybox!.texture, {mapping: 'PMREM', url: EQUI_URL}))
          .to.be.ok;

      expect(textureMatchesMeta(textures.environmentMap.texture, {
        mapping: 'PMREM',
        url: EQUI_URL
      })).to.be.ok;
    });

    test(
        'returns an environmentMap and skybox texture from an HDR url',
        async () => {
          const textures =
              await textureUtils.generateEnvironmentMapAndSkybox(HDR_EQUI_URL);
          expect((textures.skybox!.texture as any).isTexture).to.be.ok;
          expect((textures.environmentMap.texture as any).isTexture).to.be.ok;

          expect(textureMatchesMeta(textures.skybox!.texture, {
            mapping: 'PMREM',
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
          const textures = await textureUtils.generateEnvironmentMapAndSkybox(
              EQUI_URL, HDR_EQUI_URL);

          expect((textures.skybox!.texture as any).isTexture).to.be.ok;
          expect((textures.environmentMap.texture as any).isTexture).to.be.ok;

          expect(textureMatchesMeta(textures.skybox!.texture, {
            mapping: 'PMREM',
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
