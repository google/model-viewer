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


import './materials_panel.js';

import {GltfModel} from '@google/model-viewer-editing-adapter/lib/main.js'
import {dispatchSetAlphaCutoff} from '../../redux/edit_dispatchers.js';
import {dispatchGltfAndEdits, reduxStore} from '../../redux/space_opera_base.js';
import {Dropdown} from '../shared/dropdown/dropdown.js';
import {SliderWithInputElement} from '../shared/slider_with_input/slider_with_input.js';

import {MaterialPanel} from './materials_panel.js';


fdescribe('material panel test', () => {
  let panel: MaterialPanel;
  let gltf: GltfModel;


  async function createGltfWithTextures(TEST_GLTF_JSON: any) {
    const model = new GltfModel(TEST_GLTF_JSON, null);
    const pbrApi0 = (await model.materials)[0].pbrMetallicRoughness;
    await pbrApi0.setBaseColorFactor([0.8, 0.8, 0.2, 1.0]);
    await pbrApi0.setRoughnessFactor(0.9);
    await pbrApi0.setMetallicFactor(0.4);

    const matApi1 = (await model.materials)[1];
    await matApi1.setNormalTexture('normal.png');
    await matApi1.pbrMetallicRoughness.setBaseColorTexture(
        'originalTexture.png');
    await matApi1.pbrMetallicRoughness.setMetallicRoughnessTexture(
        'metallic.png');
    await matApi1.setEmissiveTexture('emissive.png');
    await matApi1.setOcclusionTexture('occlusion.png');
    return model;
  }

  const TEST_GLTF_JSON = {
    asset: {generator: 'FBX2glTF', version: '2.0'},
    samplers: [{magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497}],
    images: [
      {uri: 'originalTexture.png'},
      {uri: 'metallic.png'},
      {uri: 'normal.png'}
    ],
    textures: [
      {source: 0, sampler: 0},
      {source: 1, sampler: 0},
      {source: 2, sampler: 0}
    ],
    materials: [{name: 'no tex'}, {name: 'with tex'}],
  };

  beforeEach(async () => {
    panel = new MaterialPanel();
    document.body.appendChild(panel);

    await panel.updateComplete;

    gltf = await createGltfWithTextures(TEST_GLTF_JSON);
    await dispatchGltfAndEdits(gltf);
  });

  afterEach(() => {
    document.body.removeChild(panel);
  });

  it('selector reflects materials in GLTF', async () => {
    panel.selectedMaterialId = 0;
    await panel.updateComplete;
    expect(panel.selectedBaseColor).toEqual([0.8, 0.8, 0.2, 1.0]);
    expect(panel.selectedRoughnessFactor).toEqual(0.9);
    expect(panel.selectedMetallicFactor).toEqual(0.4);
  });

  it('reflects textures in GLTF', async () => {
    await panel.updateComplete;
    const actualTexturesById = panel.texturesById!.values().next().value;
    expect(actualTexturesById).toBeDefined();
    expect(actualTexturesById.uri).toBe('originalTexture.png');

    const texturePicker = panel.shadowRoot!.querySelector('me-texture-picker')!;
    await texturePicker.updateComplete;
    expect(texturePicker!.images.length).toBe(5);
  });

  // Input/click
  it('applies changes to model textures on base color texture picker input',
     async () => {
       panel.selectedMaterialId = 0;
       await panel.updateComplete;
       const texturePicker = panel.baseColorTexturePicker!;
       texturePicker.selectedIndex = 0;
       await texturePicker.updateComplete;

       const textureOptionInput =
           texturePicker.shadowRoot!.querySelector('input')!;
       textureOptionInput.dispatchEvent(new Event('click'));
       const expectedTextureId = panel.selectedBaseColorTextureId;

       expect(reduxStore.getState().edits.materials[0].baseColorTextureId)
           .toEqual(
               expectedTextureId,
           );
     });

  it('clears model textures on base color null texture input', async () => {
    panel.selectedMaterialId = 1;
    await panel.updateComplete;
    const texturePicker = panel.baseColorTexturePicker!;
    await texturePicker.updateComplete;

    const textureOptionInput =
        texturePicker.shadowRoot!.querySelector('div#nullTextureSquare')!;
    textureOptionInput.dispatchEvent(new Event('click'));

    expect(reduxStore.getState().edits.materials[1].baseColorTextureId)
        .toEqual(undefined);
  });

  it('applies changes to model textures on MR texture picker input',
     async () => {
       panel.selectedMaterialId = 0;
       await panel.updateComplete;
       const texturePicker = panel.metallicRoughnessTexturePicker!;
       texturePicker.selectedIndex = 1;
       await texturePicker.updateComplete;

       const textureOptionInput =
           texturePicker.shadowRoot!.querySelector('input')!;
       textureOptionInput.dispatchEvent(new Event('click'));
       const expectedTextureId = panel.selectedMetallicRoughnessTextureId;

       expect(
           reduxStore.getState().edits.materials[0].metallicRoughnessTextureId)
           .toEqual(expectedTextureId);
     });

  it('clears model textures on MR null texture input', async () => {
    const texturePicker = panel.metallicRoughnessTexturePicker!;
    panel.selectedMaterialId = 1;
    await panel.updateComplete;

    const clearTextureOption =
        texturePicker.shadowRoot!.querySelector('div#nullTextureSquare')!;
    clearTextureOption.dispatchEvent(new Event('click'));

    expect(reduxStore.getState().edits.materials[1].metallicRoughnessTextureId)
        .not.toBeDefined();
  });

  it('applies changes to model textures on normal texture picker input',
     async () => {
       panel.selectedMaterialId = 0;
       await panel.updateComplete;
       const texturePicker = panel.normalTexturePicker!;
       texturePicker.selectedIndex = 2;
       await texturePicker.updateComplete;

       const textureOptionInput =
           texturePicker.shadowRoot!.querySelector('input')!;
       textureOptionInput.dispatchEvent(new Event('click'));
       const expectedTextureId = panel.selectedNormalTextureId;

       expect(reduxStore.getState().edits.materials[0].normalTextureId)
           .toEqual(expectedTextureId);
     });

  it('clears model textures on normal null texture input', async () => {
    panel.selectedMaterialId = 1;
    await panel.updateComplete;
    const texturePicker = panel.normalTexturePicker!;

    const clearTextureOption =
        texturePicker.shadowRoot!.querySelector('div#nullTextureSquare')!;
    clearTextureOption.dispatchEvent(new Event('click'));

    expect(reduxStore.getState().edits.materials[1].normalTextureId)
        .not.toBeDefined();
  });

  it('applies changes to model textures on emissive texture picker input',
     async () => {
       panel.selectedMaterialId = 0;
       await panel.updateComplete;
       const texturePicker = panel.emissiveTexturePicker!;
       texturePicker.selectedIndex = 2;
       await texturePicker.updateComplete;

       const textureOptionInput =
           texturePicker.shadowRoot!.querySelector('input')!;
       textureOptionInput.dispatchEvent(new Event('click'));
       const expectedTextureId = panel.selectedEmissiveTextureId;

       expect(reduxStore.getState().edits.materials[0].emissiveTextureId)
           .toEqual(expectedTextureId);
     });

  it('clears model textures on emissive null texture input', async () => {
    panel.selectedMaterialId = 1;
    await panel.updateComplete;
    const texturePicker = panel.emissiveTexturePicker!;

    const clearTextureOption =
        texturePicker.shadowRoot!.querySelector('div#nullTextureSquare')!;
    clearTextureOption.dispatchEvent(new Event('click'));

    expect(reduxStore.getState().edits.materials[1].emissiveTextureId)
        .not.toBeDefined();
  });

  it('applies changes to model textures on occlusion texture picker input',
     async () => {
       panel.selectedMaterialId = 0;
       await panel.updateComplete;
       const texturePicker = panel.occlusionTexturePicker!;
       texturePicker.selectedIndex = 2;
       await texturePicker.updateComplete;

       const textureOptionInput =
           texturePicker.shadowRoot!.querySelector('input')!;
       textureOptionInput.dispatchEvent(new Event('click'));
       const expectedTextureId = panel.selectedOcclusionTextureId;

       expect(reduxStore.getState().edits.materials[0].occlusionTextureId)
           .toEqual(expectedTextureId);
     });

  it('clears model textures on occlusion null texture input', async () => {
    panel.selectedMaterialId = 1;
    await panel.updateComplete;
    const texturePicker = panel.occlusionTexturePicker!;

    const clearTextureOption =
        texturePicker.shadowRoot!.querySelector('div#nullTextureSquare')!;
    clearTextureOption.dispatchEvent(new Event('click'));

    expect(reduxStore.getState().edits.materials[1].occlusionTextureId)
        .not.toBeDefined();
  });

  it('applies changes to model textures on double sided change', async () => {
    panel.selectedMaterialId = 0;
    await panel.updateComplete;
    const doubleSidedCheckbox =
        panel.shadowRoot!.querySelector('me-checkbox#doubleSidedCheckbox') as
        HTMLInputElement;
    expect(doubleSidedCheckbox.checked).toBeFalse();

    doubleSidedCheckbox.checked = true;
    doubleSidedCheckbox.dispatchEvent(new Event('change'));

    expect(reduxStore.getState().edits.materials[0].doubleSided).toEqual(true);
  });

  // Upload
  it('adds a base color texture to model textures on base color texture upload',
     async () => {
       panel.selectedMaterialId = 0;

       await panel.updateComplete;
       const texturePicker = panel.baseColorTexturePicker!;
       texturePicker.dispatchEvent(
           new CustomEvent('texture-uploaded', {detail: 'fooUrl'}));
       await panel.updateComplete;

       // Check that the uri of the texture at material 0 is the newly uploaded
       // texture.
       expect(
           reduxStore.getState()
               .edits.texturesById
               .get(reduxStore.getState().edits.materials[0].baseColorTextureId!
                    )!.uri)
           .toEqual('fooUrl');
     });

  it('adds a normal texture to model textures on normal texture upload',
     async () => {
       panel.selectedMaterialId = 0;

       await panel.updateComplete;
       const texturePicker = panel.normalTexturePicker!;
       texturePicker.dispatchEvent(
           new CustomEvent('texture-uploaded', {detail: 'fooUrl'}));
       await panel.updateComplete;

       // Check that the uri of the texture at material 0 is the newly uploaded
       // texture.
       expect(reduxStore.getState()
                  .edits.texturesById
                  .get(reduxStore.getState().edits.materials[0].normalTextureId!
                       )!.uri)
           .toEqual('fooUrl');
     });

  it('adds a metallic-roughness texture to model textures on MR texture upload',
     async () => {
       panel.selectedMaterialId = 0;

       await panel.updateComplete;
       const texturePicker = panel.metallicRoughnessTexturePicker!;
       texturePicker.dispatchEvent(
           new CustomEvent('texture-uploaded', {detail: 'fooUrl'}));
       await panel.updateComplete;

       // Check that the uri of the texture at material 0 is the newly uploaded
       // texture.
       expect(reduxStore.getState()
                  .edits.texturesById
                  .get(reduxStore.getState()
                           .edits.materials[0]
                           .metallicRoughnessTextureId!)!.uri)
           .toEqual('fooUrl');
     });

  it('adds a emissive texture to model textures on emissive texture upload',
     async () => {
       panel.selectedMaterialId = 0;

       await panel.updateComplete;
       const texturePicker = panel.emissiveTexturePicker!;
       texturePicker.dispatchEvent(
           new CustomEvent('texture-uploaded', {detail: 'fooUrl'}));
       await panel.updateComplete;

       // Check that the uri of the texture at material 0 is the newly uploaded
       // texture.
       expect(
           reduxStore.getState()
               .edits.texturesById
               .get(reduxStore.getState().edits.materials[0].emissiveTextureId!
                    )!.uri)
           .toEqual('fooUrl');
     });

  it('adds a occlusion texture to model textures on occlusion texture upload',
     async () => {
       panel.selectedMaterialId = 0;

       await panel.updateComplete;
       const texturePicker = panel.occlusionTexturePicker!;
       texturePicker.dispatchEvent(
           new CustomEvent('texture-uploaded', {detail: 'fooUrl'}));
       await panel.updateComplete;

       // Check that the uri of the texture at material 0 is the newly uploaded
       // texture.
       expect(
           reduxStore.getState()
               .edits.texturesById
               .get(reduxStore.getState().edits.materials[0].occlusionTextureId!
                    )!.uri)
           .toEqual('fooUrl');
     });

  it('applies changes to model textures on emissiveFactor change', async () => {
    panel.selectedMaterialId = 0;
    await panel.updateComplete;

    panel.emissiveFactorPicker.selectedColorHex = '#ff0000';
    panel.emissiveFactorPicker.dispatchEvent(new Event('change'));
    expect(reduxStore.getState().edits.materials[0].emissiveFactor)
        .toEqual([1, 0, 0]);
  });

  it('applies changes to model textures on alpha mode change', async () => {
    panel.selectedMaterialId = 0;
    await panel.updateComplete;

    const dropdown = panel.shadowRoot!.querySelector(
                         'me-dropdown#alpha-mode-picker') as Dropdown;
    expect(dropdown.selectedItem.getAttribute('value')).toBe('OPAQUE');
    const maskItem =
        dropdown.querySelector('paper-item[value="MASK"]') as HTMLElement;
    maskItem.click();
    expect(reduxStore.getState().edits.materials[0].alphaMode).toEqual('MASK');
  });

  it('applies changes to model textures on alpha cutoff change', async () => {
    panel.selectedMaterialId = 0;
    await panel.updateComplete;

    const dropdown = panel.shadowRoot!.querySelector(
                         'me-dropdown#alpha-mode-picker') as Dropdown;

    const opaqueItem =
        dropdown.querySelector('paper-item[value="OPAQUE"]') as HTMLElement;
    opaqueItem.click();

    await panel.updateComplete;

    // Alpha cutoff should not be present on 'OPAQUE' alpha mode
    expect(panel.shadowRoot!.querySelector('me-slider-with-input#alpha-cutoff'))
        .toBe(null);

    const maskItem =
        dropdown.querySelector('paper-item[value="MASK"]') as HTMLElement;
    maskItem.click();

    await panel.updateComplete;

    const alphaCutoffSlider =
        panel.shadowRoot!.querySelector('me-slider-with-input#alpha-cutoff') as
        SliderWithInputElement;
    expect(alphaCutoffSlider).toBeDefined();
    expect(alphaCutoffSlider.value).toBe(0.5);

    alphaCutoffSlider.value = 1;
    alphaCutoffSlider.dispatchEvent(new Event('change'));

    expect(reduxStore.getState().edits.materials[0].alphaCutoff).toEqual(1);

    dispatchSetAlphaCutoff({id: 0, alphaCutoff: 0});
    await panel.updateComplete;

    expect(alphaCutoffSlider.value).toEqual(0);
  });
});
