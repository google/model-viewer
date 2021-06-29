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

import '../shared/checkbox/checkbox.js';
import '../shared/color_picker/color_picker.js';
import '../shared/dropdown/dropdown.js';
import '../shared/editor_panel/editor_panel.js';
import '../shared/expandable_content/expandable_tab.js';
import '../shared/section_row/section_row.js';
import '../shared/slider_with_input/slider_with_input.js';
import '../shared/texture_picker/texture_picker.js';
import '@polymer/paper-item';
import '@polymer/paper-slider';
import '@material/mwc-icon-button';

import {RGB, RGBA} from '@google/model-viewer/lib/model-viewer';
import {customElement, html, internalProperty, property, query} from 'lit-element';
import * as color from 'ts-closure-library/lib/color/color';  // from //third_party/javascript/closure/color

import {GLTF} from '../../../../model-viewer/lib/three-components/gltf-instance/gltf-2.0.js';
import {reduxStore} from '../../space_opera_base.js';
import {State} from '../../types.js';
import {ConnectedLitElement} from '../connected_lit_element/connected_lit_element.js';
import {getGltfUrl, getModel, getModelViewer, getTextureId} from '../model_viewer_preview/reducer.js';
import {ColorPicker} from '../shared/color_picker/color_picker.js';
import {Dropdown} from '../shared/dropdown/dropdown.js';
import {SliderWithInputElement} from '../shared/slider_with_input/slider_with_input.js';
import {TexturePicker} from '../shared/texture_picker/texture_picker.js';
import {createSafeObjectUrlFromUnsafe, SafeObjectUrl} from '../utils/create_object_url.js';
import {ALPHA_BLEND_MODES, DEFAULT_EMISSIVE_FACTOR} from '../utils/gltf_constants.js';
import {checkFinite} from '../utils/reducer_utils.js';

import {Material, TexturesById} from './material_state.js';
import {styles} from './materials_panel.css.js';
import {dispatchAddEmissiveTexture, dispatchAddNormalTexture, dispatchAddOcclusionTexture, dispatchBaseColorTexture, dispatchDoubleSided, dispatchEmissiveTexture, dispatchMaterialBaseColor, dispatchMetallicRoughnessTexture, dispatchNormalTexture, dispatchOcclusionTexture, dispatchSetAlphaCutoff, dispatchSetAlphaMode, dispatchSetEmissiveFactor, getEditsMaterials, getEditsTextures, getOrigEdits} from './reducer.js';


/** Material panel. */
@customElement('me-materials-panel')
export class MaterialPanel extends ConnectedLitElement {
  static styles = styles;

  @property({type: Number}) selectedMaterialIndex?: number;

  @internalProperty() materials: Material[] = [];
  @internalProperty() originalMaterials: Material[] = [];
  @internalProperty() texturesById?: TexturesById;

  @internalProperty() thumbnailsById?: Map<string, string>;
  @internalProperty() thumbnailUrls: string[] = [];
  @internalProperty() thumbnailIds: string[] = [];
  @internalProperty() originalGltf?: GLTF;

  @internalProperty() isNewModel: boolean = true;
  @internalProperty() currentGltfUrl: string = '';
  @internalProperty() isTesting: boolean = false;
  @internalProperty() isInterpolating: boolean = false;

  @query('me-color-picker#base-color-picker') baseColorPicker!: ColorPicker;
  @query('me-slider-with-input#roughness-factor')
  roughnessFactorSlider!: SliderWithInputElement;
  @query('me-slider-with-input#metallic-factor')
  metallicFactorSlider!: SliderWithInputElement;
  @query('me-dropdown#material-selector') materialSelector?: Dropdown;
  @query('me-texture-picker#base-color-texture-picker')
  baseColorTexturePicker?: TexturePicker;
  @query('me-texture-picker#metallic-roughness-texture-picker')
  metallicRoughnessTexturePicker?: TexturePicker;
  @query('me-texture-picker#normal-texture-picker')
  normalTexturePicker?: TexturePicker;
  @query('me-color-picker#emissive-factor-picker')
  emissiveFactorPicker!: ColorPicker;
  @query('me-texture-picker#emissive-texture-picker')
  emissiveTexturePicker?: TexturePicker;
  @query('me-texture-picker#occlusion-texture-picker')
  occlusionTexturePicker?: TexturePicker;
  @query('me-dropdown#alpha-mode-picker') alphaModePicker?: Dropdown;
  @query('me-slider-with-input#alpha-cutoff')
  alphaCutoffSlider?: SliderWithInputElement;

