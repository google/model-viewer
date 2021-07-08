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

import {$underlyingTexture} from '../../../features/scene-graph/image.js';
import {Texture} from '../../../features/scene-graph/texture.js';
import {ModelViewerElement} from '../../../model-viewer.js';
import {waitForEvent} from '../../../utilities.js';
import {assetPath} from '../../helpers.js';



const expect = chai.expect;

const HELMET_GLB_PATH = assetPath(
    'models/glTF-Sample-Models/2.0/DamagedHelmet/glTF-Binary/DamagedHelmet.glb');
const REPLACEMENT_TEXTURE_PATH = assetPath(
    'models/glTF-Sample-Models/2.0/BoxTextured/glTF/CesiumLogoFlat.png');
suite('scene-graph/material', () => {
  suite('Test Texture Slots', () => {
    let element: ModelViewerElement;
    let texture: Texture|null;

    setup(async () => {
      element = new ModelViewerElement();
      element.src = HELMET_GLB_PATH;
      document.body.insertBefore(element, document.body.firstChild);
      await waitForEvent(element, 'load');

      texture = await element.createTexture(REPLACEMENT_TEXTURE_PATH);
    });

    teardown(() => {
      document.body.removeChild(element);
      texture = null;
    });

    test('Set a new base map', async () => {
      element.model!.materials[0]
          .pbrMetallicRoughness.baseColorTexture!.setTexture(texture);
      // Gets new UUID to compare with UUID of texture accessible through the
      // material.
      const newUUID: string|undefined =
          texture?.source[$underlyingTexture]?.uuid;

      const threeTexture: ThreeTexture =
          element.model!.materials[0]
              .pbrMetallicRoughness.baseColorTexture?.texture
              ?.source[$underlyingTexture]!;

      expect(threeTexture.uuid).to.be.equal(newUUID);
    });

    test('Set a new metallicRoughness map', async () => {
      element.model!.materials[0]
          .pbrMetallicRoughness.metallicRoughnessTexture!.setTexture(texture);
      // Gets new UUID to compare with UUID of texture accessible through the
      // material.
      const newUUID: string|undefined =
          texture?.source[$underlyingTexture]?.uuid;

      const threeTexture: ThreeTexture =
          element.model!.materials[0]
              .pbrMetallicRoughness.metallicRoughnessTexture?.texture
              ?.source[$underlyingTexture]!;

      expect(threeTexture.uuid).to.be.equal(newUUID);
    });

    test('Set a new normal map', async () => {
      element.model!.materials[0].normalTexture!.setTexture(texture);
      // Gets new UUID to compare with UUID of texture accessible through the
      // material.
      const newUUID: string|undefined =
          texture?.source[$underlyingTexture]?.uuid;

      const threeTexture: ThreeTexture =
          element.model!.materials[0]
              .normalTexture?.texture?.source[$underlyingTexture]!;

      expect(threeTexture.uuid).to.be.equal(newUUID);
    });

    test('Set a new occlusion map', async () => {
      element.model!.materials[0].occlusionTexture!.setTexture(texture);
      // Gets new UUID to compare with UUID of texture accessible through the
      // material.
      const newUUID: string|undefined =
          texture?.source[$underlyingTexture]?.uuid;

      const threeTexture: ThreeTexture =
          element.model!.materials[0]
              .occlusionTexture?.texture?.source[$underlyingTexture]!;

      expect(threeTexture.uuid).to.be.equal(newUUID);
    });

    test('Set a new emissive map', async () => {
      element.model!.materials[0].emissiveTexture!.setTexture(texture);
      // Gets new UUID to compare with UUID of texture accessible through the
      // material.
      const newUUID: string|undefined =
          texture?.source[$underlyingTexture]?.uuid;

      const threeTexture: ThreeTexture =
          element.model!.materials[0]
              .emissiveTexture?.texture?.source[$underlyingTexture]!;

      expect(threeTexture.uuid).to.be.equal(newUUID);
    });
  });
});
