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

import {$threeTexture} from '../../../features/scene-graph/image.js';
import {Texture} from '../../../features/scene-graph/texture.js';
import {$correlatedObjects} from '../../../features/scene-graph/three-dom-element.js';
import {ModelViewerElement} from '../../../model-viewer.js';
import {waitForEvent} from '../../../utilities.js';
import {assetPath} from '../../helpers.js';



const expect = chai.expect;

const ASTRONAUT_GLB_PATH = assetPath('models/Astronaut.glb');
suite('scene-graph/texture', () => {
  suite('Texture', () => {
    let element: ModelViewerElement;
    let texture: Texture|null;

    setup(async () => {
      element = new ModelViewerElement();
      element.src = ASTRONAUT_GLB_PATH;
      document.body.insertBefore(element, document.body.firstChild);
      await waitForEvent(element, 'load');

      texture = await element.createTexture(assetPath(
          'models/glTF-Sample-Models/2.0/BoxTextured/glTF/CesiumLogoFlat.png'));

      element.model!.materials[0]
          .pbrMetallicRoughness.baseColorTexture!.setTexture(texture);
    });

    teardown(() => {
      document.body.removeChild(element);
      texture = null;
    });


    test('Create a texture', async () => {
      expect(texture).to.not.be.null;
    });

    test('Set a texture', async () => {
      // Gets new UUID to compare with UUID of texture accessible through the
      // material.
      const newUUID: string|undefined = texture?.source[$threeTexture]?.uuid;

      const threeTexture: ThreeTexture =
          element.model!.materials[0]
              .pbrMetallicRoughness.baseColorTexture?.texture
              ?.source[$threeTexture]!;

      expect(threeTexture.uuid).to.be.equal(newUUID);
    });

    test('Verify legacy correlatedObjects are updated.', async () => {
      const newUUID: string|undefined = texture?.source[$threeTexture]?.uuid;

      const uuidFromTextureObject: string =
          (element.model!.materials[0]
               .pbrMetallicRoughness.baseColorTexture?.texture
               ?.[$correlatedObjects]
               ?.values()
               .next()
               .value as ThreeTexture)
              .uuid;
      expect(uuidFromTextureObject).to.be.equal(newUUID);

      const uuidFromSamplerObject: string =
          (element.model!.materials[0]
               .pbrMetallicRoughness.baseColorTexture?.texture
               ?.sampler[$correlatedObjects]
               ?.values()
               .next()
               .value as ThreeTexture)
              .uuid;
      expect(uuidFromSamplerObject).to.be.equal(newUUID);

      const uuidFromImageObject: string =
          (element.model!.materials[0]
               .pbrMetallicRoughness.baseColorTexture?.texture
               ?.source[$correlatedObjects]
               ?.values()
               .next()
               .value as ThreeTexture)
              .uuid;
      expect(uuidFromImageObject).to.be.equal(newUUID);
    });
  });
});
