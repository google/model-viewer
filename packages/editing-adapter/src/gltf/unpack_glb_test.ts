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
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */



import {createBufferFromString} from '../testing/utils.js';

import {GltfModel} from './gltf_model.js';
import * as packUtils from './pack_glb.js';
import {unpackGlb} from './unpack_glb.js';

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
};
const EXPECTED_GLTF_AS_STRING = JSON.stringify(EXPECTED_GLTF_OBJECT);
const GLTF_LENGTH = EXPECTED_GLTF_AS_STRING.length;
const PARSED_JSON_STRING = JSON.stringify(JSON.parse(EXPECTED_GLTF_AS_STRING));

// File metadata
const CHUNK_HEADER_LENGTH = 8;
const HEADER_LENGTH = 12;
const FILE_LENGTH = HEADER_LENGTH + (CHUNK_HEADER_LENGTH * 2) +
    packUtils.dwordAlign(GLTF_LENGTH) +
    packUtils.dwordAlign(BIN_LENGTH_IN_BYTES);

describe('parsing tests', () => {
  it('parses a correctly formatted file', () => {
    const dataBuffer = new ArrayBuffer(FILE_LENGTH);
    packUtils.createHeader(dataBuffer, 2.1);
    const binOffset = packUtils.createJSON(dataBuffer, EXPECTED_GLTF_AS_STRING);
    packUtils.createBinaryBuffer(
        dataBuffer, EXAMPLE_BIN_AS_ARRAY_BUFFER, binOffset);
    const {gltfJson, gltfBuffer} = unpackGlb(dataBuffer);
    expect(gltfBuffer).not.toBeNull();
    expect(JSON.stringify(gltfJson).slice(0, GLTF_LENGTH))
        .toEqual(PARSED_JSON_STRING);
    const textDecoder = new TextDecoder('utf8');
    const bodyAsString = textDecoder.decode(new Uint8Array(gltfBuffer!));
    expect(bodyAsString.slice(0, EXAMPLE_BIN_AS_STRING.length))
        .toEqual(EXAMPLE_BIN_AS_STRING);
  });

  it('throws an error if the gltf header binary extension is incorrect', () => {
    const dataBuffer = new ArrayBuffer(FILE_LENGTH);
    packUtils.createHeader(dataBuffer, 2.1, 'gggg');
    expect(() => {
      GltfModel.fromGlb(dataBuffer);
    }).toThrow(new Error('GLTFBinary: Unsupported glTF-Binary header.'));
  });

  it('throws an error if the version is less than or equal to 2.0', () => {
    const dataBuffer = new ArrayBuffer(FILE_LENGTH);
    packUtils.createHeader(dataBuffer, 1);
    expect(() => {
      GltfModel.fromGlb(dataBuffer);
    }).toThrow(new Error('GLTFBinary: Legacy binary file detected.'));
  });

  it('throws an error if the file does not have a JSON chunkType', () => {
    const dataBuffer = new ArrayBuffer(FILE_LENGTH);
    packUtils.createHeader(dataBuffer, 2.1);
    packUtils.createJSON(dataBuffer, EXPECTED_GLTF_AS_STRING, 'jjjj');
    expect(() => {
      GltfModel.fromGlb(dataBuffer);
    }).toThrow(new Error('GLTFBinary: JSON content not found.'));
  });

  it('throws an error if the file does not have valid JSON content', () => {
    const dataBuffer = new ArrayBuffer(FILE_LENGTH);
    packUtils.createHeader(dataBuffer, 2.1);
    packUtils.createJSON(dataBuffer, 'badbadbad');
    expect(() => {
      GltfModel.fromGlb(dataBuffer);
    }).toThrow(new Error('GLTFBinary: invalid JSON content.'));
  });
});
