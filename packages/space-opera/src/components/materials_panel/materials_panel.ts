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
import {customElement, html, internalProperty, query} from 'lit-element';
import * as color from 'ts-closure-library/lib/color/color';  // from //third_party/javascript/closure/color

import {TextureInfo} from '../../../../model-viewer/lib/features/scene-graph/texture-info.js';
import {AlphaMode} from '../../../../model-viewer/lib/three-components/gltf-instance/gltf-2.0.js';
import {GLTF, TextureInfo as GLTFTextureInfo} from '../../../../model-viewer/lib/three-components/gltf-instance/gltf-defaulted';
import {reduxStore} from '../../space_opera_base.js';
import {State} from '../../types.js';
import {ConnectedLitElement} from '../connected_lit_element/connected_lit_element.js';
import {dispatchModelDirty, getModel, getModelViewer, getTextureId, pushThumbnail} from '../model_viewer_preview/reducer.js';
import {Thumbnail} from '../model_viewer_preview/types.js';
import {CheckboxElement} from '../shared/checkbox/checkbox.js';
import {ColorPicker} from '../shared/color_picker/color_picker.js';
import {Dropdown} from '../shared/dropdown/dropdown.js';
import {SliderWithInputElement} from '../shared/slider_with_input/slider_with_input.js';
import {FileDetails, TexturePicker} from '../shared/texture_picker/texture_picker.js';
import {ALPHA_BLEND_MODES} from '../utils/gltf_constants.js';
import {checkFinite} from '../utils/reducer_utils.js';

import {styles} from './materials_panel.css.js';


/** Material panel. */
@customElement('me-materials-panel')
export class MaterialPanel extends ConnectedLitElement {
  static styles = styles;

  @internalProperty() thumbnailsById = new Map<string, Thumbnail>();
  private thumbnailUrls: string[] = [];
  private thumbnailIds: string[] = [];
  @internalProperty() originalGltf?: GLTF;

  @internalProperty() isNewModel: boolean = true;
  @internalProperty() isTesting: boolean = false;
  @internalProperty() isInterpolating: boolean = false;

  @query('#material-container') panel!: HTMLDivElement;
  @query('me-color-picker#base-color-picker') baseColorPicker!: ColorPicker;
  @query('me-slider-with-input#roughness-factor')
  roughnessFactorSlider!: SliderWithInputElement;
  @query('me-slider-with-input#metallic-factor')
  metallicFactorSlider!: SliderWithInputElement;
  @query('me-dropdown#material-selector') materialSelector!: Dropdown;
  @query('me-texture-picker#base-color-texture-picker')
  baseColorTexturePicker!: TexturePicker;
  @query('me-texture-picker#metallic-roughness-texture-picker')
  metallicRoughnessTexturePicker!: TexturePicker;
  @query('me-texture-picker#normal-texture-picker')
  normalTexturePicker!: TexturePicker;
  @query('me-color-picker#emissive-factor-picker')
  emissiveFactorPicker!: ColorPicker;
  @query('me-texture-picker#emissive-texture-picker')
  emissiveTexturePicker!: TexturePicker;
  @query('me-texture-picker#occlusion-texture-picker')
  occlusionTexturePicker!: TexturePicker;
  @query('me-dropdown#alpha-mode-picker') alphaModePicker!: Dropdown;
  @query('me-slider-with-input#alpha-cutoff')
  alphaCutoffSlider!: SliderWithInputElement;
  @query('#alpha-cutoff-container') alphaCutoffContainer!: HTMLDivElement;
  @query('me-checkbox#doubleSidedCheckbox')
  doubleSidedCheckbox!: CheckboxElement;

  stateChanged(state: State) {
    const {originalGltf, thumbnailsById} = getModel(state);
    if (this.originalGltf !== originalGltf) {
      this.originalGltf = originalGltf;
      if (thumbnailsById != null) {
        this.thumbnailsById = new Map(thumbnailsById);
        this.thumbnailIds = [];
        this.thumbnailUrls = [];
        for (const [id, thumbnail] of this.thumbnailsById) {
          this.thumbnailIds.push(id);
          this.thumbnailUrls.push(thumbnail.objectUrl);
        }
        // If a new model is loaded, don't interpolate material
        this.isNewModel = true;
        this.selectedMaterialIndex = 0;
        this.isNewModel = false;
      }
    }
  }