  private safeTextureUrls: SafeObjectUrl[] = [];
  private safeUrlIds: string[] = [];
  private safeTextureUrlsDirty = false;

  stateChanged(state: State) {
    this.materials = getEditsMaterials(state);
    this.originalMaterials = getOrigEdits(state).materials;

    if (this.selectedMaterialIndex !== undefined) {
      const id = this.selectedMaterialIndex;
      if (id < 0 || id >= this.materials.length) {
        this.selectedMaterialIndex = 0;
      }
    }

    const model = getModel(state);
    this.thumbnailsById = model.thumbnailsById;
    this.thumbnailUrls = [...this.thumbnailsById.values()];
    this.thumbnailIds = [...this.thumbnailsById.keys()];
    this.originalGltf = model.originalGltf;

    if (this.texturesById !== getEditsTextures(state)) {
      this.texturesById = getEditsTextures(state);
      this.safeTextureUrlsDirty = true;
    }

    // If a new model is loaded, don't interpolate material
    const gltfUrl = getGltfUrl(state);
    if (gltfUrl !== undefined && this.currentGltfUrl !== getGltfUrl(state)) {
      this.isNewModel = true;
      this.currentGltfUrl = gltfUrl;
    }
  }

  getMaterial(index: number) {
    return getModelViewer()?.model?.materials[index];
  }

  getOriginalMaterial(index: number) {
    return this.originalGltf!.materials![index];
  }

  rgbaToHex(rgba: RGBA): string {
    const selectedColorRgb =
        rgba.slice(0, 3).map((color: number) => Math.round(color * 255));
    return color.rgbArrayToHex(selectedColorRgb);
  }

  async performUpdate() {
    if (this.safeTextureUrlsDirty) {
      // Clear this *before* the async call, in case someone else sets it again.
      this.safeTextureUrlsDirty = false;
      await this.updateTextureUrls();
    }
    await super.performUpdate();
  }

  private async updateTextureUrls() {
    // Work with local variables to avoid possible race conditions.
    const newUrls: SafeObjectUrl[] = [];
    const safeUrlIds: string[] = [];
    if (this.texturesById) {
      for (const [id, texture] of this.texturesById) {
        const newUrl = await createSafeObjectUrlFromUnsafe(texture.uri);
        newUrls.push(newUrl);
        safeUrlIds.push(id);
      }
    }
    this.safeTextureUrls = newUrls;
    this.safeUrlIds = safeUrlIds;
  }

  /* Interpolate base color as curr approaches duration */
  getInterpolatedColor(original: RGBA, curr: number, duration: number): RGBA {
    const INTERP_COLOR = [0, 0, 0];
    // determine how much of interp color to use
    const interpRatio = (duration - curr) / duration;
    const originalRatio = 1 - interpRatio;
    return [
      (interpRatio * INTERP_COLOR[0]) + (originalRatio * original[0]),
      (interpRatio * INTERP_COLOR[1]) + (originalRatio * original[1]),
      (interpRatio * INTERP_COLOR[2]) + (originalRatio * original[2]),
      original[3],
    ];
  }

  getInterpolatedEmissive(original: RGB, curr: number, duration: number): RGB {
    const INTERP_COLOR = [1, 0, 0];
    const interpRatio = (duration - curr) / duration;
    const originalRatio = 1 - interpRatio;
    return [
      (interpRatio * INTERP_COLOR[0]) + (originalRatio * original[0]),
      (interpRatio * INTERP_COLOR[1]) + (originalRatio * original[1]),
      (interpRatio * INTERP_COLOR[2]) + (originalRatio * original[2]),
    ];
  }

  isLegalIndex() {
    return (
        this.selectedMaterialIndex! < this.materials.length &&
        this.selectedMaterialIndex! >= 0)
  }

