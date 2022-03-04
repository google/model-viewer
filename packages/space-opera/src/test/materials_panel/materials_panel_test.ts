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

import {TextureInfo} from '@google/model-viewer/lib/features/scene-graph/api';

import {MaterialPanel} from '../../components/materials_panel/materials_panel.js';
import {ModelViewerPreview} from '../../components/model_viewer_preview/model_viewer_preview.js';
import {dispatchGltfUrl, getTextureId} from '../../components/model_viewer_preview/reducer.js';
import {TexturePicker} from '../../components/shared/texture_picker/texture_picker.js';
import {dispatchReset} from '../../reducers.js';
import {reduxStore} from '../../space_opera_base.js';
import {waitForEvent} from '../utils/test_utils.js';

const TEXTURE_CUBE_GLTF_PATH = '../base/shared-assets/models/textureCubes.gltf';
const CUBES_GLTF_PATH = '../base/shared-assets/models/cubes.gltf';
const TRIANGLE_GLTF_PATH = '../base/shared-assets/models/Triangle.gltf';
const TEXTURE_PATH = 'base/shared-assets/models/ORM.png';

async function checkUpload(
    panel: MaterialPanel,
    texturePicker: TexturePicker,
    textureInfo: TextureInfo) {
  const imageList = texturePicker.shadowRoot!.querySelector('.TextureList')!;
  const listLength = texturePicker.images.length;

  expect(imageList.children.length).toEqual(listLength + 1);

  texturePicker.dispatchEvent(new CustomEvent(
      'texture-uploaded', {detail: {url: TEXTURE_PATH, type: 'image/png'}}));
  await waitForEvent(panel, 'texture-upload-complete');
  await panel.updateComplete;

  // Check that the uri of the texture at material 0 is the newly uploaded
  // texture.
  expect(getTextureId(textureInfo.texture!.source)).toContain(TEXTURE_PATH);
  expect(texturePicker.images.length).toEqual(listLength + 1);
  expect(imageList.children.length).toEqual(listLength + 2);
}

