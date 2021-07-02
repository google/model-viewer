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

import {Texture as ThreeTexture} from 'three';

import {$correlatedObjects} from '../../../features/scene-graph/three-dom-element.js';
import {ModelViewerElement} from '../../../model-viewer.js';
import {assetPath} from '../../helpers.js';



const expect = chai.expect;

const ASTRONAUT_GLB_PATH = assetPath('models/Astronaut.glb');

suite('scene-graph/texture', () => {
  suite('Texture', () => {
    test('do a texture thing', async () => {
      const element = new ModelViewerElement();
      element.src = ASTRONAUT_GLB_PATH;
      document.body.insertBefore(element, document.body.firstChild);
      await waitForEvent(element, 'load');

      const path = assetPath('features/scene-graph/Default_albedo.jpg');
      const texture = await element.createTexture(path);
      expect(texture).to.not.be.null;

      element.model!.materials[0]
          .pbrMetallicRoughness.baseColorTexture!.setTexture(texture);

      const threeTexture: ThreeTexture =
          element.model!.materials[0]
              .pbrMetallicRoughness.baseColorTexture?.[$correlatedObjects]
              ?.values()
              .next()
              .value;

      const image: HTMLImageElement = threeTexture.image;
      expect(image.src).to.be.equal('features/scene-graph/Default_albedo.jpg');
    });
  });
});