  // Logic for interpolating from red emissive factor to the original.
  interpolateMaterial() {
    this.isInterpolating = true;
    const index = this.selectedMaterialIndex!;
    const id = this.selectedMaterialIndex!;
    const originalBaseColor = this.materials[index].baseColorFactor;
    const originalEmissiveFactor = this.materials[index].emissiveFactor;

    let start = -1;
    const DURATION = 1600;  // in milliseconds

    const interpolateStep = (timestamp: number) => {
      // New model is loaded mid interpolation
      if (!this.isLegalIndex()) {
        return;
      }
      if (start === -1) {
        start = timestamp;
      }
      if (timestamp - start <= DURATION) {
        const baseColorFactor = this.getInterpolatedColor(
            originalBaseColor, timestamp - start, DURATION);
        reduxStore.dispatch(dispatchMaterialBaseColor(
            getEditsMaterials(reduxStore.getState()),
            {index, baseColorFactor}));
        const emissiveFactor = this.getInterpolatedEmissive(
            originalEmissiveFactor, timestamp - start, DURATION);
        reduxStore.dispatch(dispatchSetEmissiveFactor(
            getEditsMaterials(reduxStore.getState()), {id, emissiveFactor}));
        requestAnimationFrame(interpolateStep);
      } else {
        const baseColorFactor = originalBaseColor;
        reduxStore.dispatch(dispatchMaterialBaseColor(
            getEditsMaterials(reduxStore.getState()),
            {index, baseColorFactor}));
        const emissiveFactor = originalEmissiveFactor;
        reduxStore.dispatch(dispatchSetEmissiveFactor(
            getEditsMaterials(reduxStore.getState()), {id, emissiveFactor}));
        this.isInterpolating = false;
      }
    };
    requestAnimationFrame(interpolateStep);
  }

  onSelectMaterial() {
    const value = this.materialSelector?.selectedItem?.getAttribute('value');
    if (value !== undefined) {
      this.selectedMaterialIndex = Number(value);
      checkFinite(this.selectedMaterialIndex);
      // Don't interpolate on the initial model load.
      if (!this.isNewModel && this.isLegalIndex() && !this.isTesting &&
          !this.isInterpolating) {
        this.interpolateMaterial();
      }
      this.isNewModel = false;
    }
  }

  renderSelectMaterialTab() {
    return html`
    <me-expandable-tab tabName="Selected Material" .open=${true} .sticky=${
        true}>
      <me-dropdown
        .selectedIndex=${this.selectedMaterialIndex || 0}
        slot="content"
        id="material-selector"
        @select=${this.onSelectMaterial}
        >${
        getModelViewer()?.model?.materials.map(
            (material, id) => html`<paper-item value="${id}">(${id}) ${
                material.name ? material.name :
                                'Unnamed Material'}</paper-item>`)}
      </me-dropdown>
    </me-expandable-tab>
    `;
  }

  get safeSelectedMaterialId() {
    if (this.selectedMaterialIndex === undefined) {
      throw new Error('No material selected');
    }
    return this.selectedMaterialIndex;
  }

  get selectedBaseColor(): RGBA {
    const id = this.selectedMaterialIndex;
    if (id === undefined) {
      throw new Error('No material selected');
    }
    const alphaFactor = this.materials[id].baseColorFactor[3];
    const selectedColor = color.hexToRgb(this.baseColorPicker.selectedColorHex);
    // color.hexToRgb returns RGB vals from 0-255, but glTF expects a val from
    // 0-1.
    return [
      selectedColor[0] / 255,
      selectedColor[1] / 255,
      selectedColor[2] / 255,
      alphaFactor
    ];
  }

  get selectedEmissiveFactor(): RGB {
    const id = this.selectedMaterialIndex;
    if (id === undefined) {
      throw new Error('No material selected');
    }
    const selectedColor =
        color.hexToRgb(this.emissiveFactorPicker.selectedColorHex);
    // color.hexToRgb returns RGB vals from 0-255, but glTF expects a val from
    // 0-1.
    return [
      selectedColor[0] / 255,
      selectedColor[1] / 255,
      selectedColor[2] / 255
    ];
  }

  get selectedRoughnessFactor(): number {
    return checkFinite(Number(this.roughnessFactorSlider.value));
  }

  get selectedMetallicFactor(): number {
    return checkFinite(Number(this.metallicFactorSlider.value));
  }

  get selectedAlphaCutoff(): number {
    if (!this.alphaCutoffSlider) {
      throw new Error('Alpha cutoff slider doesn\'t exist.');
    }
    return checkFinite(Number(this.alphaCutoffSlider.value));
  }

  onBaseColorChange() {
    if (this.selectedMaterialIndex === undefined) {
      throw new Error('No material selected');
    }
    this.getMaterial(this.selectedMaterialIndex)!.pbrMetallicRoughness
        .setBaseColorFactor(this.selectedBaseColor);
  }

  onRoughnessChange() {
    if (this.selectedMaterialIndex === undefined) {
      throw new Error('No material selected');
    }
    this.getMaterial(this.selectedMaterialIndex)!.pbrMetallicRoughness
        .setRoughnessFactor(this.selectedRoughnessFactor);
  }

  onMetallicChange() {
    if (this.selectedMaterialIndex == null) {
      throw new Error('No material selected');
    }
    this.getMaterial(this.selectedMaterialIndex)!.pbrMetallicRoughness
        .setMetallicFactor(this.selectedMetallicFactor);
  }

