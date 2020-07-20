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



import {arrayBufferEqualityTester, createBufferFromString, generatePngBlob, GlTf, GltfModel, ModelViewerConfig, RGBA} from '@google/model-viewer-editing-adapter/lib/main.js'
import {cloneJson} from '@google/model-viewer-editing-adapter/lib/util/clone_json.js'
import {degToRad} from '@google/model-viewer-editing-adapter/lib/util/math.js'

import {applyCameraEdits, Camera} from './camera_state.js';
import {dispatchAddBaseColorTexture, dispatchAddEmissiveTexture, dispatchAddMetallicRoughnessTexture, dispatchAddNormalTexture, dispatchAddOcclusionTexture, dispatchBaseColorTexture, dispatchEmissiveTexture, dispatchMaterialBaseColor, dispatchMetallicFactor, dispatchNormalTexture, dispatchOcclusionTexture, dispatchRoughnessFactor, dispatchSetAlphaCutoff, dispatchSetAlphaMode, dispatchSetEmissiveFactor} from './edit_dispatchers.js';
import {applyEdits, generateTextureId, getGltfEdits, INITIAL_GLTF_EDITS} from './gltf_edits.js';
import {dispatchCurrentCameraState, dispatchGltfAndEdits, dispatchGltfUrl, dispatchInitialCameraState, reduxStore, registerStateMutator} from './space_opera_base.js';

const EXAMPLE_BIN_AS_STRING = 'example of some bin data';
const EXAMPLE_BIN_AS_ARRAY_BUFFER =
    createBufferFromString(EXAMPLE_BIN_AS_STRING);
const BIN_LENGTH_IN_BYTES = EXAMPLE_BIN_AS_ARRAY_BUFFER.byteLength;

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
      'emissiveFactor': [0.3, 0.4, 0.5],
      'alphaMode': 'MASK',
      'alphaCutoff': 0.25,
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

const TEST_GLTF_JSON_METALLIC_ROUGHNESS_UNDEFINED = {
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
      },
    },
  ],
};

async function createGltfWithTexture() {
  const pngBuffer0 = await (await generatePngBlob('#fff')).arrayBuffer();
  const pngBuffer1 = await (await generatePngBlob('#000')).arrayBuffer();
  const pngBuffer2 = await (await generatePngBlob('#eee')).arrayBuffer();
  const gltfArray = new Uint8Array(
      pngBuffer0.byteLength + pngBuffer1.byteLength + pngBuffer2.byteLength);
  gltfArray.set(new Uint8Array(pngBuffer0), 0);
  gltfArray.set(new Uint8Array(pngBuffer1), pngBuffer0.byteLength);
  gltfArray.set(
      new Uint8Array(pngBuffer2),
      pngBuffer0.byteLength + pngBuffer1.byteLength);
  const gltfBuffer = gltfArray.buffer;

  const gltfJson = {
    asset: {'generator': 'FBX2glTF', 'version': '2.0'},
    samplers: [{magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497}],
    buffers: [{byteLength: gltfBuffer.byteLength}],
    bufferViews: [
      {
        buffer: 0,
        byteOffset: 0,
        byteLength: pngBuffer0.byteLength,
      },
      {
        buffer: 0,
        byteOffset: pngBuffer0.byteLength,
        byteLength: pngBuffer1.byteLength
      },
      {
        buffer: 0,
        byteOffset: pngBuffer0.byteLength + pngBuffer1.byteLength,
        byteLength: pngBuffer2.byteLength
      },
    ],
    images: [
      {mimeType: 'image/png', bufferView: 0},
      {mimeType: 'image/png', bufferView: 1},
      {mimeType: 'image/png', bufferView: 2}
    ],
    textures: [
      {source: 0, sampler: 0}, {source: 1, sampler: 0}, {source: 2, sampler: 0}
    ],
    materials: [
      {
        name: 'with tex',
        pbrMetallicRoughness: {
          baseColorTexture: {index: 0},
          metallicRoughnessTexture: {index: 1}
        },
        normalTexture: {
          index: 0,
        },
        emissiveTexture: {
          index: 0,
        },
        occlusionTexture: {
          index: 0,
        },
        doubleSided: true,
      },
      {
        name: 'no tex',
      },
    ],
  } as GlTf;
  return new GltfModel(gltfJson, gltfBuffer);
}

