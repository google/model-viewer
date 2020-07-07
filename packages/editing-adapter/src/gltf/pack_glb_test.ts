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



import {arrayBufferEqualityTester, createBufferFromString, fetchBufferForUri, generatePngBlob} from '../testing/utils.js';
import {createSafeObjectURL} from '../util/create_object_url.js';

import {GltfModel} from './gltf_model.js';
import * as packUtils from './pack_glb.js';

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

// File metadata
const CHUNK_SIZE = 4;
const CHUNK_HEADER_LENGTH = 8;
const HEADER_LENGTH = 12;
const FILE_LENGTH = HEADER_LENGTH + (CHUNK_HEADER_LENGTH * 2) +
    packUtils.dwordAlign(GLTF_LENGTH) +
    packUtils.dwordAlign(BIN_LENGTH_IN_BYTES);

const CHUNK_TYPES = {
  JSON: 0x4E4F534A,  // Hex equiv of 'JSON' string
  BIN: 0x004E4942    // Hex equiv of 'BIN' string w/ 1 byte end padding
};

describe('utils test', () => {
  beforeEach(() => {
    jasmine.addCustomEqualityTester(arrayBufferEqualityTester);
  });

  it('word-aligns lengths correctly', () => {
    expect(packUtils.dwordAlign(0)).toEqual(0);
    expect(packUtils.dwordAlign(1)).toEqual(4);
    expect(packUtils.dwordAlign(4)).toEqual(4);
    expect(packUtils.dwordAlign(5)).toEqual(8);
    expect(packUtils.dwordAlign(8)).toEqual(8);
  });

  it('creates a valid header for a data buffer >= 12 bits long', () => {
    const dataBuffer = new ArrayBuffer(FILE_LENGTH);
    const expectedHeaderLength = packUtils.createHeader(dataBuffer, 2);
    const headerDataView = new DataView(dataBuffer, 0, HEADER_LENGTH);
    const textDecoder = new TextDecoder('utf8');
    const header = {
      headerMagic:
          textDecoder.decode(new Uint8Array(dataBuffer.slice(0, CHUNK_SIZE))),
      currentVersion: headerDataView.getUint32(CHUNK_SIZE, true),
      fileLength: headerDataView.getUint32(CHUNK_SIZE * 2, true)
    };
    expect(expectedHeaderLength).toBe(HEADER_LENGTH);
    expect(header.headerMagic).toBe('glTF');
    expect(header.currentVersion).toBe(2);
    expect(header.fileLength).toEqual(FILE_LENGTH);
  });

  it('creates a valid JSON chunk', () => {
    const dataBuffer = new ArrayBuffer(FILE_LENGTH);
    packUtils.createJSON(dataBuffer, EXPECTED_GLTF_AS_STRING);
    const jsonDataView = new DataView(dataBuffer, HEADER_LENGTH);
    const jsonLength = jsonDataView.getUint32(0, true);
    expect(jsonLength % 4).toEqual(0);  // Check word-alignment
    const jsonType = jsonDataView.getUint32(4, true);
    expect(jsonType).toBe(CHUNK_TYPES.JSON);
    const textDecoder = new TextDecoder('utf8');
    const jsonContent =
        textDecoder.decode(new Uint8Array(dataBuffer, 20, jsonLength));
    expect(jsonContent.trim()).toBe(EXPECTED_GLTF_AS_STRING);
  });

  it('creates a valid binary chunk', () => {
    const dataBuffer = new ArrayBuffer(packUtils.dwordAlign(FILE_LENGTH));
    const binOffset = HEADER_LENGTH + GLTF_LENGTH + CHUNK_HEADER_LENGTH;
    packUtils.createBinaryBuffer(
        dataBuffer, EXAMPLE_BIN_AS_ARRAY_BUFFER, binOffset);
    const binDataView = new DataView(dataBuffer, binOffset);
    const binLength = binDataView.getUint32(0, true);
    expect(binLength % 4).toEqual(0);  // Check word-alignment
    const binType = binDataView.getUint32(4, true);
    expect(binLength).toBe(packUtils.dwordAlign(BIN_LENGTH_IN_BYTES));
    expect(binType).toBe(CHUNK_TYPES.BIN);
  });

  it('creates an object url for a new gltf from a valid json chunk and bin data',
     async () => {
       const dataBuffer = new ArrayBuffer(FILE_LENGTH);
       packUtils.createHeader(dataBuffer, 2.1);
       const binOffset =
           packUtils.createJSON(dataBuffer, EXPECTED_GLTF_AS_STRING);
       packUtils.createBinaryBuffer(
           dataBuffer, EXAMPLE_BIN_AS_ARRAY_BUFFER, binOffset);
       const gltf: GltfModel = GltfModel.fromGlb(dataBuffer);
       const glb = await gltf.packGlb();
       expect(glb.byteLength).toBe(272);
     });

  // TODO: We will add non-ASCII support soon, but for now, make
  // sure we don't silently lose data.
  it('writeStringToDataView throws on non-ASCII input', () => {
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    expect(() => {
      packUtils.writeStringToDataView(view, 0, '€');
    }).toThrow();
  });

  it('packs and unpacks new object URL textures properly', async () => {
    const gltfJson = {
      asset: {'generator': 'FBX2glTF', 'version': '2.0'},
      buffers: [],
      bufferViews: [],
      nodes: [{'rotation': [0, 0, 0, 1]}],
      materials: [{name: 'wood'}, {name: 'metal'}],
    };
    const gltf0 = new GltfModel(gltfJson, null);

    // Add textures
    const wood = await generatePngBlob('#123');
    const metal = await generatePngBlob('#456');
    await (await gltf0.materials)[0].pbrMetallicRoughness.setBaseColorTexture(
        createSafeObjectURL(wood).unsafeUrl);
    await (await gltf0.materials)[1].pbrMetallicRoughness.setBaseColorTexture(
        createSafeObjectURL(metal).unsafeUrl);

    // Pack/unpack
    const gltf1 = GltfModel.fromGlb(await gltf0.packGlb());

    // Download the texture fresh, and it should be the same...
    const actualWood = await fetchBufferForUri(
        (await (await gltf1.materials)[0]
             .pbrMetallicRoughness.baseColorTexture)!.uri);
    const actualMetal = await fetchBufferForUri(
        (await (await gltf1.materials)[1]
             .pbrMetallicRoughness.baseColorTexture)!.uri);

    expect(actualWood).toEqual(await wood.arrayBuffer());
    expect(actualMetal).toEqual(await metal.arrayBuffer());
  });

  it('should not create extra images if multiple textures refer to the same image',
     async () => {
       const pngBuffer = await (await generatePngBlob()).arrayBuffer();
       const gltfJson = {
         asset: {'generator': 'FBX2glTF', 'version': '2.0'},
         samplers:
             [{magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497}],
         buffers: [{byteLength: pngBuffer.byteLength}],
         bufferViews:
             [{buffer: 0, byteOffset: 0, byteLength: pngBuffer.byteLength}],
         images: [{mimeType: 'image/png', bufferView: 0}],
         // Two textures using the same source image
         textures: [{source: 0, sampler: 0}, {source: 0, sampler: 0}],
         materials: [],
         nodes: [{rotation: [0, 0, 0, 1]}],
       };

       const gltf0 = new GltfModel(gltfJson, pngBuffer);
       expect(gltf0.images!.length).toEqual(1);

       // The two textures should use the same URI
       expect((await gltf0.textures)[0].uri)
           .toEqual((await gltf0.textures)[1].uri);

       const gltf1 = GltfModel.fromGlb(await gltf0.packGlb());
       expect(gltf1.images!.length).toEqual(1);

       // Make sure buffer size is the same
       expect(gltf1.bufferByteLength!)
           .toEqual(packUtils.dwordAlign(pngBuffer.byteLength));
     });

  it('should not increase buffer size if the user sets a texture with a previous URI',
     async () => {
       const pngBuffer = await (await generatePngBlob()).arrayBuffer();
       const gltfJson = {
         asset: {'generator': 'FBX2glTF', 'version': '2.0'},
         samplers:
             [{magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497}],
         buffers: [{byteLength: pngBuffer.byteLength}],
         bufferViews:
             [{buffer: 0, byteOffset: 0, byteLength: pngBuffer.byteLength}],
         images: [{mimeType: 'image/png', bufferView: 0}],
         textures: [{source: 0, sampler: 0}],
         materials: [
           {
             name: 'with tex',
             pbrMetallicRoughness: {baseColorTexture: {index: 0}},
           },

         ],
         nodes: [{rotation: [0, 0, 0, 1]}],
       };

       const gltf0 = new GltfModel(gltfJson, pngBuffer);
       const texUri = (await gltf0.textures)[0].uri;
       await (await gltf0.materials)[0]
           .pbrMetallicRoughness.setBaseColorTexture(texUri);

       // Cycle it, check buffer size
       const gltf1 = GltfModel.fromGlb(await gltf0.packGlb());
       expect(gltf1.bufferByteLength!)
           .toEqual(packUtils.dwordAlign(pngBuffer.byteLength));
     });

  it('should not increase buffer size after pack/unpack cycle for a GLTF with a texture',
     async () => {
       const pngBuffer = await (await generatePngBlob()).arrayBuffer();
       const gltfJson = {
         asset: {'generator': 'FBX2glTF', 'version': '2.0'},
         samplers:
             [{magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497}],
         buffers: [{byteLength: pngBuffer.byteLength}],
         bufferViews:
             [{buffer: 0, byteOffset: 0, byteLength: pngBuffer.byteLength}],
         images: [{mimeType: 'image/png', bufferView: 0}],
         textures: [{source: 0, sampler: 0}],
         materials: [
           {
             name: 'with tex',
             pbrMetallicRoughness: {baseColorTexture: {index: 0}},
           },

         ],
         nodes: [{rotation: [0, 0, 0, 1]}],
       };

       const gltf0 = new GltfModel(gltfJson, pngBuffer);
       expect((await gltf0.textures).length).toEqual(1);
       expect(gltf0.bufferByteLength!).toEqual(pngBuffer.byteLength);

       // Cycle it, check buffer size
       const gltf1 = GltfModel.fromGlb(await gltf0.packGlb());
       expect(gltf1.bufferByteLength!)
           .toEqual(packUtils.dwordAlign(pngBuffer.byteLength));
     });


});