  onDoubleSidedChange(event: Event) {
    if (this.selectedMaterialIndex === undefined) {
      throw new Error('No material selected');
    }
    const id = this.selectedMaterialIndex;
    const doubleSided = (event.target as HTMLInputElement).checked;
    reduxStore.dispatch(dispatchDoubleSided(
        getEditsMaterials(reduxStore.getState()), {id, doubleSided}));
  }

  get selectedBaseColorTextureId(): string|undefined {
    if (!this.baseColorTexturePicker) {
      throw new Error('Texture picker is not defined');
    }
    if (this.baseColorTexturePicker.selectedIndex === undefined) {
      return undefined;
    }
    return this.safeUrlIds[this.baseColorTexturePicker.selectedIndex];
  }

  get selectedMetallicRoughnessTextureId(): string|null {
    if (!this.metallicRoughnessTexturePicker) {
      throw new Error('Texture picker is not defined');
    }
    if (this.metallicRoughnessTexturePicker.selectedIndex == null) {
      return null;
    }
    return this.thumbnailIds[this.metallicRoughnessTexturePicker.selectedIndex];
  }

  get selectedNormalTextureId(): string|undefined {
    if (!this.normalTexturePicker) {
      throw new Error('Texture picker is not defined');
    }
    if (this.normalTexturePicker.selectedIndex === undefined) {
      return undefined;
    }
    return this.safeUrlIds[this.normalTexturePicker.selectedIndex];
  }

  get selectedEmissiveTextureId(): string|undefined {
    if (!this.emissiveTexturePicker) {
      throw new Error('Texture picker is not defined');
    }
    if (this.emissiveTexturePicker.selectedIndex === undefined) {
      return undefined;
    }
    return this.safeUrlIds[this.emissiveTexturePicker.selectedIndex];
  }

  get selectedOcclusionTextureId(): string|undefined {
    if (!this.occlusionTexturePicker) {
      throw new Error('Texture picker is not defined');
    }
    if (this.occlusionTexturePicker.selectedIndex === undefined) {
      return undefined;
    }
    return this.safeUrlIds[this.occlusionTexturePicker.selectedIndex];
  }

  onBaseColorTextureChange() {
    if (this.selectedMaterialIndex === undefined) {
      throw new Error('No material selected');
    }
    const textureId = this.selectedBaseColorTextureId;
    this.getMaterial(this.selectedMaterialIndex)
        ?.pbrMetallicRoughness.baseColorTexture?.texture.source.setURI(
            textureId!);
  }

  onBaseColorTextureUpload(event: CustomEvent) {
    if (this.selectedMaterialIndex === undefined) {
      throw new Error('No material selected');
    }
    const uri = event.detail;
    this.getMaterial(this.selectedMaterialIndex)
        ?.pbrMetallicRoughness.baseColorTexture?.texture.source.setURI(uri);
  }

  onMetallicRoughnessTextureChange() {
    if (this.selectedMaterialIndex === undefined) {
      throw new Error('No material selected');
    }
    const textureId = this.selectedMetallicRoughnessTextureId;
    this.getMaterial(this.selectedMaterialIndex)
        ?.pbrMetallicRoughness.metallicRoughnessTexture?.texture.source.setURI(
            textureId!);
  }

  onMetallicRoughnessTextureUpload(event: CustomEvent) {
    if (this.selectedMaterialIndex === undefined) {
      throw new Error('No material selected');
    }
    const uri = event.detail;
    this.getMaterial(this.selectedMaterialIndex)
        ?.pbrMetallicRoughness.metallicRoughnessTexture?.texture.source.setURI(
            uri);
  }

  onNormalTextureChange() {
    if (this.selectedMaterialIndex === undefined) {
      throw new Error('No material selected');
    }

    const id = this.selectedMaterialIndex;
    const textureId = this.selectedNormalTextureId;
    reduxStore.dispatch(dispatchNormalTexture(
        getEditsMaterials(reduxStore.getState()), {id, textureId}));
  }

  onNormalTextureUpload(event: CustomEvent) {
    if (this.selectedMaterialIndex === undefined) {
      throw new Error('No material selected');
    }

    const id = this.selectedMaterialIndex;
    const uri = event.detail;
    reduxStore.dispatch(dispatchAddNormalTexture(
        getEditsMaterials(reduxStore.getState()),
        getEditsTextures(reduxStore.getState()),
        {id, uri}));
  }

