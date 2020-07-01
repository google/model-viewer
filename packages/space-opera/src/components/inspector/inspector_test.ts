/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * istributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */


import './inspector.js';

import {createBufferFromString, generatePngBlob, GltfModel} from '@google/model-viewer-editing-adapter/lib/main.js'
import {createSafeObjectURL} from '@google/model-viewer-editing-adapter/lib/util/create_object_url.js'
import {dispatchGltfAndEdits} from '../../redux/space_opera_base.js';

import {InspectorPanel} from './inspector.js';

// Bin data
const EXAMPLE_BIN_AS_STRING = 'example of some bin data';
const EXAMPLE_BIN_AS_ARRAY_BUFFER =
    createBufferFromString(EXAMPLE_BIN_AS_STRING);
const BIN_LENGTH_IN_BYTES = EXAMPLE_BIN_AS_ARRAY_BUFFER.byteLength;

// JSON data
const MIME_TYPE = 'image/jpeg';
const EXPECTED_GLTF_OBJECT = {
  'asset': {'generator': 'FBX2glTF', 'version': '2.0'},
  'buffers': [{
    'byteLength': BIN_LENGTH_IN_BYTES,
  }],
  'bufferViews':
      [{'buffer': 0, 'byteLength': BIN_LENGTH_IN_BYTES, 'name': 'image1'}],
  'images': [{'mimeType': MIME_TYPE, 'bufferView': 0}],
  'samplers': [{magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497}],
  'textures': [{source: 0, sampler: 0}],
  'nodes': [{'rotation': [0, 0, 0, 1]}],
};

const TEST_GLTF_JSON = {
  'asset': {'generator': 'FBX2glTF', 'version': '2.0'},
  'buffers': [{
    'byteLength': BIN_LENGTH_IN_BYTES,
  }],
  'bufferViews':
      [{'buffer': 0, 'byteLength': BIN_LENGTH_IN_BYTES, 'name': 'image1'}],
  'materials': [
    {
      'name': 'yellow',
      'pbrMetallicRoughness': {
        'baseColorFactor': [0.8, 0.8, 0.2, 1.0],
        'roughnessFactor': 0.9,
        'metallicFactor': 0.4,
      },
    },
    {
      'name': 'purple',
      'pbrMetallicRoughness': {
        'baseColorFactor': [0.8, 0.2, 0.8, 1.0],
        'roughnessFactor': 0.2,
        'metallicFactor': 0.3,
      },
    },
  ],
};

async function createGltfWithTextures() {
  const model = new GltfModel(TEST_GLTF_JSON, null);
  const pbrApi0 = (await model.materials)[0].pbrMetallicRoughness;
  const texUri = createSafeObjectURL(await generatePngBlob()).unsafeUrl;
  await pbrApi0.setBaseColorTexture(texUri);
  return model;
}

describe('loader inspector pane test', () => {
  it('outputs valid JSON to the inspector pane', async () => {
    const inspectorPane = new InspectorPanel();
    document.body.appendChild(inspectorPane);
    await dispatchGltfAndEdits(
        new GltfModel(EXPECTED_GLTF_OBJECT, EXAMPLE_BIN_AS_ARRAY_BUFFER));
    await inspectorPane.updateComplete;

    const textContent =
        inspectorPane.shadowRoot!.querySelector(
                                     '.inspector-content')!.textContent!;
    expect(textContent).toBeDefined();
    expect(JSON.parse(textContent)).toEqual(EXPECTED_GLTF_OBJECT);
  });

  it('uploads images in the bin to the inspector pane', async () => {
    const gltf = await createGltfWithTextures();
    await dispatchGltfAndEdits(gltf);

    const inspectorPane = new InspectorPanel();
    document.body.appendChild(inspectorPane);
    await inspectorPane.updateComplete;
    await inspectorPane.updateTexturesComplete;

    const texImage = inspectorPane.shadowRoot!.querySelector<HTMLImageElement>(
        '.texture-images img')!;
    expect(texImage).toBeDefined();
    // Check that an object URL was generated
    expect(texImage.src).toMatch(/^blob:http/);
  });
});