async function applyEditsToStoredGltf() {
  const state = reduxStore.getState();
  if (!state.gltf) {
    throw new Error(`no GLTF in state to edit!`);
  }
  await applyEdits(state.gltf, state.edits);
  return state.gltf;
}

describe('space opera base test', () => {
  beforeEach(async () => {
    jasmine.addCustomEqualityTester(arrayBufferEqualityTester);
    await dispatchGltfAndEdits(undefined);
  });

  it('produces the correct materials when dispatching a GLTF action',
     async () => {
       const gltf = new GltfModel(cloneJson(TEST_GLTF_JSON), null);
       await dispatchGltfAndEdits(gltf);

       expect(reduxStore.getState().edits.materials).toEqual([
         jasmine.objectContaining({
           name: 'yellow',
           baseColorFactor: [0.8, 0.8, 0.2, 1.0],
           roughnessFactor: 0.9,
           metallicFactor: 0.4,
         }),
         jasmine.objectContaining({
           name: 'purple',
           baseColorFactor: [0.8, 0.2, 0.8, 1.0],
           roughnessFactor: 0.2,
           metallicFactor: 0.3,
         }),
       ]);
     });

  it('color dispatch affects edit state, but not gltf state', async () => {
    const gltf = new GltfModel(cloneJson(TEST_GLTF_JSON), null);
    await dispatchGltfAndEdits(gltf);
    dispatchMaterialBaseColor({
      index: 1,
      baseColorFactor: [0.1, 0.2, 0.3, 0.5],
    });

    expect(reduxStore.getState().edits.materials).toEqual([
      jasmine.objectContaining({
        name: 'yellow',
        baseColorFactor: [0.8, 0.8, 0.2, 1.0],
        roughnessFactor: 0.9,
        metallicFactor: 0.4,
      }),
      jasmine.objectContaining({
        name: 'purple',
        // Changed, including alpha
        baseColorFactor: [0.1, 0.2, 0.3, 0.5],
        roughnessFactor: 0.2,
        metallicFactor: 0.3,
      }),
    ]);

    const gltfMaterials = (await reduxStore.getState().gltf!.materials);
    // Should not be changed!
    expect(await gltfMaterials[1].pbrMetallicRoughness.baseColorFactor)
        .toEqual([0.8, 0.2, 0.8, 1.0]);
  });

  it('roughness factor dispatch affects edit state, but not gltf state',
     async () => {
       const gltf = new GltfModel(cloneJson(TEST_GLTF_JSON), null);
       await dispatchGltfAndEdits(gltf);
       dispatchRoughnessFactor({id: 1, roughnessFactor: 0.5});

       expect(reduxStore.getState().edits.materials).toEqual([
         jasmine.objectContaining({
           name: 'yellow',
           baseColorFactor: [0.8, 0.8, 0.2, 1.0],
           roughnessFactor: 0.9,
           metallicFactor: 0.4,
         }),
         jasmine.objectContaining({
           name: 'purple',
           baseColorFactor: [0.8, 0.2, 0.8, 1.0],
           // Changed
           roughnessFactor: 0.5,
           metallicFactor: 0.3,
         }),
       ]);

       const gltfMaterials = (await reduxStore.getState().gltf!.materials);
       // Should not be changed!
       expect(await gltfMaterials[1].pbrMetallicRoughness.roughnessFactor)
           .toEqual(0.2);
     });

  it('metallic factor dispatch affects edit state, but not gltf state',
     async () => {
       const gltf = new GltfModel(cloneJson(TEST_GLTF_JSON), null);
       await dispatchGltfAndEdits(gltf);
       dispatchMetallicFactor({id: 1, metallicFactor: 0.5});

       expect(reduxStore.getState().edits.materials).toEqual([
         jasmine.objectContaining({
           name: 'yellow',
           baseColorFactor: [0.8, 0.8, 0.2, 1.0],
           roughnessFactor: 0.9,
           metallicFactor: 0.4,
         }),
         jasmine.objectContaining({
           name: 'purple',
           baseColorFactor: [0.8, 0.2, 0.8, 1.0],
           roughnessFactor: 0.2,
           // Changed
           metallicFactor: 0.5,
         }),
       ]);

       const gltfMaterials = (await reduxStore.getState().gltf!.materials);
       // Should not be changed!
       expect(await gltfMaterials[1].pbrMetallicRoughness.metallicFactor)
           .toEqual(0.3);
     });

  it('material edits where roughness and metallic factors are initially undefined works',
     async () => {
       const gltf = new GltfModel(
           cloneJson(TEST_GLTF_JSON_METALLIC_ROUGHNESS_UNDEFINED), null);
       const materialsEdits = [
         {
           name: 'yellow',
           baseColorFactor: ([0.8, 0.8, 0.2, 1.0] as RGBA),
           // Changed
           roughnessFactor: 0.4,
           // Changed
           metallicFactor: 0.3,
         },
       ];

       const gltfEdits = {
         ...INITIAL_GLTF_EDITS,
         materials: materialsEdits,
       };

       await applyEdits(gltf, gltfEdits);
       const material = (await gltf.materials)[0];
       expect(await material.name).toEqual('yellow');
       expect(await material.pbrMetallicRoughness.baseColorFactor).toEqual([
         0.8, 0.8, 0.2, 1.0
       ]);
       expect(await material.pbrMetallicRoughness.roughnessFactor).toEqual(0.4);
       expect(await material.pbrMetallicRoughness.metallicFactor).toEqual(0.3);
     });

  it('getEditedGltf after color dispatch should work', async () => {
    const gltf = new GltfModel(cloneJson(TEST_GLTF_JSON), null);
    await dispatchGltfAndEdits(gltf);
    dispatchMaterialBaseColor(
        {index: 1, baseColorFactor: [0.1, 0.2, 0.3, 0.4]});

    const newGltf = await applyEditsToStoredGltf();
    const gltfMaterials = (await newGltf.materials);
    expect(gltfMaterials).toBeDefined();
    // Should be changed!
    expect(await gltfMaterials[1].pbrMetallicRoughness.baseColorFactor)
        .toEqual([0.1, 0.2, 0.3, 0.4]);
  });

  it('getGltfEdits should produce identity edits', async () => {
    const gltf = new GltfModel(cloneJson(TEST_GLTF_JSON), null);
    const expectedBytes = await gltf.packGlb();
    const edits = await getGltfEdits(gltf);
    await applyEdits(gltf, edits);
    const actualBytes = await gltf.packGlb();
    expect(actualBytes).toEqual(expectedBytes);
  });

  it('loading gltf without pbr works and gets proper default values',
     async () => {
       const NO_PBR_BLOCK_JSON = cloneJson(TEST_GLTF_JSON);
       delete NO_PBR_BLOCK_JSON.materials[0].pbrMetallicRoughness;
       delete NO_PBR_BLOCK_JSON.materials[1]
           .pbrMetallicRoughness.baseColorFactor;
       delete NO_PBR_BLOCK_JSON.materials[1]
           .pbrMetallicRoughness.roughnessFactor;
       delete NO_PBR_BLOCK_JSON.materials[1]
           .pbrMetallicRoughness.metallicFactor;
       const gltf = new GltfModel(NO_PBR_BLOCK_JSON, null);
       await dispatchGltfAndEdits(gltf);

       // Make sure they have sensible defaults in edits
       expect(reduxStore.getState().edits.materials).toEqual([
         jasmine.objectContaining({
           name: 'yellow',
           baseColorFactor: [1, 1, 1, 1],
           roughnessFactor: 1,
           metallicFactor: 1,
         }),
         jasmine.objectContaining({
           name: 'purple',
           baseColorFactor: [1, 1, 1, 1],
           roughnessFactor: 1,
           metallicFactor: 1,
         }),
       ]);
     });

  it('loading a gltf with textures results in the correct app state',
     async () => {
       const model = (await createGltfWithTexture());
       await dispatchGltfAndEdits(model);

       const {texturesById, materials} = reduxStore.getState().edits;
       expect(texturesById.size).toEqual(3);
       expect(materials.length).toEqual(2);
       expect(materials[1].baseColorTextureId).not.toBeDefined();

       const texId = materials[0].baseColorTextureId!;
       expect(texturesById.get(texId)!.id).toEqual(texId);
       expect(texturesById.get(texId)!.uri)
           .toEqual((await model.textures)[0].uri);
     });

  it('applying texture edits works', async () => {
    const gltf = (await createGltfWithTexture());

    // Set the other material to use the texture
    expect(
        await (await gltf.materials)[1].pbrMetallicRoughness.baseColorTexture)
        .toBeNull();
    expect(await (await gltf.materials)[1]
               .pbrMetallicRoughness.metallicRoughnessTexture)
        .toBeNull();
    expect(await (await gltf.materials)[1].normalTexture).toBeNull();
    expect(await (await gltf.materials)[1].emissiveTexture).toBeNull();
    expect(await (await gltf.materials)[1].occlusionTexture).toBeNull();
    const edits1 = await getGltfEdits(gltf);
    edits1.materials[1] = {
      ...edits1.materials[1],
      baseColorTextureId: edits1.materials[0].baseColorTextureId,
      metallicRoughnessTextureId:
          edits1.materials[0].metallicRoughnessTextureId,
      normalTextureId: edits1.materials[0].normalTextureId,
      emissiveTextureId: edits1.materials[0].emissiveTextureId,
      occlusionTextureId: edits1.materials[0].occlusionTextureId,
    };
    await applyEdits(gltf, edits1);
    expect(
        await (await gltf.materials)[1].pbrMetallicRoughness.baseColorTexture)
        .not.toBeNull();
    expect(await (await gltf.materials)[1]
               .pbrMetallicRoughness.metallicRoughnessTexture)
        .not.toBeNull();
    expect(await (await gltf.materials)[1].normalTexture).not.toBeNull();
    expect(await (await gltf.materials)[1].emissiveTexture).not.toBeNull();
    expect(await (await gltf.materials)[1].occlusionTexture).not.toBeNull();

    // Handle should've been re-used
    expect(
        await (await gltf.materials)[1].pbrMetallicRoughness.baseColorTexture)
        .toEqual(await (await gltf.materials)[0]
                     .pbrMetallicRoughness.baseColorTexture);
    expect(await (await gltf.materials)[1]
               .pbrMetallicRoughness.metallicRoughnessTexture)
        .toEqual(await (await gltf.materials)[0]
                     .pbrMetallicRoughness.metallicRoughnessTexture);
    expect(await (await gltf.materials)[1].normalTexture)
        .toEqual(await (await gltf.materials)[0].normalTexture);
    expect(await (await gltf.materials)[1].emissiveTexture)
        .toEqual(await (await gltf.materials)[0].emissiveTexture);
    expect(await (await gltf.materials)[1].occlusionTexture)
        .toEqual(await (await gltf.materials)[0].occlusionTexture);

    // Clear the first material
    const edits2 = await getGltfEdits(gltf);
    edits2.materials[0] = {
      ...edits2.materials[0],
      baseColorTextureId: undefined,
      metallicRoughnessTextureId: undefined,
      normalTextureId: undefined,
      emissiveTextureId: undefined,
      occlusionTextureId: undefined,
    };
    await applyEdits(gltf, edits2);
    expect(
        await (await gltf.materials)[0].pbrMetallicRoughness.baseColorTexture)
        .toBeNull();
    expect(
        await (await gltf.materials)[1].pbrMetallicRoughness.baseColorTexture)
        .not.toBeNull();
    expect(await (await gltf.materials)[0]
               .pbrMetallicRoughness.metallicRoughnessTexture)
        .toBeNull();
    expect(await (await gltf.materials)[1]
               .pbrMetallicRoughness.metallicRoughnessTexture)
        .not.toBeNull();
    expect(await (await gltf.materials)[0].normalTexture).toBeNull();
    expect(await (await gltf.materials)[1].normalTexture).not.toBeNull();
    expect(await (await gltf.materials)[0].emissiveTexture).toBeNull();
    expect(await (await gltf.materials)[1].emissiveTexture).not.toBeNull();
    expect(await (await gltf.materials)[0].occlusionTexture).toBeNull();
    expect(await (await gltf.materials)[1].occlusionTexture).not.toBeNull();
  });

  it('applies edits to texture doublesidedness', async () => {
    const gltf = (await createGltfWithTexture());
    expect(await (await gltf.materials)[0].doubleSided).toBeTrue();
    expect(await (await gltf.materials)[1].doubleSided).not.toBeDefined();

    // Set material 1 to be not double sided.
    const edits1 = await getGltfEdits(gltf);
    edits1.materials[1] = {
      ...edits1.materials[1],
      doubleSided: false,
    };
    await applyEdits(gltf, edits1);
    expect(await (await gltf.materials)[1].doubleSided).toBeFalse();

    // Clear mat 0's doublesidedness.
    const edits2 = await getGltfEdits(gltf);
    edits2.materials[0] = {
      ...edits2.materials[0],
      doubleSided: undefined,
    };
    await applyEdits(gltf, edits2);

    expect(await (await gltf.materials)[0].doubleSided).not.toBeDefined();
    expect(await (await gltf.materials)[1].doubleSided).toBeFalse();
  });

  it('adding and assigning a new texture works', async () => {
    const gltf = (await createGltfWithTexture());
    const newBaseColorTexUri = 'polkadots.png';
    const newMetallicRoughnessTexUri = 'metallic.png';
    const newNormalTexUri = 'normal.png';

    // Actually add a new texture
    const edits1 = await getGltfEdits(gltf);
    const newBaseColorTexId = generateTextureId();
    const newMetallicRoughnessTexId = generateTextureId();
    const newNormalTexId = generateTextureId();

    edits1.texturesById.set(
        newBaseColorTexId, {id: newBaseColorTexId, uri: newBaseColorTexUri});
    edits1.texturesById.set(
        newMetallicRoughnessTexId,
        {id: newBaseColorTexId, uri: newMetallicRoughnessTexUri});
    edits1.texturesById.set(
        newNormalTexId, {id: newNormalTexId, uri: newNormalTexUri});
    edits1.materials[0] = {
      ...edits1.materials[0],
      baseColorTextureId: newBaseColorTexId,
      metallicRoughnessTextureId: newMetallicRoughnessTexId,
      normalTextureId: newNormalTexId,
    };
    await applyEdits(gltf, edits1);
    expect(
        (await (await gltf.materials)[0].pbrMetallicRoughness.baseColorTexture)
            ?.uri)
        .toEqual(newBaseColorTexUri);
    expect((await (await gltf.materials)[0]
                .pbrMetallicRoughness.metallicRoughnessTexture)
               ?.uri)
        .toEqual(newMetallicRoughnessTexUri);
    expect((await (await gltf.materials)[0].normalTexture)?.uri)
        .toEqual(newNormalTexUri);
  });

  it('dispatchBaseColorTexture can be used to share textures and clear them',
     async () => {
       await dispatchGltfAndEdits(await createGltfWithTexture());

       let gltf = await applyEditsToStoredGltf();
       expect(await (await gltf.materials)[1]
                  .pbrMetallicRoughness.baseColorTexture)
           .toBeNull();

       // Set mat 1 to use mat 0's texture
       const textureId =
           reduxStore.getState().edits.materials[0].baseColorTextureId;
       expect(textureId).toBeDefined();
       dispatchBaseColorTexture({id: 1, textureId});
       gltf = await applyEditsToStoredGltf();
       expect(await (await gltf.materials)[1]
                  .pbrMetallicRoughness.baseColorTexture)
           .toEqual(await (await gltf.materials)[0]
                        .pbrMetallicRoughness.baseColorTexture);

       // Clear mat 0's texture
       dispatchBaseColorTexture({id: 0, textureId: undefined});
       gltf = await applyEditsToStoredGltf();
       expect(await (await gltf.materials)[0]
                  .pbrMetallicRoughness.baseColorTexture)
           .toBeNull();
     });

  it('can share or clear textures when using dispatchNormalTexture',
     async () => {
       await dispatchGltfAndEdits(await createGltfWithTexture());

       let gltf = await applyEditsToStoredGltf();
       expect(await (await gltf.materials)[1].normalTexture).toBeNull();

       // Set mat 1 to use mat 0's texture
       const textureId =
           reduxStore.getState().edits.materials[0].normalTextureId;
       expect(textureId).toBeDefined();
       dispatchNormalTexture({id: 1, textureId});
       gltf = await applyEditsToStoredGltf();
       expect(await (await gltf.materials)[1].normalTexture)
           .toEqual(await (await gltf.materials)[0].normalTexture);

       // Clear mat 0's texture
       dispatchNormalTexture({id: 0, textureId: undefined});
       gltf = await applyEditsToStoredGltf();
       expect(await (await gltf.materials)[0].normalTexture).toBeNull();
     });

  it('can share or clear textures when using dispatchEmissiveTexture',
     async () => {
       await dispatchGltfAndEdits(await createGltfWithTexture());

       let gltf = await applyEditsToStoredGltf();
       expect(await (await gltf.materials)[1].emissiveTexture).toBeNull();

       // Set mat 1 to use mat 0's texture
       const textureId =
           reduxStore.getState().edits.materials[0].emissiveTextureId;
       expect(textureId).toBeDefined();
       dispatchEmissiveTexture({id: 1, textureId});
       gltf = await applyEditsToStoredGltf();
       expect(await (await gltf.materials)[1].emissiveTexture)
           .toEqual(await (await gltf.materials)[0].emissiveTexture);

       // Clear mat 0's texture
       dispatchEmissiveTexture({id: 0, textureId: undefined});
       gltf = await applyEditsToStoredGltf();
       expect(await (await gltf.materials)[0].emissiveTexture).toBeNull();
     });

  it('can share or clear textures when using dispatchOcclusionTexture',
     async () => {
       await dispatchGltfAndEdits(await createGltfWithTexture());

       let gltf = await applyEditsToStoredGltf();
       expect(await (await gltf.materials)[1].occlusionTexture).toBeNull();

       // Set mat 1 to use mat 0's texture
       const textureId =
           reduxStore.getState().edits.materials[0].occlusionTextureId;
       expect(textureId).toBeDefined();
       dispatchOcclusionTexture({id: 1, textureId});
       gltf = await applyEditsToStoredGltf();
       expect(await (await gltf.materials)[1].occlusionTexture)
           .toEqual(await (await gltf.materials)[0].occlusionTexture);

       // Clear mat 0's texture
       dispatchOcclusionTexture({id: 0, textureId: undefined});
       gltf = await applyEditsToStoredGltf();
       expect(await (await gltf.materials)[0].occlusionTexture).toBeNull();
     });

  it('should reuse textures when applying edits to the same model',
     async () => {
       await dispatchGltfAndEdits(await createGltfWithTexture());

       const gltf = reduxStore.getState().gltf!;
       expect(gltf).toBeDefined();
       expect((await gltf.textures).length).toEqual(3);

       await applyEdits(gltf, reduxStore.getState().edits);
       expect((await gltf.textures).length).toEqual(3);
     });

  it('dispatchAddBaseColorTexture can add new textures', async () => {
    await dispatchGltfAndEdits(await createGltfWithTexture());
    dispatchAddBaseColorTexture({id: 1, uri: 'grass.png'});

    const gltf = await applyEditsToStoredGltf();
    expect((await (await gltf.materials)[1]
                .pbrMetallicRoughness.baseColorTexture)!.uri)
        .toEqual('grass.png');
    // Shouldn't affect mat[0]
    expect((await (await gltf.materials)[0]
                .pbrMetallicRoughness.baseColorTexture)!.uri)
        .not.toBeNull();
    // Should have at least 2 textures..
    expect((await gltf.textures).length).toBeGreaterThanOrEqual(2);
  });

  it('adds new textures with dispatchAddMetallicRoughnessTexture', async () => {
    await dispatchGltfAndEdits(await createGltfWithTexture());
    dispatchAddMetallicRoughnessTexture({id: 1, uri: 'roughness.png'});

    const gltf = await applyEditsToStoredGltf();
    expect((await (await gltf.materials)[1]
                .pbrMetallicRoughness.metallicRoughnessTexture)!.uri)
        .toEqual('roughness.png');
    // Shouldn't affect mat[0]
    expect((await (await gltf.materials)[0]
                .pbrMetallicRoughness.metallicRoughnessTexture)!.uri)
        .not.toBeNull();
    // Should have at least 2 textures..
    expect((await gltf.textures).length).toBeGreaterThanOrEqual(2);
  });

  it('adds new textures with dispatchAddNormalTexture', async () => {
    await dispatchGltfAndEdits(await createGltfWithTexture());
    dispatchAddNormalTexture({id: 1, uri: 'normal.png'});

    const gltf = await applyEditsToStoredGltf();
    expect((await (await gltf.materials)[1].normalTexture)!.uri)
        .toEqual('normal.png');
    // Shouldn't affect mat[0]
    expect((await (await gltf.materials)[0].normalTexture)!.uri).not.toBeNull();
    // Should have at least 2 textures..
    expect((await gltf.textures).length).toBeGreaterThanOrEqual(2);
  });

  it('adds new textures with dispatchAddEmissiveTexture', async () => {
    await dispatchGltfAndEdits(await createGltfWithTexture());
    dispatchAddEmissiveTexture({id: 1, uri: 'emissive.png'});

    const gltf = await applyEditsToStoredGltf();
    expect((await (await gltf.materials)[1].emissiveTexture)!.uri)
        .toEqual('emissive.png');
    // Shouldn't affect mat[0]
    expect((await (await gltf.materials)[0].emissiveTexture)!.uri)
        .not.toBeNull();
    // Should have at least 2 textures..
    expect((await gltf.textures).length).toBeGreaterThanOrEqual(2);
  });

  it('adds new textures with dispatchAddOcclusionTexture', async () => {
    await dispatchGltfAndEdits(await createGltfWithTexture());
    dispatchAddOcclusionTexture({id: 1, uri: 'occlusion.png'});

    const gltf = await applyEditsToStoredGltf();
    expect((await (await gltf.materials)[1].occlusionTexture)!.uri)
        .toEqual('occlusion.png');
    // Shouldn't affect mat[0]
    expect((await (await gltf.materials)[0].occlusionTexture)!.uri)
        .not.toBeNull();
    // Should have at least 2 textures..
    expect((await gltf.textures).length).toBeGreaterThanOrEqual(2);
  });

  it('throws if we try to add duplicate mutator action names', () => {
    const name = 'SOME_TEST_MUTATOR';
    registerStateMutator(name, () => {});
    expect(() => {
      registerStateMutator(name, () => {});
    }).toThrow();
  });

  it('applies camera edits correctly to a model viewer config', () => {
    const camera = {
      orbit: {theta: degToRad(1.2), phi: degToRad(3.4), radius: 5.6},
      target: {x: 1, y: 2, z: 3},
      fieldOfView: 42,
    };
    const config = {} as ModelViewerConfig;
    applyCameraEdits(config, camera);
    expect(config.cameraOrbit).toEqual('1.2deg 3.4deg 5.6m');
    expect(config.cameraTarget).toEqual('1m 2m 3m');
    expect(config.fieldOfView).toEqual('42deg');
  });

  it('does not add config fields if the edits do not have them set', () => {
    const camera = {} as Camera;
    const config = {} as ModelViewerConfig;
    applyCameraEdits(config, camera);
    expect(config.cameraOrbit).not.toBeDefined();
    expect(config.cameraTarget).not.toBeDefined();
    expect(config.fieldOfView).not.toBeDefined();
  });

  it('leaves config fields alone if edits do not have them set', () => {
    const camera = {} as Camera;
    const config = {
      cameraOrbit: 'some orbit',
      cameraTarget: 'some target',
      fieldOfView: 'some fov',
      minCameraOrbit: 'some min orbit',
      maxCameraOrbit: 'some max orbit',
    } as ModelViewerConfig;
    applyCameraEdits(config, camera);
    expect(config.cameraOrbit).toEqual('some orbit');
    expect(config.cameraTarget).toEqual('some target');
    expect(config.fieldOfView).toEqual('some fov');
    expect(config.minCameraOrbit).toEqual('some min orbit');
    expect(config.maxCameraOrbit).toEqual('some max orbit');
  });

  it('sets correct attributes for disabled camera pitch limits', () => {
    const camera = {
      pitchLimits: {min: 10, max: 20, enabled: false},
    } as Camera;
    const config = {} as ModelViewerConfig;
    applyCameraEdits(config, camera);
    expect(config.minCameraOrbit).toEqual('auto auto auto');
    expect(config.maxCameraOrbit).toEqual('auto auto auto');
  });

  it('sets correct attributes for enabled pitch limits', () => {
    const camera = {
      pitchLimits: {min: 10, max: 20, enabled: true},
    } as Camera;
    const config = {} as ModelViewerConfig;
    applyCameraEdits(config, camera);
    expect(config.minCameraOrbit).toEqual('auto 10deg auto');
    expect(config.maxCameraOrbit).toEqual('auto 20deg auto');
  });

  it('correctly updates state upon dispatching camera fields', () => {
    dispatchCurrentCameraState({fieldOfView: 42});
    expect(reduxStore.getState().currentCamera!.fieldOfView).toEqual(42);

    dispatchInitialCameraState({fieldOfView: 451});
    expect(reduxStore.getState().initialCamera.fieldOfView).toEqual(451);
  });

  it('sets correct attributes for FOV limits', () => {
    const camera = {
      fovLimits: {min: 10, max: 20, enabled: true},
    } as Camera;
    const config = {} as ModelViewerConfig;
    applyCameraEdits(config, camera);
    expect(config.minFov).toEqual('10deg');
    expect(config.maxFov).toEqual('20deg');
  });

  it('sets the URL when calling dispatchGltfUrl', () => {
    dispatchGltfUrl('test.glb');
    expect(reduxStore.getState().gltfUrl).toEqual('test.glb');
  });

  it('applies edits to texture emissiveFactor', async () => {
    const gltf = new GltfModel(cloneJson(TEST_GLTF_JSON), null);
    await dispatchGltfAndEdits(gltf);

    expect(reduxStore.getState().edits.materials[0].emissiveFactor).toEqual([
      0.3, 0.4, 0.5
    ]);
    expect(reduxStore.getState().edits.materials[1].emissiveFactor)
        .toBeUndefined();

    dispatchSetEmissiveFactor({id: 1, emissiveFactor: [0.5, 0.6, 0.7]});

    const newGltf = await applyEditsToStoredGltf();
    const gltfMaterials = (await newGltf.materials);
    expect(gltfMaterials).toBeDefined();

    expect(await gltfMaterials[1].emissiveFactor).toEqual([0.5, 0.6, 0.7]);
  });

  it('applies edits to texture alphaMode', async () => {
    const gltf = new GltfModel(cloneJson(TEST_GLTF_JSON), null);
    await dispatchGltfAndEdits(gltf);

    expect(reduxStore.getState().edits.materials[0].alphaMode).toBe('MASK');
    expect(reduxStore.getState().edits.materials[1].alphaMode).toBeUndefined();

    dispatchSetAlphaMode({id: 1, alphaMode: 'BLEND'});

    const newGltf = await applyEditsToStoredGltf();
    const gltfMaterials = (await newGltf.materials);
    expect(gltfMaterials).toBeDefined();

    expect(await gltfMaterials[1].alphaMode).toBe('BLEND');
  });

  it('applies edits to texture alphaCutoff', async () => {
    const gltf = new GltfModel(cloneJson(TEST_GLTF_JSON), null);
    await dispatchGltfAndEdits(gltf);

    expect(reduxStore.getState().edits.materials[0].alphaCutoff).toBe(0.25);
    expect(reduxStore.getState().edits.materials[1].alphaCutoff)
        .toBeUndefined();

    dispatchSetAlphaCutoff({id: 0, alphaCutoff: 0.6});

    const newGltf = await applyEditsToStoredGltf();
    const gltfMaterials = (await newGltf.materials);
    expect(gltfMaterials).toBeDefined();

    expect(await gltfMaterials[0].alphaCutoff).toBe(0.6);
  });
});