  onEmissiveTextureChange() {
    if (this.selectedMaterialIndex === undefined) {
      throw new Error('No material selected');
    }

    const id = this.selectedMaterialIndex;
    const textureId = this.selectedEmissiveTextureId;
    reduxStore.dispatch(dispatchEmissiveTexture(
        getEditsMaterials(reduxStore.getState()), {id, textureId}));
  }

  onEmissiveTextureUpload(event: CustomEvent) {
    if (this.selectedMaterialIndex === undefined) {
      throw new Error('No material selected');
    }

    const id = this.selectedMaterialIndex;
    const uri = event.detail;
    reduxStore.dispatch(dispatchAddEmissiveTexture(
        getEditsMaterials(reduxStore.getState()),
        getEditsTextures(reduxStore.getState()),
        {id, uri}));
  }

  onEmissiveFactorChanged() {
    if (this.selectedMaterialIndex === undefined) {
      throw new Error('No material selected');
    }

    const id = this.selectedMaterialIndex;
    const emissiveFactor = this.selectedEmissiveFactor;
    reduxStore.dispatch(dispatchSetEmissiveFactor(
        getEditsMaterials(reduxStore.getState()), {id, emissiveFactor}));
  }

  onOcclusionTextureChange() {
    if (this.selectedMaterialIndex === undefined) {
      throw new Error('No material selected');
    }

    const id = this.selectedMaterialIndex;
    const textureId = this.selectedOcclusionTextureId;
    reduxStore.dispatch(dispatchOcclusionTexture(
        getEditsMaterials(reduxStore.getState()), {id, textureId}));
  }

  onOcclusionTextureUpload(event: CustomEvent) {
    if (this.selectedMaterialIndex === undefined) {
      throw new Error('No material selected');
    }

    const id = this.selectedMaterialIndex;
    const uri = event.detail;
    reduxStore.dispatch(dispatchAddOcclusionTexture(
        getEditsMaterials(reduxStore.getState()),
        getEditsTextures(reduxStore.getState()),
        {id, uri}));
  }

  onAlphaModeSelect() {
    if (this.selectedMaterialIndex === undefined) {
      throw new Error('No material selected');
    }

    const selectedMode =
        this.alphaModePicker?.selectedItem?.getAttribute('value');

    if (!selectedMode) {
      return;
    }

    reduxStore.dispatch(
        dispatchSetAlphaMode(getEditsMaterials(reduxStore.getState()), {
          id: this.selectedMaterialIndex,
          alphaMode: selectedMode,
        }));
  }

  onAlphaCutoffChange() {
    if (this.selectedMaterialIndex === undefined) {
      throw new Error('No material selected');
    }

    reduxStore.dispatch(
        dispatchSetAlphaCutoff(getEditsMaterials(reduxStore.getState()), {
          id: this.selectedMaterialIndex,
          alphaCutoff: this.selectedAlphaCutoff,
        }));
  }

  revertMetallicRoughnessTexture() {
    const id = this.safeSelectedMaterialId;
    const textureId = this.originalMaterials[id].metallicRoughnessTextureId;
    reduxStore.dispatch(dispatchMetallicRoughnessTexture(
        getEditsMaterials(reduxStore.getState()), {id, textureId}));
  }

  revertMetallicFactor() {
    const index = this.selectedMaterialIndex!;
    const factor =
        this.getOriginalMaterial(index).pbrMetallicRoughness!.metallicFactor!;
    this.metallicFactorSlider.value = factor;
    this.getMaterial(index)!.pbrMetallicRoughness.setMetallicFactor(factor);
  }

  revertRoughnessFactor() {
    const index = this.selectedMaterialIndex!;
    const factor =
        this.getOriginalMaterial(index).pbrMetallicRoughness!.roughnessFactor!;
    this.roughnessFactorSlider.value = factor;
    this.getMaterial(index)!.pbrMetallicRoughness.setRoughnessFactor(factor);
  }

  revertBaseColorFactor() {
    const index = this.safeSelectedMaterialId;
    const factor =
        this.getOriginalMaterial(index).pbrMetallicRoughness!.baseColorFactor!;
    this.baseColorPicker.selectedColorHex = this.rgbaToHex(factor);
    this.getMaterial(index)!.pbrMetallicRoughness.setBaseColorFactor(factor);
  }

  revertBaseColorTexture() {
    const id = this.safeSelectedMaterialId;
    const textureId = this.originalMaterials[id].baseColorTextureId;
    reduxStore.dispatch(dispatchBaseColorTexture(
        getEditsMaterials(reduxStore.getState()), {id, textureId}));
  }