  getMaterial() {
    return getModelViewer()!.model!.materials[this.selectedMaterialIndex];
  }

  getOriginalMaterial() {
    return this.originalGltf!.materials[this.selectedMaterialIndex];
  }

  getOriginalTextureId(index: number) {
    const imageIndex = this.originalGltf!.textures![index].source!;
    return getTextureId(this.originalGltf!.images![imageIndex]);
  }

  getTextureIndex(textureInfo: TextureInfo) {
    const {texture} = textureInfo;
    if (texture == null) {
      return undefined;
    }
    const id = getTextureId(texture.source);
    return this.thumbnailIds.indexOf(id);
  }

  rgbToHex(rgba: RGBA|RGB): string {
    const selectedColorRgb =
        rgba.slice(0, 3).map((color: number) => Math.round(color * 255));
    return color.rgbArrayToHex(selectedColorRgb);
  }

  /* Interpolate base color as curr approaches duration */
  getInterpolatedColor(original: RGBA, curr: number, duration: number): RGBA {
    const INTERP_COLOR = [0, 0, 0];
    // determine how much of interp color to use
    const interpRatio = Math.max(0, Math.min(1, (duration - curr) / duration));
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
    const interpRatio = Math.max(0, Math.min(1, (duration - curr) / duration));
    const originalRatio = 1 - interpRatio;
    return [
      (interpRatio * INTERP_COLOR[0]) + (originalRatio * original[0]),
      (interpRatio * INTERP_COLOR[1]) + (originalRatio * original[1]),
      (interpRatio * INTERP_COLOR[2]) + (originalRatio * original[2]),
    ];
  }

  // Logic for interpolating from red emissive factor to the original.
  interpolateMaterial() {
    this.isInterpolating = true;
    const originalBaseColor = this.selectedBaseColor;
    const originalEmissiveFactor = this.selectedEmissiveFactor;

    let start = -1;
    const DURATION = 1600;  // in milliseconds

    const interpolateStep = (timestamp: number) => {
      // New model is loaded mid interpolation
      if (start === -1) {
        start = timestamp;
      }

      const baseColorFactor = this.getInterpolatedColor(
          originalBaseColor, timestamp - start, DURATION);
      this.getMaterial().pbrMetallicRoughness.setBaseColorFactor(
          baseColorFactor);
      const emissiveFactor = this.getInterpolatedEmissive(
          originalEmissiveFactor, timestamp - start, DURATION);
      this.getMaterial().setEmissiveFactor(emissiveFactor);

      if (timestamp - start <= DURATION) {
        requestAnimationFrame(interpolateStep);
      } else {
        this.isInterpolating = false;
      }
    };
    requestAnimationFrame(interpolateStep);
  }

  onSelectMaterial() {
    const material = this.getMaterial();
    if (material == null) {
      return;
    }
    this.panel.style.display = '';
    const {
      pbrMetallicRoughness,
      emissiveFactor,
      emissiveTexture,
      normalTexture,
      occlusionTexture
    } = material;
    const {
      baseColorFactor,
      baseColorTexture,
      metallicFactor,
      roughnessFactor,
      metallicRoughnessTexture
    } = pbrMetallicRoughness;
    this.baseColorPicker.selectedColorHex = this.rgbToHex(baseColorFactor);
    this.baseColorTexturePicker.selectedIndex =
        this.getTextureIndex(baseColorTexture);
    this.metallicFactorSlider.value = metallicFactor;
    this.roughnessFactorSlider.value = roughnessFactor;
    this.metallicRoughnessTexturePicker.selectedIndex =
        this.getTextureIndex(metallicRoughnessTexture);
    this.normalTexturePicker.selectedIndex =
        this.getTextureIndex(normalTexture);
    this.occlusionTexturePicker.selectedIndex =
        this.getTextureIndex(occlusionTexture);
    this.emissiveFactorPicker.selectedColorHex = this.rgbToHex(emissiveFactor);
    this.emissiveTexturePicker.selectedIndex =
        this.getTextureIndex(emissiveTexture);

    this.alphaCutoffSlider.value = material.getAlphaCutoff();
    this.doubleSidedCheckbox.checked = material.getDoubleSided();

    const alphaMode = material.getAlphaMode();
    this.alphaCutoffContainer.style.display =
        alphaMode === 'MASK' ? '' : 'none';
    this.alphaModePicker.selectedIndex =
        ALPHA_BLEND_MODES.findIndex((name) => name === alphaMode);

    // Don't interpolate on the initial model load.
    if (!this.isNewModel && !this.isTesting && !this.isInterpolating) {
      this.interpolateMaterial();
    }
  }

