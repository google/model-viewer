/* @license
 * Copyright 2020 Google LLC. All Rights Reserved.
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

import {expect} from '@esm-bundle/chai';

import {TextureInfo} from '../../../features/scene-graph/texture-info.js';
import {ModelViewerElement} from '../../../model-viewer.js';
import {waitForEvent} from '../../../utilities.js';
import {assetPath} from '../../helpers.js';

const DUCK_GLB_PATH =
    assetPath('models/glTF-Sample-Assets/Models/Duck/glTF-Binary/Duck.glb');
const TEXTURED_CUBE_GLB_PATH = assetPath(
    'models/glTF-Sample-Assets/Models/BoxTextured/glTF-Binary/BoxTextured.glb');

suite('scene-graph/texture-info', () => {
  suite('texture-info', () => {
    let element: ModelViewerElement;
    let emptyTextureInfo: TextureInfo;
    let baseTextureInfo: TextureInfo;

    setup(async () => {
      element = new ModelViewerElement();
      element.src = DUCK_GLB_PATH;
      document.body.insertBefore(element, document.body.firstChild);
      await waitForEvent(element, 'load');

      emptyTextureInfo = element.model!.materials[0].normalTexture;
      baseTextureInfo =
          element.model!.materials[0].pbrMetallicRoughness.baseColorTexture;
    });

    teardown(() => {
      document.body.removeChild(element);
    });

    test('empty slot is null', async () => {
      // The duck doesn't have a normal texture.
      expect(emptyTextureInfo.texture).to.be.null;
    });

    test('non-empty slot is not null', async () => {
      // The duck doesn't have a normal texture.
      expect(baseTextureInfo.texture).to.not.be.null;
    });

    test('call setTexture', async () => {
      const texture = await element.createTexture(assetPath(
          'models/glTF-Sample-Assets/Models/BoxTextured/glTF/CesiumLogoFlat.png'));

      // Setting a texture, the normal texture should _not_ be null.
      emptyTextureInfo.setTexture(texture);
      expect(emptyTextureInfo.texture).to.not.be.null;

      // Clearing a texture, the normal texture _should_ be null again.
      emptyTextureInfo.setTexture(null);
      expect(emptyTextureInfo.texture).to.be.null;
    });

    test(
        'exports and re-imports the model with transformed texture',
        async () => {
          // Load textured glb.
          element.src = TEXTURED_CUBE_GLB_PATH;
          await waitForEvent(element, 'load');

          // Transform the textures.
          const sampler = element.model?.materials[0]
                              .pbrMetallicRoughness['baseColorTexture']
                              .texture?.sampler!;
          sampler.setRotation(0.1);
          sampler.setOffset({u: 0.2, v: 0.3});
          sampler.setScale({u: 0.4, v: 0.5});

          // Export model.
          const exported = await element.exportScene({binary: true});
          const url = URL.createObjectURL(exported);

          // Re-load model.
          element.src = url;
          await waitForEvent(element, 'load');

          URL.revokeObjectURL(url);

          const exported_sampler = element.model?.materials[0]
                                       .pbrMetallicRoughness['baseColorTexture']
                                       .texture?.sampler!;
          expect(exported_sampler.rotation).to.be.eq(0.1, 'rotation');
          expect(exported_sampler.offset!.u).to.be.eql(0.2, 'offset_u');
          expect(exported_sampler.offset!.v).to.be.eql(0.3, 'offset_v');
          expect(exported_sampler.scale!.u).to.be.eql(0.4, 'scale_u');
          expect(exported_sampler.scale!.v).to.be.eql(0.5, 'scale_v');
        });
  });
});