  revertNormalTexture() {
    const id = this.safeSelectedMaterialId;
    const textureId = this.originalMaterials[id].normalTextureId;
    reduxStore.dispatch(dispatchNormalTexture(
        getEditsMaterials(reduxStore.getState()), {id, textureId}));
  }

  revertEmissiveTexture() {
    const id = this.safeSelectedMaterialId;
    const textureId = this.originalMaterials[id].emissiveTextureId;
    reduxStore.dispatch(dispatchEmissiveTexture(
        getEditsMaterials(reduxStore.getState()), {id, textureId}));
  }

  revertEmissiveFactor() {
    const id = this.safeSelectedMaterialId;
    const emissiveFactor = this.originalMaterials[id].emissiveFactor;
    reduxStore.dispatch(dispatchSetEmissiveFactor(
        getEditsMaterials(reduxStore.getState()), {id, emissiveFactor}));
  }

  revertOcclusionTexture() {
    const id = this.safeSelectedMaterialId;
    const textureId = this.originalMaterials[id].occlusionTextureId;
    reduxStore.dispatch(dispatchOcclusionTexture(
        getEditsMaterials(reduxStore.getState()), {id, textureId}));
  }

  revertAlphaCutoff() {
    const id = this.safeSelectedMaterialId;
    const alphaCutoff = this.originalMaterials[id].alphaCutoff;
    reduxStore.dispatch(dispatchSetAlphaCutoff(
        getEditsMaterials(reduxStore.getState()), {id, alphaCutoff}));
  }

  revertAlphaMode() {
    const id = this.safeSelectedMaterialId;
    const alphaMode = this.originalMaterials[id].alphaMode;
    reduxStore.dispatch(dispatchSetAlphaMode(
        getEditsMaterials(reduxStore.getState()), {id, alphaMode}));
  }

  revertDoubleSided() {
    const id = this.safeSelectedMaterialId;
    const doubleSided = this.originalMaterials[id].doubleSided;
    reduxStore.dispatch(dispatchDoubleSided(
        getEditsMaterials(reduxStore.getState()), {id, doubleSided}));
  }

  renderMetallicRoughnessTab() {
    if (this.selectedMaterialIndex == null) {
      return;
    }

    const material = this.getMaterial(this.selectedMaterialIndex);
    if (material == null) {
      return;
    }

    const {pbrMetallicRoughness} = material;
    const {metallicFactor, roughnessFactor, metallicRoughnessTexture} =
        pbrMetallicRoughness;
    const id = metallicRoughnessTexture ?
        getTextureId(metallicRoughnessTexture.texture.source) :
        undefined;

    return html`
  <me-expandable-tab tabName="Metallic Roughness">
    <div slot="content">
      <div class="MRSliders">
        <div class="MRSliderLabel">Metallic factor</div>
        <div class="MRSliderContainer">
          <mwc-icon-button id="revert-metallic-factor" class="RevertButton" icon="undo"
          title="Revert to original metallic factor"
          @click=${this.revertMetallicFactor}></mwc-icon-button>
          <me-slider-with-input id="metallic-factor" class="MRSlider" min="0.0" max="1.0"
        step="0.01" value="${metallicFactor}" @change=${this.onMetallicChange}>
          </me-slider-with-input>
        </div>

        <div class="MRSliderLabel">Roughness factor</div>
        <div class="MRSliderContainer">
          <mwc-icon-button id="revert-roughness-factor" class="RevertButton" icon="undo"
          title="Revert to original roughness factor"
          @click=${this.revertRoughnessFactor}></mwc-icon-button>
          <me-slider-with-input id="roughness-factor" class="MRSlider" min="0.0" max="1.0"
          step="0.01" value="${roughnessFactor}" @change=${
        this.onRoughnessChange}>
          </me-slider-with-input>
        </div>
      </div>
      <me-section-row label="Texture">
        <div class="TexturePickerContainer">
          <mwc-icon-button class="RevertButton" id="revert-metallic-roughness-texture" icon="undo"
          title="Revert to original metallic roughness texture"
          @click=${this.revertMetallicRoughnessTexture}></mwc-icon-button>
          <me-texture-picker .selectedIndex=${
        id ?
            this.thumbnailIds.indexOf(id) :
            undefined} id="metallic-roughness-texture-picker" @texture-changed=${
        this.onMetallicRoughnessTextureChange} @texture-uploaded=${
        this.onMetallicRoughnessTextureUpload} .images=${this.thumbnailUrls}>
          </me-texture-picker>
        </div>
      </me-section-row>
    </div>
  </me-expandable-tab>`;
  }