  renderSelectMaterialTab() {
    return html`
    <me-expandable-tab tabName="Selected Material" .open=${true} .sticky=${
        true}>
      <me-dropdown
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

  get selectedMaterialIndex(): number {
    return this.materialSelector.selectedIndex;
  }

  set selectedMaterialIndex(index: number) {
    this.materialSelector.selectedIndex = index;
    this.onSelectMaterial();
  }

  get selectedBaseColor(): RGBA {
    const alphaFactor =
        this.getMaterial().pbrMetallicRoughness.baseColorFactor[3];
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
    return checkFinite(Number(this.alphaCutoffSlider.value));
  }

  get selectedBaseColorTextureId(): string|undefined {
    if (this.baseColorTexturePicker.selectedIndex === undefined) {
      return undefined;
    }
    return this.thumbnailIds[this.baseColorTexturePicker.selectedIndex];
  }

  get selectedMetallicRoughnessTextureId(): string|undefined {
    if (this.metallicRoughnessTexturePicker.selectedIndex == null) {
      return undefined;
    }
    return this.thumbnailIds[this.metallicRoughnessTexturePicker.selectedIndex];
  }

  get selectedNormalTextureId(): string|undefined {
    if (this.normalTexturePicker.selectedIndex === undefined) {
      return undefined;
    }
    return this.thumbnailIds[this.normalTexturePicker.selectedIndex];
  }

  get selectedEmissiveTextureId(): string|undefined {
    if (this.emissiveTexturePicker.selectedIndex === undefined) {
      return undefined;
    }
    return this.thumbnailIds[this.emissiveTexturePicker.selectedIndex];
  }

  get selectedOcclusionTextureId(): string|undefined {
    if (this.occlusionTexturePicker.selectedIndex === undefined) {
      return undefined;
    }
    return this.thumbnailIds[this.occlusionTexturePicker.selectedIndex];
  }

  onBaseColorChange() {
    this.getMaterial().pbrMetallicRoughness.setBaseColorFactor(
        this.selectedBaseColor);
    reduxStore.dispatch(dispatchModelDirty());
  }

  onRoughnessChange() {
    this.getMaterial().pbrMetallicRoughness.setRoughnessFactor(
        this.selectedRoughnessFactor);
    reduxStore.dispatch(dispatchModelDirty());
  }

  onMetallicChange() {
    this.getMaterial().pbrMetallicRoughness.setMetallicFactor(
        this.selectedMetallicFactor);
    reduxStore.dispatch(dispatchModelDirty());
  }

  onDoubleSidedChange(event: Event) {
    this.updateDoubleSided((event.target as HTMLInputElement).checked);
  }

  updateDoubleSided(value: boolean) {
    this.getMaterial().setDoubleSided(value);
    reduxStore.dispatch(dispatchModelDirty());
  }

  onTextureChange(textureId: string|undefined, textureInfo: TextureInfo) {
    const texture = textureId != null ?
        this.thumbnailsById.get(textureId)?.texture :
        undefined;
    textureInfo.setTexture(texture ?? null);
    reduxStore.dispatch(dispatchModelDirty());
  }

  revertTexture(
      texturePicker: TexturePicker, textureInfo: GLTFTextureInfo|undefined) {
    if (textureInfo == null) {
      texturePicker.selectedIndex = undefined;
    } else {
      const id = this.getOriginalTextureId(textureInfo.index);
      texturePicker.selectedIndex = this.thumbnailIds.indexOf(id);
    }
  }

  async onTextureUpload(
      detail: FileDetails, texturePicker: TexturePicker,
      textureInfo: TextureInfo) {
    const {url, type} = detail;
    if (this.thumbnailsById.has(url)) {
      console.log('URL collision! Texture not updated.');
      return;
    }
    const texture = await getModelViewer()?.createTexture(url, type);
    if (texture == null) {
      return;
    }

    textureInfo.setTexture(texture);
    const id = await pushThumbnail(this.thumbnailsById, textureInfo);
    // Trigger async panel update / render
    this.thumbnailsById = new Map(this.thumbnailsById);
    if (id != null) {
      this.thumbnailIds.push(id);
      // Trigger async texture_picker update / render
      this.thumbnailUrls = [...this.thumbnailUrls];
      this.thumbnailUrls.push(this.thumbnailsById.get(id)!.objectUrl);
      texturePicker.selectedIndex = this.thumbnailIds.indexOf(id);
    }
    reduxStore.dispatch(dispatchModelDirty());
    this.dispatchEvent(new CustomEvent('texture-upload-complete'));
  }

  onBaseColorTextureChange() {
    this.onTextureChange(
        this.selectedBaseColorTextureId,
        this.getMaterial().pbrMetallicRoughness.baseColorTexture);
  }

  onBaseColorTextureUpload(event: CustomEvent<FileDetails>) {
    this.onTextureUpload(
        event.detail,
        this.baseColorTexturePicker,
        this.getMaterial().pbrMetallicRoughness.baseColorTexture);
  }

  onMetallicRoughnessTextureChange() {
    this.onTextureChange(
        this.selectedMetallicRoughnessTextureId,
        this.getMaterial().pbrMetallicRoughness.metallicRoughnessTexture);
  }

  onMetallicRoughnessTextureUpload(event: CustomEvent<FileDetails>) {
    this.onTextureUpload(
        event.detail,
        this.metallicRoughnessTexturePicker,
        this.getMaterial().pbrMetallicRoughness.metallicRoughnessTexture);
  }

  onNormalTextureChange() {
    this.onTextureChange(
        this.selectedNormalTextureId, this.getMaterial().normalTexture);
  }

  onNormalTextureUpload(event: CustomEvent<FileDetails>) {
    this.onTextureUpload(
        event.detail,
        this.normalTexturePicker,
        this.getMaterial().normalTexture);
  }

  onEmissiveTextureChange() {
    this.onTextureChange(
        this.selectedEmissiveTextureId, this.getMaterial().emissiveTexture);
  }

  onEmissiveTextureUpload(event: CustomEvent<FileDetails>) {
    this.onTextureUpload(
        event.detail,
        this.emissiveTexturePicker,
        this.getMaterial().emissiveTexture);
  }

  onEmissiveFactorChanged() {
    this.getMaterial().setEmissiveFactor(this.selectedEmissiveFactor);
    reduxStore.dispatch(dispatchModelDirty());
  }

  onOcclusionTextureChange() {
    this.onTextureChange(
        this.selectedOcclusionTextureId, this.getMaterial().occlusionTexture);
  }

  onOcclusionTextureUpload(event: CustomEvent<FileDetails>) {
    this.onTextureUpload(
        event.detail,
        this.occlusionTexturePicker,
        this.getMaterial().occlusionTexture);
  }

  onAlphaModeSelect() {
    const selectedMode =
        ALPHA_BLEND_MODES[this.alphaModePicker.selectedIndex] as AlphaMode;
    this.alphaCutoffContainer.style.display =
        selectedMode === 'MASK' ? '' : 'none';
    const material = this.getMaterial()
    material.setAlphaMode(selectedMode);
    this.alphaCutoffSlider.value = material.getAlphaCutoff();
    reduxStore.dispatch(dispatchModelDirty());
  }

  onAlphaCutoffChange() {
    this.getMaterial().setAlphaCutoff(this.selectedAlphaCutoff);
    reduxStore.dispatch(dispatchModelDirty());
  }

  revertMetallicRoughnessTexture() {
    this.revertTexture(
        this.metallicRoughnessTexturePicker,
        this.getOriginalMaterial()
            .pbrMetallicRoughness.metallicRoughnessTexture);
    this.onMetallicRoughnessTextureChange();
  }

  revertMetallicFactor() {
    const factor =
        this.getOriginalMaterial().pbrMetallicRoughness.metallicFactor;
    this.metallicFactorSlider.value = factor;
    this.onMetallicChange();
  }

  revertRoughnessFactor() {
    const factor =
        this.getOriginalMaterial().pbrMetallicRoughness.roughnessFactor;
    this.roughnessFactorSlider.value = factor;
    this.onRoughnessChange();
  }

  revertBaseColorFactor() {
    const factor =
        this.getOriginalMaterial().pbrMetallicRoughness.baseColorFactor!;
    this.baseColorPicker.selectedColorHex = this.rgbToHex(factor);
    this.onBaseColorChange();
  }

  revertBaseColorTexture() {
    this.revertTexture(
        this.baseColorTexturePicker,
        this.getOriginalMaterial().pbrMetallicRoughness.baseColorTexture);
    this.onBaseColorTextureChange();
  }

  revertNormalTexture() {
    this.revertTexture(
        this.normalTexturePicker, this.getOriginalMaterial().normalTexture);
    this.onNormalTextureChange();
  }

  revertEmissiveTexture() {
    this.revertTexture(
        this.emissiveTexturePicker, this.getOriginalMaterial().emissiveTexture);
    this.onEmissiveTextureChange();
  }

  revertEmissiveFactor() {
    const factor = this.getOriginalMaterial().emissiveFactor;
    this.emissiveFactorPicker.selectedColorHex = this.rgbToHex(factor);
    this.onEmissiveFactorChanged();
  }

  revertOcclusionTexture() {
    this.revertTexture(
        this.occlusionTexturePicker,
        this.getOriginalMaterial().occlusionTexture);
    this.onOcclusionTextureChange();
  }

  revertAlphaCutoff() {
    this.alphaCutoffSlider.value = this.getOriginalMaterial().alphaCutoff;
    this.onAlphaCutoffChange();
  }

  revertAlphaMode() {
    const alphaMode = this.getOriginalMaterial().alphaMode;
    this.alphaModePicker.selectedIndex =
        ALPHA_BLEND_MODES.findIndex((name) => name === alphaMode);
    this.onAlphaModeSelect();
  }

  revertDoubleSided() {
    const doubleSided = this.getOriginalMaterial().doubleSided;
    this.doubleSidedCheckbox.checked = doubleSided;
    this.updateDoubleSided(doubleSided);
  }

  renderMetallicRoughnessTab() {
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
        step="0.01" @change=${this.onMetallicChange}>
          </me-slider-with-input>
        </div>

        <div class="MRSliderLabel">Roughness factor</div>
        <div class="MRSliderContainer">
          <mwc-icon-button id="revert-roughness-factor" class="RevertButton" icon="undo"
          title="Revert to original roughness factor"
          @click=${this.revertRoughnessFactor}></mwc-icon-button>
          <me-slider-with-input id="roughness-factor" class="MRSlider" min="0.0" max="1.0"
          step="0.01" @change=${this.onRoughnessChange}>
          </me-slider-with-input>
        </div>
      </div>
      <me-section-row label="Texture">
        <div class="TexturePickerContainer">
          <mwc-icon-button class="RevertButton" id="revert-metallic-roughness-texture" icon="undo"
          title="Revert to original metallic roughness texture"
          @click=${this.revertMetallicRoughnessTexture}></mwc-icon-button>
          <me-texture-picker id="metallic-roughness-texture-picker" @texture-changed=${
        this.onMetallicRoughnessTextureChange} @texture-uploaded=${
        this.onMetallicRoughnessTextureUpload} .images=${this.thumbnailUrls}>
          </me-texture-picker>
        </div>
      </me-section-row>
    </div>
  </me-expandable-tab>`;
  }

