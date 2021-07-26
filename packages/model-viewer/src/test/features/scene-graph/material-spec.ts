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
import {ModelViewerElement} from '../../../model-viewer.js';
import {ALPHA_TEST_DEFAULT} from '../../../three-components/gltf-instance/ModelViewerGLTFInstance.js';
import {waitForEvent} from '../../../utilities.js';
import {assetPath} from '../../helpers.js';



const expect = chai.expect;

const HELMET_GLB_PATH = assetPath(
    'models/glTF-Sample-Models/2.0/DamagedHelmet/glTF-Binary/DamagedHelmet.glb');
const ALPHA_BLEND_MODE_TEST = assetPath(
    'models/glTF-Sample-Models/2.0/AlphaBlendModeTest/glTF-Binary/AlphaBlendModeTest.glb');
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
          .pbrMetallicRoughness.baseColorTexture.setTexture(texture);
      // Gets new UUID to compare with UUID of texture accessible through the
      // material.
      const newUUID: string|undefined = texture?.source[$threeTexture].uuid;

      const threeTexture: ThreeTexture =
          element.model!.materials[0]
              .pbrMetallicRoughness.baseColorTexture?.texture
              ?.source[$threeTexture]!;

      expect(threeTexture.uuid).to.be.equal(newUUID);
    });

    test('Set a new metallicRoughness map', async () => {
      element.model!.materials[0]
          .pbrMetallicRoughness.metallicRoughnessTexture.setTexture(texture);
      // Gets new UUID to compare with UUID of texture accessible through the
      // material.
      const newUUID: string|undefined = texture?.source[$threeTexture]?.uuid;

      const threeTexture: ThreeTexture =
          element.model!.materials[0]
              .pbrMetallicRoughness.metallicRoughnessTexture?.texture
              ?.source[$threeTexture]!;

      expect(threeTexture.uuid).to.be.equal(newUUID);
    });

    test('Set a new normal map', async () => {
      element.model!.materials[0].normalTexture.setTexture(texture);
      // Gets new UUID to compare with UUID of texture accessible through the
      // material.
      const newUUID: string|undefined = texture?.source[$threeTexture]?.uuid;

      const threeTexture: ThreeTexture =
          element.model!.materials[0]
              .normalTexture?.texture?.source[$threeTexture]!;

      expect(threeTexture.uuid).to.be.equal(newUUID);
    });

    test('Set a new occlusion map', async () => {
      element.model!.materials[0].occlusionTexture.setTexture(texture);
      // Gets new UUID to compare with UUID of texture accessible through the
      // material.
      const newUUID: string|undefined = texture?.source[$threeTexture]?.uuid;

      const threeTexture: ThreeTexture =
          element.model!.materials[0]
              .occlusionTexture?.texture?.source[$threeTexture]!;

      expect(threeTexture.uuid).to.be.equal(newUUID);
    });

    test('Set a new emissive map', async () => {
      element.model!.materials[0].emissiveTexture.setTexture(texture);
      // Gets new UUID to compare with UUID of texture accessible through the
      // material.
      const newUUID: string|undefined = texture?.source[$threeTexture]?.uuid;

      const threeTexture: ThreeTexture =
          element.model!.materials[0]
              .emissiveTexture?.texture?.source[$threeTexture]!;

      expect(threeTexture.uuid).to.be.equal(newUUID);
    });
  });

  suite('Material properties', () => {
    let element: ModelViewerElement;

    setup(async () => {
      element = new ModelViewerElement();
    });

    teardown(() => {
      document.body.removeChild(element);
    });

    const loadModel = async (path: string) => {
      element.src = path;
      document.body.insertBefore(element, document.body.firstChild);
      await waitForEvent(element, 'load');
    };

    test('test alpha cutoff expect default', async () => {
      await loadModel(HELMET_GLB_PATH);
      // Default value hack see:
      // https://github.com/google/model-viewer/blob/e3a000111980f5cf018c61dec8695463e0d843a0/packages/model-viewer/src/three-components/gltf-instance/ModelViewerGLTFInstance.ts#L210
      expect(element.model!.materials[0].getAlphaCutoff())
          .to.be.equal(ALPHA_TEST_DEFAULT);
      element.model!.materials[0].setAlphaCutoff(0.25);
      expect(element.model!.materials[0].getAlphaCutoff()).to.be.equal(0.25);
    });

    test('test alpha cutoff expect non-default', async () => {
      await loadModel(ALPHA_BLEND_MODE_TEST);

      expect(element.model!.materials[2].getAlphaCutoff()).to.be.equal(0.25);
      element.model!.materials[2].setAlphaCutoff(0.0);
      // Setting Zero-Alpha should revent to default settings.
      expect(element.model!.materials[0].getAlphaCutoff())
          .to.be.equal(ALPHA_TEST_DEFAULT);
    });

    test('test double sided expect default', async () => {
      await loadModel(HELMET_GLB_PATH);

      expect(element.model!.materials[0].getDoubleSided()).to.be.equal(false);
      element.model!.materials[0].setDoubleSided(true);
      expect(element.model!.materials[0].getDoubleSided()).to.be.equal(true);
    });

    test('test double sided expect non-default', async () => {
      await loadModel(ALPHA_BLEND_MODE_TEST);

      expect(element.model!.materials[1].getDoubleSided()).to.be.equal(true);
      element.model!.materials[1].setDoubleSided(false);
      expect(element.model!.materials[1].getDoubleSided()).to.be.equal(false);
    });
  });
});