  renderBaseColorTab() {
    if (this.selectedMaterialIndex == null) {
      return;
    }

    const material = this.getMaterial(this.selectedMaterialIndex);
    if (material == null) {
      return;
    }

    const {pbrMetallicRoughness} = material;
    const {baseColorFactor, baseColorTexture} = pbrMetallicRoughness;
    const id = baseColorTexture ?
        getTextureId(baseColorTexture.texture.source) :
        undefined;
    const selectedColorHex = this.rgbaToHex(baseColorFactor);

    return html`
  <me-expandable-tab tabName="Base Color" .open=${true}>
    <div slot="content">
      <me-section-row label="Factor">
        <div class="TexturePickerContainer">
          <mwc-icon-button class="RevertButton" id="revert-base-color-factor" icon="undo"
            title="Revert to original base color factor"
            @click=${this.revertBaseColorFactor}></mwc-icon-button>
          <me-color-picker id="base-color-picker"
          selectedColorHex=${selectedColorHex} @change=${
        this.onBaseColorChange}>
          </me-color-picker>
        </div>
      </me-section-row>
      <me-section-row label="Texture">
        <div class="TexturePickerContainer">
          <mwc-icon-button class="RevertButton" id="revert-base-color-texture" icon="undo"
          title="Revert to original base color texture"
            @click=${this.revertBaseColorTexture}></mwc-icon-button>
          <me-texture-picker .selectedIndex=${
        id ? this.thumbnailIds.indexOf(id) :
             undefined} id="base-color-texture-picker" @texture-changed=${
        this.onBaseColorTextureChange} @texture-uploaded=${
        this.onBaseColorTextureUpload} .images=${
        this.thumbnailUrls}></me-texture-picker>
        </div>
      </me-section-row>
    </div>
  </me-expandable-tab>
    `;
  }

  renderNormalTextureTab() {
    if (this.selectedMaterialIndex === undefined) {
      return;
    }
    const material = this.materials[this.selectedMaterialIndex];
    const currentTextureId = material.normalTextureId;
    return html`
  <me-expandable-tab tabName="Normal Map">
    <div slot="content">
      <me-section-row label="Texture">
        <div class="TexturePickerContainer">
          <mwc-icon-button class="RevertButton" id="revert-normal-map-texture" icon="undo"
          title="Revert to original normal map texture"
            @click=${this.revertNormalTexture}></mwc-icon-button>
          <me-texture-picker .selectedIndex=${
        currentTextureId ?
            this.safeUrlIds.indexOf(currentTextureId) :
            undefined} id="normal-texture-picker" @texture-changed=${
        this.onNormalTextureChange} @texture-uploaded=${
        this.onNormalTextureUpload} .images=${this.safeTextureUrls}>
          </me-texture-picker>
        </div>
      </me-section-row>
    </div>
  </me-expandable-tab>`;
  }

  renderEmissiveTextureTab() {
    if (this.selectedMaterialIndex === undefined) {
      return;
    }
    const material = this.materials[this.selectedMaterialIndex];
    const currentTextureId = material.emissiveTextureId;
    const emissiveFactor = material.emissiveFactor ?? DEFAULT_EMISSIVE_FACTOR;
    const selectedColorRgb =
        emissiveFactor.map((color: number) => Math.round(color * 255));
    const selectedColorHex = color.rgbArrayToHex(selectedColorRgb);
    return html`
  <me-expandable-tab tabName="Emissive">
    <div slot="content">
      <me-section-row label="Factor">
        <div class="TexturePickerContainer">
          <mwc-icon-button class="RevertButton" id="revert-emissive-factor" icon="undo"
          title="Revert to original emissive factor"
          @click=${this.revertEmissiveFactor}></mwc-icon-button>
          <me-color-picker selectedColorHex=${
        selectedColorHex} id="emissive-factor-picker" @change=${
        this.onEmissiveFactorChanged}></me-color-picker>
        </div>
      </me-section-row>
      <me-section-row label="Texture">
        <div class="TexturePickerContainer">
          <mwc-icon-button class="RevertButton" id="revert-emissive-texture" icon="undo"
          title="Revert to original emissive texture"
          @click=${this.revertEmissiveTexture}></mwc-icon-button>
          <me-texture-picker .selectedIndex=${
        currentTextureId ?
            this.safeUrlIds.indexOf(currentTextureId) :
            undefined} id="emissive-texture-picker" @texture-changed=${
        this.onEmissiveTextureChange} @texture-uploaded=${
        this.onEmissiveTextureUpload} .images=${this.safeTextureUrls}>
        </me-texture-picker>
        </div>
      </me-section-row>
    </div>
  </me-expandable-tab>`;
  }

