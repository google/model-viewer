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



import {ModelViewerElement} from '@google/model-viewer';

import {arrayBufferEqualityTester, createBufferFromString, fetchBufferForUri, generatePngBlob} from '../testing/utils.js';
import {cloneJson} from '../util/clone_json.js';
import {createSafeObjectURL} from '../util/create_object_url.js';

import {GltfModel, Material, SINGLE_PIXEL_PNG_BLOB, TextureHandle} from './gltf_model.js';
import {GlTf, Material as GlTfMaterial} from './gltf_spec.js';

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
      'pbrMetallicRoughness':
          {'baseColorFactor': [0.8, 0.8, 0.2, 1.0], 'roughnessFactor': 0.9},
    },
    {
      'name': 'purple',
      'pbrMetallicRoughness': {'baseColorFactor': [0.8, 0.2, 0.8, 1.0]},
    },
  ],
};

async function getByteLengthForUrl(url: string): Promise<number> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch url ${url}`);
  }
  const blob = await response.blob();
  if (!blob) {
    throw new Error(`Could not extract binary blob from response of ${url}`);
  }

  return (await blob.arrayBuffer()).byteLength;
}

function expectedBytesSaved(imageBytes: number) {
  // We save space by replacing a full image with the single-pixel, so we don't
  // save it all, but should be most of it.
  return imageBytes - SINGLE_PIXEL_PNG_BLOB.size;
}

async function generatePngObjectUrl(color: string) {
  const pngBlob = await generatePngBlob(color);
  return createSafeObjectURL(pngBlob).unsafeUrl;
}

async function createGltfWithTexture() {
  const pngBuffer0 = await (await generatePngBlob('#fff')).arrayBuffer();
  const pngBuffer1 = await (await generatePngBlob('#000')).arrayBuffer();
  const gltfArray =
      new Uint8Array(pngBuffer0.byteLength + pngBuffer1.byteLength);
  gltfArray.set(new Uint8Array(pngBuffer0), 0);
  gltfArray.set(new Uint8Array(pngBuffer1), pngBuffer0.byteLength);
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
    ],
    images: [
      {mimeType: 'image/png', bufferView: 0},
      {mimeType: 'image/png', bufferView: 1}
    ],
    textures: [{source: 0, sampler: 0}, {source: 1, sampler: 0}],
    materials: [
      {
        name: 'with tex',
        pbrMetallicRoughness: {
          baseColorTexture: {index: 0},
          metallicRoughnessTexture: {index: 1}
        },
      },
      {
        name: 'no tex',
      },
    ],
  } as GlTf;
  return {
    model: new GltfModel(gltfJson, gltfBuffer),
    buffers: [pngBuffer0, pngBuffer1]
  };
}

type TextureGetter = (material: Material) => TextureHandle|null;
type TextureSetter =
    (material: Material, newHandle: TextureHandle|string|null) => Promise<void>;

/**
 * materialJson should be a gltf-Material JSON object that uses texture 0 for
 * the texture slot being tested.
 */
async function testTextureApi(
    materialJson: GlTfMaterial,
    getTexture: TextureGetter,
    setTexture: TextureSetter) {
  const gltfJson = {
    asset: {'generator': 'FBX2glTF', 'version': '2.0'},
    samplers: [{magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497}],
    images: [{uri: 'originalTexture.png'}],
    textures: [{source: 0, sampler: 0}],
    materials: [
      materialJson,
      {
        name: 'no tex',
      },
    ],
  } as GlTf;
  const model = new GltfModel(gltfJson, null);
  const mat0 = model.materials[0];
  const mat1 = model.materials[1];

  // Loads and reads correctly
  expect(model.textures.length).toBe(1);

  const originalTex = getTexture(mat0);
  expect(originalTex!.uri).toEqual('originalTexture.png');
  expect(getTexture(mat1)).toBeNull();

  // Re-use
  await setTexture(mat1, originalTex);
  expect(getTexture(mat1)).toBe(originalTex);
  expect(model.textures.length).toBe(1);

  // Clear
  await setTexture(mat0, null);
  expect(getTexture(mat0)).toBeNull();

  // Restore
  await setTexture(mat0, originalTex);
  expect(getTexture(mat0)).toBe(originalTex);

  // Add
  await setTexture(mat0, 'newTexture.png');
  expect(model.textures.length).toBe(2);
  expect(getTexture(mat0)!.uri).toEqual('newTexture.png');

  // Make sure nothing else got changed
  expect(getTexture(mat1)).toEqual(originalTex);
  expect(originalTex!.uri).toEqual('originalTexture.png');
}

class DummyModelViewer {
  constructor(public src?: string) {
  }
}

describe('gltf model test', () => {
  beforeEach(() => {
    jasmine.addCustomEqualityTester(arrayBufferEqualityTester);
  });

  it('setters work', async () => {
    const model = new GltfModel(cloneJson(TEST_GLTF_JSON), null);
    const material = model.materials[0];
    expect(material).toBeDefined();
    const pbr = material.pbrMetallicRoughness;
    expect(pbr).toBeDefined();

    expect(pbr.baseColorFactor).toEqual([0.8, 0.8, 0.2, 1.0]);
    expect(pbr.roughnessFactor).toEqual(0.9);

    await pbr.setBaseColorFactor([0, 0.5, 1.0, 0.5]);
    expect(pbr.baseColorFactor).toEqual([0, 0.5, 1.0, 0.5]);

    await pbr.setRoughnessFactor(0.5);
    expect(pbr.roughnessFactor).toEqual(0.5);

    // Check 0 case, for bad use of || operator.
    await pbr.setRoughnessFactor(0.0);
    expect(pbr.roughnessFactor).toEqual(0.0);
  });

  it('for missing material properties, reading them returns default values and does not modify JSON',
     async () => {
       const emptyMaterialsRoot: GlTf = {
         'asset': {'generator': 'FBX2glTF', 'version': '2.0'},
         'buffers': [{
           'byteLength': BIN_LENGTH_IN_BYTES,
         }],
         'bufferViews': [
           {'buffer': 0, 'byteLength': BIN_LENGTH_IN_BYTES, 'name': 'image1'}
         ],
         'materials': [
           {
             'name': 'empty material',
           },
         ],
       };
       const model = new GltfModel(emptyMaterialsRoot, null);
       const pbr = model.materials[0].pbrMetallicRoughness;

       // Getters should return defaults.
       expect(pbr.baseColorFactor).toEqual([1, 1, 1, 1]);
       expect(pbr.roughnessFactor).toEqual(1);

       // Setting to default values should not add properties to underlying
       // JSON.
       await pbr.setBaseColorFactor([1, 1, 1, 1]);
       await pbr.setRoughnessFactor(1);

       expect(emptyMaterialsRoot.materials![0]
                  .pbrMetallicRoughness?.baseColorFactor)
           .not.toBeDefined();
       expect(emptyMaterialsRoot.materials![0]
                  .pbrMetallicRoughness?.roughnessFactor)
           .not.toBeDefined();

       // ..and setting should actually still work
       await pbr.setBaseColorFactor([0.1, 0.2, 0.3, 0.4]);
       expect(pbr.baseColorFactor).toEqual([0.1, 0.2, 0.3, 0.4]);

       await pbr.setRoughnessFactor(0.123);
       expect(pbr.roughnessFactor).toEqual(0.123);
     });

  it('texture getters/setters should work as expected', async () => {
    const GLTF_JSON = {
      asset: {'generator': 'FBX2glTF', 'version': '2.0'},
      samplers:
          [{magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497}],
      images:
          [{uri: 'basecolor.png'}, {uri: 'roughness.png'}, {uri: 'normal.png'}],
      textures: [
        {source: 0, sampler: 0},
        {source: 1, sampler: 0},
        {source: 2, sampler: 0}
      ],
      materials: [
        {
          name: 'with tex',
          pbrMetallicRoughness: {
            baseColorTexture: {index: 0},
            metallicRoughnessTexture: {index: 1}
          },
          normalTexture: {index: 2, texCoord: 0},
          emissiveFactor: [0.3, 0.4, 0.5],
          doubleSided: true,
          alphaMode: 'MASK',
          alphaCutoff: 0.25,
        },
        {
          name: 'no tex',
        },
      ],
    } as GlTf;
    const model =
        new GltfModel(cloneJson(GLTF_JSON), EXAMPLE_BIN_AS_ARRAY_BUFFER);

    const materials = model.materials;
    const textures = model.textures;

    expect(textures.length).toBe(3);
    expect(materials.length).toBe(2);

    const pbr0 = materials[0].pbrMetallicRoughness;
    const pbr1 = materials[1].pbrMetallicRoughness;

    const baseColorTex = pbr0.baseColorTexture;
    expect(baseColorTex).not.toBeNull();
    expect(baseColorTex!.uri).toEqual('basecolor.png');
    expect(pbr1.baseColorTexture).toBeNull();

    const metallicRoughnessTex = pbr0.metallicRoughnessTexture;
    expect(metallicRoughnessTex).not.toBeNull();
    expect(metallicRoughnessTex!.uri).toEqual('roughness.png');
    expect(pbr1.metallicRoughnessTexture).toBeNull();

    const normalTex0 = materials[0].normalTexture!;
    const normalTex1 = materials[1].normalTexture!;

    expect(normalTex0).not.toBeNull();
    expect(normalTex0?.uri).toEqual('normal.png');
    expect(normalTex1).toBeNull();

    expect(model.materials[0].doubleSided).toBe(true);
    expect(model.materials[1].doubleSided).not.toBeDefined();

    await model.materials[0].setDoubleSided(false);
    expect(model.materials[0].doubleSided).toBe(false);

    expect(model.materials[0].alphaMode).toBe('MASK');
    expect(model.materials[1].alphaMode).not.toBeDefined();

    await model.materials[0].setAlphaMode('OPAQUE');
    expect(model.materials[0].alphaMode).toBe('OPAQUE');

    expect(model.materials[0].alphaCutoff).toBe(0.25);
    expect(model.materials[1].alphaCutoff).not.toBeDefined();
    await model.materials[0].setAlphaCutoff(0.5);
    expect(model.materials[0].alphaCutoff).toBe(0.5);

    expect(model.materials[0].emissiveFactor).toEqual([0.3, 0.4, 0.5]);
    expect(model.materials[1].emissiveFactor).toBeUndefined();
    await model.materials[0].setEmissiveFactor([0.6, 0.7, 0.8]);
    expect(model.materials[0].emissiveFactor).toEqual([0.6, 0.7, 0.8]);
    await model.materials[1].setEmissiveFactor([0, 0, 0]);
    expect(model.materials[1].emissiveFactor).toBeUndefined();


    // Re-use
    await pbr1.setBaseColorTexture(baseColorTex);
    expect(pbr1.baseColorTexture).toBe(baseColorTex);
    expect(pbr0.baseColorTexture).toBe(baseColorTex);
    expect(model.textures.length).toBe(3);

    await pbr1.setMetallicRoughnessTexture(metallicRoughnessTex);
    expect(pbr1.metallicRoughnessTexture).toBe(metallicRoughnessTex);
    expect(pbr0.metallicRoughnessTexture).toBe(metallicRoughnessTex);
    expect(model.textures.length).toBe(3);

    await model.materials[1].setNormalTexture(normalTex0);
    expect(model.materials[0].normalTexture).toBe(normalTex0);
    expect(model.materials[1].normalTexture).toBe(normalTex0);
    expect(model.textures.length).toBe(3);

    // Delete
    await pbr0.setBaseColorTexture(null);
    expect(pbr0.baseColorTexture).toBeNull();
    await pbr0.setMetallicRoughnessTexture(null);
    expect(pbr0.metallicRoughnessTexture).toBeNull();
    await model.materials[0].setNormalTexture(null);
    expect(model.materials[0].normalTexture).toBeNull();

    // Set again
    await pbr0.setBaseColorTexture(baseColorTex);
    expect(pbr0.baseColorTexture).toBe(baseColorTex);
    await pbr0.setMetallicRoughnessTexture(metallicRoughnessTex);
    expect(pbr0.metallicRoughnessTexture).toBe(metallicRoughnessTex);
    await model.materials[0].setNormalTexture(normalTex0);
    expect(model.materials[0].normalTexture).toBe(normalTex0);

    // Add
    await pbr0.setBaseColorTexture('brick.png');
    expect(model.textures.length).toBe(4);
    expect(pbr0.baseColorTexture).not.toBe(baseColorTex);
    expect(pbr0.baseColorTexture!.uri).toEqual('brick.png');

    await pbr0.setMetallicRoughnessTexture('shiny.png');
    expect(model.textures.length).toBe(5);
    expect(pbr0.metallicRoughnessTexture).not.toBe(metallicRoughnessTex);
    expect(pbr0.metallicRoughnessTexture!.uri).toEqual('shiny.png');

    await model.materials[0].setNormalTexture('bumpy.png');
    expect(model.textures.length).toBe(6);
    expect(model.materials[0].normalTexture).not.toBe(normalTex0);
    expect((model.materials[0].normalTexture)!.uri).toEqual('bumpy.png');

    // Make sure nothing else got changed
    expect(baseColorTex!.uri).toEqual('basecolor.png');
    expect(pbr1.baseColorTexture!.uri).toEqual('basecolor.png');
    expect(metallicRoughnessTex!.uri).toEqual('roughness.png');
    expect(pbr1.metallicRoughnessTexture!.uri).toEqual('roughness.png');
    expect(normalTex0.uri).toEqual('normal.png');
    expect(model.materials[1].normalTexture!.uri).toEqual('normal.png');
  });

  it('should correctly load textures with in-buffer images', async () => {
    const {model, buffers} = await createGltfWithTexture();

    expect(model.textures.length).toBe(2);
    const tex0 = model.textures[0];
    expect(tex0.uri).toBeDefined();
    const tex1 = model.textures[1];
    expect(tex1.uri).toBeDefined();

    // Fetch the data and make sure it's the PNG we expect at each uri.
    const actualMat0Buffer =
        await (await (await fetch(tex0.uri)).blob()).arrayBuffer();
    expect(actualMat0Buffer).toEqual(buffers[0]);
    const actualMat1Buffer =
        await (await (await fetch(tex1.uri)).blob()).arrayBuffer();
    expect(actualMat1Buffer).toEqual(buffers[1]);
  });

  it('implements the base color texture API correctly', async () => {
    await testTextureApi(
        {pbrMetallicRoughness: {baseColorTexture: {index: 0}}},
        mat => mat.pbrMetallicRoughness.baseColorTexture,
        (mat, tex) => mat.pbrMetallicRoughness.setBaseColorTexture(tex));
  });

  it('implements the metallic-roughness texture API correctly', async () => {
    await testTextureApi(
        {pbrMetallicRoughness: {metallicRoughnessTexture: {index: 0}}},
        mat => mat.pbrMetallicRoughness.metallicRoughnessTexture,
        (mat, tex) =>
            mat.pbrMetallicRoughness.setMetallicRoughnessTexture(tex));
  });

  it('implements the normal texture API correctly', async () => {
    await testTextureApi(
        {normalTexture: {index: 0, texCoord: 0}},
        mat => mat.normalTexture,
        (mat, tex) => mat.setNormalTexture(tex));
  });

  it('implements the emissive texture API correctly', async () => {
    await testTextureApi(
        {emissiveTexture: {index: 0, texCoord: 0}},
        mat => mat.emissiveTexture,
        (mat, tex) => mat.setEmissiveTexture(tex));
  });

  it('implements the occlusion texture API correctly', async () => {
    await testTextureApi(
        {occlusionTexture: {index: 0, texCoord: 0}},
        mat => mat.occlusionTexture,
        (mat, tex) => mat.setOcclusionTexture(tex));
  });

  it('updates model viewer src upon 3DOM mutations that are not implemented',
     async () => {
       const modelViewer = new DummyModelViewer('orig.glb');
       const downcastedModelViewer =
           (modelViewer as unknown) as ModelViewerElement;

       const model = new GltfModel(
           cloneJson(TEST_GLTF_JSON),
           EXAMPLE_BIN_AS_ARRAY_BUFFER,
           downcastedModelViewer);
       expect(modelViewer.src).toEqual('orig.glb');

       // Set alpha mode. NOTE: Of course, this test will need to change
       // as MV implements more.
       const mat0 = model.materials[0];
       await mat0.setAlphaMode('MASK');
       const newSrc = modelViewer.src;
       expect(newSrc).not.toEqual('orig.glb');

       // Download it, make sure it has the new values
       const newGlbBuffer = await fetchBufferForUri(newSrc!);
       const newModel = GltfModel.fromGlb(newGlbBuffer);
       expect(newModel.materials[0].alphaMode).toEqual('MASK');
     });

  it('exports a valid GLB after deleting a texture', async () => {
    const {model} = await createGltfWithTexture();
    expect(model.textures.length).toBe(2);

    await model.textures[0].delete();
    expect(model.textures.length).toBe(1);
    const glb1Tex = await model.packGlb();

    const newModel = GltfModel.fromGlb(glb1Tex);
    expect(newModel.textures.length).toBe(1);
  });

  it('exports smaller GLB files after deleting a texture', async () => {
    const {model} = await createGltfWithTexture();
    expect(model.textures.length).toBe(2);
    const glb2Tex = await model.packGlb();

    const bytesSavedA =
        expectedBytesSaved(await getByteLengthForUrl(model.textures[0].uri));
    await model.textures[0].delete();
    expect(model.textures.length).toBe(1);
    const glb1Tex = await model.packGlb();
    expect(glb1Tex.byteLength)
        .toBeLessThanOrEqual(glb2Tex.byteLength - bytesSavedA);

    // Do it again to be sure.
    const bytesSavedB =
        expectedBytesSaved(await getByteLengthForUrl(model.textures[0].uri));
    await model.textures[0].delete();
    expect(model.textures.length).toBe(0);
    const glb0Tex = await model.packGlb();
    expect(glb0Tex.byteLength)
        .toBeLessThanOrEqual(glb1Tex.byteLength - bytesSavedB);
  });

  it('exports a smaller GLB file after deleting a *newly added* texture',
     async () => {
       const model = new GltfModel(
           {asset: {generator: 'FBX2glTF', version: '2.0'}, materials: [{}]},
           null);
       const pngUrl = await generatePngObjectUrl('#fff');
       await model.materials[0].pbrMetallicRoughness.setBaseColorTexture(
           pngUrl);
       expect(model.textures.length).toBe(1);
       const glb1Tex = await model.packGlb();

       const bytesSaved =
           expectedBytesSaved(await getByteLengthForUrl(model.textures[0].uri));
       await model.materials[0].pbrMetallicRoughness.setBaseColorTexture(null);
       expect(model.textures.length).toBe(1);
       await model.textures[0].delete();
       expect(model.textures.length).toBe(0);
       const glb0Tex = await model.packGlb();
       expect(glb0Tex.byteLength)
           .toBeLessThanOrEqual(glb1Tex.byteLength - bytesSaved);
     });

  it('deletes textures and updates material references properly', async () => {
    const model = new GltfModel(
        {
          asset: {generator: 'FBX2glTF', version: '2.0'},
          materials: [{}, {}, {}]
        },
        null);

    const tex0Url = await generatePngObjectUrl('#f00');
    const tex1Url = await generatePngObjectUrl('#0f0');
    const tex2Url = await generatePngObjectUrl('#00f');

    await model.materials[0].setEmissiveTexture(tex0Url);
    await model.materials[1].setEmissiveTexture(tex1Url);
    await model.materials[2].setEmissiveTexture(tex2Url);

    const newModel = GltfModel.fromGlb(await model.packGlb());
    expect(newModel.materials.length).toBe(3);
    expect(newModel.textures.length).toBe(3);

    const newTex0 = newModel.materials[0].emissiveTexture;
    const newTex1 = newModel.materials[1].emissiveTexture;
    const newTex2 = newModel.materials[2].emissiveTexture;

    await newTex1!.delete();
    expect(newModel.textures.length).toBe(2);

    await newModel.packGlb();
    expect(newModel.materials[0].emissiveTexture).toBe(newTex0);
    expect(newModel.materials[1].emissiveTexture).toBeNull();
    expect(newModel.materials[2].emissiveTexture).toBe(newTex2);
  });

  it('accurately reports texture used state', async () => {
    const model = new GltfModel(
        {asset: {generator: 'FBX2glTF', version: '2.0'}, materials: [{}]},
        null);
    const tex0Url = await generatePngObjectUrl('#f00');

    await model.materials[0].setEmissiveTexture(tex0Url);
    expect(model.textures[0].isUsed()).toBeTrue();

    await model.materials[0].setEmissiveTexture(null);
    expect(model.textures[0].isUsed()).toBeFalse();

    await model.materials[0].setEmissiveTexture(model.textures[0]);
    expect(model.textures[0].isUsed()).toBeTrue();
  });
});