  renderBaseColorTab() {
    return html`
  <me-expandable-tab tabName="Base Color" .open=${true}>
    <div slot="content">
      <me-section-row label="Factor">
        <div class="TexturePickerContainer">
          <mwc-icon-button class="RevertButton" id="revert-base-color-factor" icon="undo"
            title="Revert to original base color factor"
            @click=${this.revertBaseColorFactor}></mwc-icon-button>
          <me-color-picker id="base-color-picker"
          @change=${this.onBaseColorChange}>
          </me-color-picker>
        </div>
      </me-section-row>
      <me-section-row label="Texture">
        <div class="TexturePickerContainer">
          <mwc-icon-button class="RevertButton" id="revert-base-color-texture" icon="undo"
          title="Revert to original base color texture"
            @click=${this.revertBaseColorTexture}></mwc-icon-button>
          <me-texture-picker id="base-color-texture-picker" @texture-changed=${
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
    return html`
  <me-expandable-tab tabName="Normal Map">
    <div slot="content">
      <me-section-row label="Texture">
        <div class="TexturePickerContainer">
          <mwc-icon-button class="RevertButton" id="revert-normal-map-texture" icon="undo"
          title="Revert to original normal map texture"
            @click=${this.revertNormalTexture}></mwc-icon-button>
          <me-texture-picker id="normal-texture-picker" @texture-changed=${
        this.onNormalTextureChange} @texture-uploaded=${
        this.onNormalTextureUpload} .images=${this.thumbnailUrls}>
          </me-texture-picker>
        </div>
      </me-section-row>
    </div>
  </me-expandable-tab>`;
  }

  renderEmissiveTextureTab() {
    return html`
  <me-expandable-tab tabName="Emissive">
    <div slot="content">
      <me-section-row label="Factor">
        <div class="TexturePickerContainer">
          <mwc-icon-button class="RevertButton" id="revert-emissive-factor" icon="undo"
          title="Revert to original emissive factor"
          @click=${this.revertEmissiveFactor}></mwc-icon-button>
          <me-color-picker id="emissive-factor-picker" @change=${
        this.onEmissiveFactorChanged}></me-color-picker>
        </div>
      </me-section-row>
      <me-section-row label="Texture">
        <div class="TexturePickerContainer">
          <mwc-icon-button class="RevertButton" id="revert-emissive-texture" icon="undo"
          title="Revert to original emissive texture"
          @click=${this.revertEmissiveTexture}></mwc-icon-button>
          <me-texture-picker id="emissive-texture-picker" @texture-changed=${
        this.onEmissiveTextureChange} @texture-uploaded=${
        this.onEmissiveTextureUpload} .images=${this.thumbnailUrls}>
        </me-texture-picker>
        </div>
      </me-section-row>
    </div>
  </me-expandable-tab>`;
  }

  renderOcclusionTextureTab() {
    return html`
  <me-expandable-tab tabName="Occlusion">
    <div slot="content">
      <me-section-row label="Texture">
        <div class="TexturePickerContainer">
          <mwc-icon-button class="RevertButton" id="revert-occlusion-texture" icon="undo"
          title="Revert to original occlusion texture"
          @click=${this.revertOcclusionTexture}></mwc-icon-button>
          <me-texture-picker id="occlusion-texture-picker" @texture-changed=${
        this.onOcclusionTextureChange} @texture-uploaded=${
        this.onOcclusionTextureUpload} .images=${this.thumbnailUrls}>
          </me-texture-picker>
        </div>
      </me-section-row>
    </div>
  </me-expandable-tab>`;
  }

  renderAlphaBlendModeSection() {
    return html`
    <div class="SectionLabel">Alpha Blend Mode:</div>
    <div class="DropdownContainer">
      <mwc-icon-button class="RevertButton" id="revert-alpha-cutoff" icon="undo"
        title="Revert to original alpha mode"
        @click=${this.revertAlphaMode}></mwc-icon-button>
      <me-dropdown id="alpha-mode-picker"
        @select=${this.onAlphaModeSelect}>
        ${
        ALPHA_BLEND_MODES.map(
            mode => html`<paper-item value=${mode}>${mode}</paper-item>`)}
      </me-dropdown>
    </div>
    <div id="alpha-cutoff-container"}>
      <div class="SectionLabel" id="alpha-cutoff-label">Alpha Cutoff:</div>
      <div class="MRSliderContainer">
        <mwc-icon-button class="RevertButton" id="revert-alpha-mode" icon="undo"
          title="Revert to original alpha cutoff"
          @click=${this.revertAlphaCutoff}></mwc-icon-button>
        <me-slider-with-input class="MRSlider" id="alpha-cutoff" min="0.0" max="1.0"
        step="0.01" @change=${this.onAlphaCutoffChange}></me-slider-with-input>
      </div>
    </div>
      `;
  }

  renderDoubleSidedSection() {
    return html`
      <div class="CheckboxContainer">
        <mwc-icon-button class="RevertButton" id="revert-occlusion-texture" icon="undo"
        title="Revert to original double sidedness"
        @click=${this.revertDoubleSided}></mwc-icon-button>
        <me-checkbox id="doubleSidedCheckbox"
          label="Double Sided"
          @change=${this.onDoubleSidedChange}></me-checkbox>
      </div>`;
  }

  renderOtherTab() {
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
    return html`
    <div id="material-container" style="display: none">
    ${this.renderSelectMaterialTab()}
    ${this.renderBaseColorTab()}
    ${this.renderMetallicRoughnessTab()}
    ${this.renderNormalTextureTab()}
    ${this.renderEmissiveTextureTab()}
    ${this.renderOcclusionTextureTab()}
    ${this.renderOtherTab()}
    </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'me-materials-panel': MaterialPanel;
  }
}