  renderOcclusionTextureTab() {
    if (this.selectedMaterialIndex === undefined) {
      return;
    }
    const material = this.materials[this.selectedMaterialIndex];
    const currentTextureId = material.occlusionTextureId;
    return html`
  <me-expandable-tab tabName="Occlusion">
    <div slot="content">
      <me-section-row label="Texture">
        <div class="TexturePickerContainer">
          <mwc-icon-button class="RevertButton" id="revert-occlusion-texture" icon="undo"
          title="Revert to original occlusion texture"
          @click=${this.revertOcclusionTexture}></mwc-icon-button>
          <me-texture-picker .selectedIndex=${
        currentTextureId ?
            this.safeUrlIds.indexOf(currentTextureId) :
            undefined} id="occlusion-texture-picker" @texture-changed=${
        this.onOcclusionTextureChange} @texture-uploaded=${
        this.onOcclusionTextureUpload} .images=${this.safeTextureUrls}>
          </me-texture-picker>
        </div>
      </me-section-row>
    </div>
  </me-expandable-tab>`;
  }

  renderAlphaBlendModeSection() {
    if (this.selectedMaterialIndex === undefined) {
      return;
    }

    const material = this.materials[this.selectedMaterialIndex];
    // Alpha blend mode defaults to 'OPAQUE' by gltf specification.
    const selectedIndex =
        material.alphaMode ? ALPHA_BLEND_MODES.indexOf(material.alphaMode) : 0;
    return html`
    <div class="SectionLabel">Alpha Blend Mode:</div>
    <div class="DropdownContainer">
      <mwc-icon-button class="RevertButton" id="revert-alpha-cutoff" icon="undo"
        title="Revert to original alpha mode"
        @click=${this.revertAlphaMode}></mwc-icon-button>
      <me-dropdown id="alpha-mode-picker"
        selectedIndex=${selectedIndex}
        @select=${this.onAlphaModeSelect}>
        ${
        ALPHA_BLEND_MODES.map(
            mode => html`<paper-item value=${mode}>${mode}</paper-item>`)}
      </me-dropdown>
    </div>
      ${
        material.alphaMode === 'MASK' ?
            html`
      <div class="SectionLabel" id="alpha-cutoff-label">Alpha Cutoff:</div>
        <div class="MRSliderContainer">
          <mwc-icon-button class="RevertButton" id="revert-alpha-mode" icon="undo"
            title="Revert to original alpha cutoff"
            @click=${this.revertAlphaCutoff}></mwc-icon-button>
          <me-slider-with-input class="MRSlider" id="alpha-cutoff" min="0.0" max="1.0"
          step="0.01" value="${
                material.alphaCutoff ??
                0.5  // Alpha cutoff defaults to 0.5 by gltf specification
            }" @change=${this.onAlphaCutoffChange}></me-slider-with-input>
        </div>
      ` :
            html``}
      `;
  }

  renderDoubleSidedSection() {
    if (this.selectedMaterialIndex === undefined) {
      return;
    }

    // By default, double sided is false. So if it's undefined, assume false.
    return html`
      <div class="CheckboxContainer">
        <mwc-icon-button class="RevertButton" id="revert-occlusion-texture" icon="undo"
        title="Revert to original double sidedness"
        @click=${this.revertDoubleSided}></mwc-icon-button>
        <me-checkbox id="doubleSidedCheckbox"
          ?checked=${
    !!this.materials[this.selectedMaterialIndex].doubleSided}
          label="Double Sided"
          @change=${this.onDoubleSidedChange}></me-checkbox>
      </div>`;
  }

  renderOtherTab() {
    if (this.selectedMaterialIndex === undefined) {
      return;
    }
    return html`
      <me-expandable-tab tabName="Other">
        <div slot="content">
        ${this.renderDoubleSidedSection()}
        ${this.renderAlphaBlendModeSection()}
        </div>
      </me-expandable-tab>
    `;
  }

  render() {
    if (this.materials.length === 0) {
      return html`No materials to edit`;
    }

    return html`
    ${this.renderSelectMaterialTab()}
    ${this.renderBaseColorTab()}
    ${this.renderMetallicRoughnessTab()}
    ${this.renderNormalTextureTab()}
    ${this.renderEmissiveTextureTab()}
    ${this.renderOcclusionTextureTab()}
    ${this.renderOtherTab()}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'me-materials-panel': MaterialPanel;
  }
}