describe('material panel test', () => {
  let preview: ModelViewerPreview;
  let panel: MaterialPanel;

  beforeEach(async () => {
    reduxStore.dispatch(dispatchReset());
    preview = new ModelViewerPreview();
    document.body.appendChild(preview);
    await preview.updateComplete;

    panel = new MaterialPanel();
    panel.isTesting = true;
    document.body.appendChild(panel);

    reduxStore.dispatch(dispatchGltfUrl(TEXTURE_CUBE_GLTF_PATH));
    await preview.loadComplete;
    await panel.updateComplete;
  });

  afterEach(() => {
    document.body.removeChild(panel);
    document.body.removeChild(preview);
  });

  it('selector reflects materials in GLTF, including defaults where undefined',
     async () => {
       panel.selectedMaterialIndex = 0;
       await panel.updateComplete;
       expect(panel.selectedBaseColor).toEqual([1, 0, 1, 1]);
       expect(panel.selectedRoughnessFactor).toEqual(0.2);
       expect(panel.selectedMetallicFactor).toEqual(1);

       panel.selectedMaterialIndex = 1;
       await panel.updateComplete;
       expect(panel.selectedBaseColor).toEqual([1, 1, 0, 1]);
       expect(panel.selectedRoughnessFactor).toEqual(1);
       expect(panel.selectedMetallicFactor).toEqual(1);
     });

  it('Model with variants has visible variant selector', async () => {
    reduxStore.dispatch(dispatchGltfUrl(CUBES_GLTF_PATH));
    await preview.loadComplete;
    await panel.updateComplete;

    const section = panel.shadowRoot?.getElementById('variant-selector');
    expect(section!.style.display).not.toEqual('none');
  });

  it('Model without variants does not have visible variant selector',
     async () => {
       reduxStore.dispatch(dispatchGltfUrl(TRIANGLE_GLTF_PATH));
       await preview.loadComplete;
       await panel.updateComplete;

       const section = panel.shadowRoot?.getElementById('variant-selector');
       expect(section?.style.display).toEqual('none');
     });

  it('selecting a variant changes the material at index 0', async () => {
    reduxStore.dispatch(dispatchGltfUrl(CUBES_GLTF_PATH));
    await preview.loadComplete;
    await panel.updateComplete;

    let expectedMaterialName = '';
    const onVariantApplied = async () => {
      panel.selectedMaterialIndex = 0;
      await panel.updateComplete;
      expect(panel.selectableMaterials[0].name).toEqual(expectedMaterialName);
    };
    preview.addEventListener('variant-applied', onVariantApplied);

    panel.selectedVariant = 'Purple Yellow';
    expectedMaterialName = 'purple';

    panel.selectedVariant = 'Yellow Yellow';
    expectedMaterialName = 'yellow';

    panel.selectedVariant = 'Yellow Red';
    expectedMaterialName = 'red';

    preview.removeEventListener('variant-applied', onVariantApplied);
  });

  it('reflects textures in GLTF', async () => {
    panel.selectedMaterialIndex = 0;
    await panel.updateComplete;

    const texturePicker = panel.shadowRoot!.querySelector('me-texture-picker')!;
    await texturePicker.updateComplete;
    expect(texturePicker!.images.length).toBe(2);
  });

  // Input/click
  it('applies changes to model textures on base color texture picker input',
     async () => {
       panel.selectedMaterialIndex = 1;
       await panel.updateComplete;
       const texturePicker = panel.baseColorTexturePicker!;
       texturePicker.selectedIndex = 0;
       await texturePicker.updateComplete;

       const textureOptionInput =
           texturePicker.shadowRoot!.querySelector('input')!;
       textureOptionInput.dispatchEvent(new Event('click'));
       const expectedTextureId = panel.selectedBaseColorTextureId!;

       const {baseColorTexture} = panel.getMaterial().pbrMetallicRoughness;
       expect(getTextureId(baseColorTexture.texture!.source))
           .toEqual(expectedTextureId);
     });

  it('clears model textures on base color null texture input', async () => {
    panel.selectedMaterialIndex = 1;
    await panel.updateComplete;
    const texturePicker = panel.baseColorTexturePicker!;
    await texturePicker.updateComplete;

    const textureOptionInput =
        texturePicker.shadowRoot!.querySelector('div#nullTextureSquare')!;
    textureOptionInput.dispatchEvent(new Event('click'));

    const {baseColorTexture} = panel.getMaterial().pbrMetallicRoughness;
    expect(baseColorTexture.texture).toEqual(null);
  });

  it('applies changes to model textures on MR texture picker input',
     async () => {
       panel.selectedMaterialIndex = 0;
       await panel.updateComplete;
       const texturePicker = panel.metallicRoughnessTexturePicker!;
       texturePicker.selectedIndex = 1;
       await texturePicker.updateComplete;

       const textureOptionInput =
           texturePicker.shadowRoot!.querySelector('input')!;
       textureOptionInput.dispatchEvent(new Event('click'));
       const expectedTextureId = panel.selectedMetallicRoughnessTextureId!;

       const {metallicRoughnessTexture} =
           panel.getMaterial().pbrMetallicRoughness;
       expect(getTextureId(metallicRoughnessTexture.texture!.source))
           .toEqual(expectedTextureId);
     });

  it('clears model textures on MR null texture input', async () => {
    panel.selectedMaterialIndex = 1;
    await panel.updateComplete;
    const texturePicker = panel.metallicRoughnessTexturePicker!;
    await texturePicker.updateComplete;

    const clearTextureOption =
        texturePicker.shadowRoot!.querySelector('div#nullTextureSquare')!;
    clearTextureOption.dispatchEvent(new Event('click'));

    const {metallicRoughnessTexture} = panel.getMaterial().pbrMetallicRoughness;
    expect(metallicRoughnessTexture.texture).toEqual(null);
  });

  it('normal texture picker input can change and clear texture', async () => {
    panel.selectedMaterialIndex = 0;
    await panel.updateComplete;
    const texturePicker = panel.normalTexturePicker!;
    texturePicker.selectedIndex = 1;
    await texturePicker.updateComplete;

    const textureOptionInput =
        texturePicker.shadowRoot!.querySelector('input')!;
    textureOptionInput.dispatchEvent(new Event('click'));
    const expectedTextureId = panel.selectedNormalTextureId!;

    const {normalTexture} = panel.getMaterial();
    expect(getTextureId(normalTexture.texture!.source))
        .toEqual(expectedTextureId);

    const clearTextureOption =
        texturePicker.shadowRoot!.querySelector('div#nullTextureSquare')!;
    clearTextureOption.dispatchEvent(new Event('click'));

    expect(normalTexture.texture).toEqual(null);
  });

  it('emissive texture picker input can change and clear texture', async () => {
    panel.selectedMaterialIndex = 1;
    await panel.updateComplete;
    const texturePicker = panel.emissiveTexturePicker!;
    texturePicker.selectedIndex = 0;
    await texturePicker.updateComplete;

    const textureOptionInput =
        texturePicker.shadowRoot!.querySelector('input')!;
    textureOptionInput.dispatchEvent(new Event('click'));
    const expectedTextureId = panel.selectedEmissiveTextureId!;

    const {emissiveTexture} = panel.getMaterial();
    expect(getTextureId(emissiveTexture.texture!.source))
        .toEqual(expectedTextureId);

    const clearTextureOption =
        texturePicker.shadowRoot!.querySelector('div#nullTextureSquare')!;
    clearTextureOption.dispatchEvent(new Event('click'));

    expect(emissiveTexture.texture).toEqual(null);
  });

  it('occlusion texture picker input can change and clear texture',
     async () => {
       panel.selectedMaterialIndex = 0;
       await panel.updateComplete;
       const texturePicker = panel.occlusionTexturePicker!;
       texturePicker.selectedIndex = 0;
       await texturePicker.updateComplete;

       const textureOptionInput =
           texturePicker.shadowRoot!.querySelector('input')!;
       textureOptionInput.dispatchEvent(new Event('click'));
       const expectedTextureId = panel.selectedOcclusionTextureId!;

       const {occlusionTexture} = panel.getMaterial();
       expect(getTextureId(occlusionTexture.texture!.source))
           .toEqual(expectedTextureId);

       const clearTextureOption =
           texturePicker.shadowRoot!.querySelector('div#nullTextureSquare')!;
       clearTextureOption.dispatchEvent(new Event('click'));

       expect(occlusionTexture.texture).toEqual(null);
     });

  it('applies changes to model textures on double sided change', async () => {
    panel.selectedMaterialIndex = 0;
    await panel.updateComplete;
    const {doubleSidedCheckbox} = panel;
    expect(doubleSidedCheckbox.checked).toBeFalse();

    doubleSidedCheckbox.checked = true;
    doubleSidedCheckbox.dispatchEvent(new Event('change'));

    expect(panel.getMaterial().getDoubleSided()).toBeTrue();
  });

  // Upload
  it('adds a base color texture to model textures on base color texture upload',
     async () => {
       panel.selectedMaterialIndex = 0;
       await panel.updateComplete;
       await checkUpload(
           panel,
           panel.baseColorTexturePicker!,
           panel.getMaterial().pbrMetallicRoughness.baseColorTexture);
     });

  it('adds a normal texture to model textures on normal texture upload',
     async () => {
       panel.selectedMaterialIndex = 0;
       await panel.updateComplete;
       await checkUpload(
           panel,
           panel.normalTexturePicker!,
           panel.getMaterial().normalTexture);
     });

  it('adds a metallic-roughness texture to model textures on MR texture upload',
     async () => {
       panel.selectedMaterialIndex = 0;
       await panel.updateComplete;
       await checkUpload(
           panel,
           panel.metallicRoughnessTexturePicker!,
           panel.getMaterial().pbrMetallicRoughness.metallicRoughnessTexture);
     });

  it('adds a emissive texture to model textures on emissive texture upload',
     async () => {
       panel.selectedMaterialIndex = 0;
       await panel.updateComplete;
       await checkUpload(
           panel,
           panel.emissiveTexturePicker!,
           panel.getMaterial().emissiveTexture);
     });

  it('adds a occlusion texture to model textures on occlusion texture upload',
     async () => {
       panel.selectedMaterialIndex = 0;
       await panel.updateComplete;
       await checkUpload(
           panel,
           panel.occlusionTexturePicker!,
           panel.getMaterial().occlusionTexture);
     });

  it('applies changes to model textures on emissiveFactor change', async () => {
    panel.selectedMaterialIndex = 0;
    await panel.updateComplete;

    panel.emissiveFactorPicker.selectedColorHex = '#ff0000';
    panel.emissiveFactorPicker.dispatchEvent(new Event('change'));

    const {emissiveFactor} = panel.getMaterial();
    expect(emissiveFactor).toEqual([1, 0, 0]);
  });

  it('applies changes to model textures on alpha mode change', async () => {
    panel.selectedMaterialIndex = 0;
    await panel.updateComplete;

    const {alphaModePicker} = panel;
    expect(alphaModePicker.selectedItem.getAttribute('value')).toBe('OPAQUE');
    const maskItem = alphaModePicker.querySelector(
                         'paper-item[value="MASK"]') as HTMLElement;
    maskItem.click();

    expect(panel.getMaterial().getAlphaMode()).toEqual('MASK');
  });

  it('applies changes to model textures on alpha cutoff change', async () => {
    panel.selectedMaterialIndex = 0;
    await panel.updateComplete;

    const {alphaModePicker, alphaCutoffSlider} = panel;

    const opaqueItem = alphaModePicker.querySelector(
                           'paper-item[value="OPAQUE"]') as HTMLElement;
    opaqueItem.click();

    await panel.updateComplete;

    // Alpha cutoff should not be present on 'OPAQUE' alpha mode
    expect(alphaCutoffSlider.parentElement?.parentElement?.style.display)
        .toBe('none');

    const maskItem = alphaModePicker.querySelector(
                         'paper-item[value="MASK"]') as HTMLElement;
    maskItem.click();

    await panel.updateComplete;

    expect(alphaCutoffSlider.parentElement?.parentElement?.style.display)
        .toBe('');
    expect(alphaCutoffSlider.value).toBe(0.5);
    expect(panel.getMaterial().getAlphaCutoff()).toEqual(0.5);

    alphaCutoffSlider.value = 1;
    alphaCutoffSlider.dispatchEvent(new Event('change'));

    expect(panel.getMaterial().getAlphaCutoff()).toEqual(1);
  });
});
