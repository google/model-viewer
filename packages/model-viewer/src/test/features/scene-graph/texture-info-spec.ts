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

import {TextureInfo} from '../../../features/scene-graph/texture-info.js';
import {ModelViewerElement} from '../../../model-viewer.js';
import {waitForEvent} from '../../../utilities.js';
import {assetPath} from '../../helpers.js';

const expect = chai.expect;
const DUCK_GLB_PATH =
    assetPath('models/glTF-Sample-Models/2.0/Duck/glTF-Binary/Duck.glb');

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
          'models/glTF-Sample-Models/2.0/BoxTextured/glTF/CesiumLogoFlat.png'));

      // Setting a texture, the normal texture should _not_ be null.
      emptyTextureInfo.setTexture(texture);
      expect(emptyTextureInfo.texture).to.not.be.null;

      // Clearing a texture, the normal texture _should_ be null again.
      emptyTextureInfo.setTexture(null);
      expect(emptyTextureInfo.texture).to.be.null;
    });
  });
});
