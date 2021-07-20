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
import {GLTF} from '../../../../model-viewer/lib/three-components/gltf-instance/gltf-2.0.js';
import {reduxStore} from '../../space_opera_base.js';
import {State} from '../../types.js';
import {ConnectedLitElement} from '../connected_lit_element/connected_lit_element.js';
import {dispatchModelDirty, getModel, getModelViewer, getTextureId, pushThumbnail} from '../model_viewer_preview/reducer.js';
import {Thumbnail} from '../model_viewer_preview/types.js';
import {ColorPicker} from '../shared/color_picker/color_picker.js';
import {Dropdown} from '../shared/dropdown/dropdown.js';
import {SliderWithInputElement} from '../shared/slider_with_input/slider_with_input.js';
import {TexturePicker} from '../shared/texture_picker/texture_picker.js';
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

  stateChanged(state: State) {
    const model = getModel(state);
    if (model == null) {
      return;
    }

    // If a new model is loaded, don't interpolate material
    const gltf = model.originalGltf;
    if (this.originalGltf !== gltf) {
      this.isNewModel = true;
      this.originalGltf = gltf;
      this.selectedMaterialIndex = 0;
      if (model.thumbnailsById != null) {
        this.thumbnailsById = new Map(model.thumbnailsById);
        this.thumbnailIds = [];
        this.thumbnailUrls = [];
        for (const [id, thumbnail] of this.thumbnailsById) {
          this.thumbnailIds.push(id);
          this.thumbnailUrls.push(thumbnail.objectUrl);
        }
      }
    }
  }

  getMaterial() {
    return getModelViewer()!.model!.materials[this.selectedMaterialIndex];
  }

  getOriginalMaterial() {
    return this.originalGltf!.materials![this.selectedMaterialIndex];
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

    // Don't interpolate on the initial model load.
    if (!this.isNewModel && !this.isTesting && !this.isInterpolating) {
      this.interpolateMaterial();
    }
    this.isNewModel = false;
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
  }

  get selectedBaseColor(): RGBA {
    if (this.selectedMaterialIndex === undefined) {
      throw new Error('No material selected');
    }
    const alphaFactor =
        this.getMaterial()!.pbrMetallicRoughness.baseColorFactor[3];
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

  get selectedBaseColorTextureId(): string|undefined {
    if (!this.baseColorTexturePicker) {
      throw new Error('Texture picker is not defined');
    }
    if (this.baseColorTexturePicker.selectedIndex === undefined) {
      return undefined;
    }
    return this.thumbnailIds[this.baseColorTexturePicker.selectedIndex];
  }

  get selectedMetallicRoughnessTextureId(): string|undefined {
    if (!this.metallicRoughnessTexturePicker) {
      throw new Error('Texture picker is not defined');
    }
    if (this.metallicRoughnessTexturePicker.selectedIndex == null) {
      return undefined;
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
    return this.thumbnailIds[this.normalTexturePicker.selectedIndex];
  }

  get selectedEmissiveTextureId(): string|undefined {
    if (!this.emissiveTexturePicker) {
      throw new Error('Texture picker is not defined');
    }
    if (this.emissiveTexturePicker.selectedIndex === undefined) {
      return undefined;
    }
    return this.thumbnailIds[this.emissiveTexturePicker.selectedIndex];
  }

  get selectedOcclusionTextureId(): string|undefined {
    if (!this.occlusionTexturePicker) {
      throw new Error('Texture picker is not defined');
    }
    if (this.occlusionTexturePicker.selectedIndex === undefined) {
      return undefined;
    }
    return this.thumbnailIds[this.occlusionTexturePicker.selectedIndex];
  }

  onBaseColorChange() {
    if (this.selectedMaterialIndex === undefined) {
      throw new Error('No material selected');
    }
    this.getMaterial()!.pbrMetallicRoughness.setBaseColorFactor(
        this.selectedBaseColor);
    reduxStore.dispatch(dispatchModelDirty());
  }

  onRoughnessChange() {
    if (this.selectedMaterialIndex === undefined) {
      throw new Error('No material selected');
    }
    this.getMaterial()!.pbrMetallicRoughness.setRoughnessFactor(
        this.selectedRoughnessFactor);
    reduxStore.dispatch(dispatchModelDirty());
  }

  onMetallicChange() {
    if (this.selectedMaterialIndex == null) {
      throw new Error('No material selected');
    }
    this.getMaterial()!.pbrMetallicRoughness.setMetallicFactor(
        this.selectedMetallicFactor);
    reduxStore.dispatch(dispatchModelDirty());
  }

  onDoubleSidedChange(_event: Event) {
    if (this.selectedMaterialIndex === undefined) {
      throw new Error('No material selected');
    }
    // const doubleSided = (event.target as HTMLInputElement).checked;
    reduxStore.dispatch(dispatchModelDirty());
  }

  onTextureChange(textureId: string|undefined, textureInfo: TextureInfo) {
    const texture = textureId != null ?
        this.thumbnailsById.get(textureId)?.texture :
        undefined;
    textureInfo.setTexture(texture as any ?? null);
    reduxStore.dispatch(dispatchModelDirty());
  }

  async onTextureUpload(uri: string, textureInfo: TextureInfo) {
    if (this.thumbnailsById.has(uri)) {
      console.log('URL collision! Texture not updated.');
      return;
    }
    const texture = await getModelViewer()?.createTexture(uri);
    if (texture == null) {
      return;
    }
    textureInfo.setTexture(texture);
    const id = await pushThumbnail(this.thumbnailsById, textureInfo);
    // Trigger async panel update / render
    this.thumbnailsById = new Map(this.thumbnailsById);
    if (id != null) {
      this.thumbnailIds.push(id);
      this.thumbnailUrls.push(this.thumbnailsById.get(id)!.objectUrl);
    }
    reduxStore.dispatch(dispatchModelDirty());
    this.dispatchEvent(new CustomEvent('texture-upload-complete'));
  }

  onBaseColorTextureChange() {
    this.onTextureChange(
        this.selectedBaseColorTextureId,
        this.getMaterial().pbrMetallicRoughness.baseColorTexture);
  }

  onBaseColorTextureUpload(event: CustomEvent) {
    this.onTextureUpload(
        event.detail, this.getMaterial().pbrMetallicRoughness.baseColorTexture);
  }

  onMetallicRoughnessTextureChange() {
    this.onTextureChange(
        this.selectedMetallicRoughnessTextureId,
        this.getMaterial().pbrMetallicRoughness.metallicRoughnessTexture);
  }

  onMetallicRoughnessTextureUpload(event: CustomEvent) {
    this.onTextureUpload(
        event.detail,
        this.getMaterial().pbrMetallicRoughness.metallicRoughnessTexture);
  }

  onNormalTextureChange() {
    this.onTextureChange(
        this.selectedNormalTextureId, this.getMaterial().normalTexture);
  }

  onNormalTextureUpload(event: CustomEvent) {
    this.onTextureUpload(event.detail, this.getMaterial().normalTexture);
  }

  onEmissiveTextureChange() {
    this.onTextureChange(
        this.selectedEmissiveTextureId, this.getMaterial().emissiveTexture);
  }

  onEmissiveTextureUpload(event: CustomEvent) {
    this.onTextureUpload(event.detail, this.getMaterial().emissiveTexture);
  }

  onEmissiveFactorChanged() {
    if (this.selectedMaterialIndex === undefined) {
      throw new Error('No material selected');
    }
    this.getMaterial()!.setEmissiveFactor(this.selectedEmissiveFactor);
    reduxStore.dispatch(dispatchModelDirty());
  }

  onOcclusionTextureChange() {
    this.onTextureChange(
        this.selectedOcclusionTextureId, this.getMaterial().occlusionTexture);
  }

  onOcclusionTextureUpload(event: CustomEvent) {
    this.onTextureUpload(event.detail, this.getMaterial().occlusionTexture);
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
    reduxStore.dispatch(dispatchModelDirty());
  }

  onAlphaCutoffChange() {
    if (this.selectedMaterialIndex === undefined) {
      throw new Error('No material selected');
    }
    reduxStore.dispatch(dispatchModelDirty());
  }

  revertMetallicRoughnessTexture() {
    const texture = this.getOriginalMaterial()
                        .pbrMetallicRoughness!.metallicRoughnessTexture;
    const id = this.getOriginalTextureId(texture!.index);
    this.metallicRoughnessTexturePicker.selectedIndex =
        this.thumbnailIds.indexOf(id);
    this.onMetallicRoughnessTextureChange();
  }

  revertMetallicFactor() {
    const factor =
        this.getOriginalMaterial().pbrMetallicRoughness!.metallicFactor!;
    this.metallicFactorSlider.value = factor;
    this.onMetallicChange();
  }

  revertRoughnessFactor() {
    const factor =
        this.getOriginalMaterial().pbrMetallicRoughness!.roughnessFactor!;
    this.roughnessFactorSlider.value = factor;
    this.onRoughnessChange();
  }

  revertBaseColorFactor() {
    const factor =
        this.getOriginalMaterial().pbrMetallicRoughness!.baseColorFactor!;
    this.baseColorPicker.selectedColorHex = this.rgbToHex(factor);
    this.onBaseColorChange();
  }

  revertBaseColorTexture() {
    const texture =
        this.getOriginalMaterial()?.pbrMetallicRoughness!.baseColorTexture;
    const id = this.getOriginalTextureId(texture!.index);
    this.baseColorTexturePicker.selectedIndex = this.thumbnailIds.indexOf(id);
    this.onBaseColorTextureChange();
  }

  revertNormalTexture() {
    const texture = this.getOriginalMaterial()?.normalTexture;
    const id = this.getOriginalTextureId(texture!.index);
    this.normalTexturePicker.selectedIndex = this.thumbnailIds.indexOf(id);
    this.onNormalTextureChange();
  }

  revertEmissiveTexture() {
    const texture = this.getOriginalMaterial()?.emissiveTexture;
    const id = this.getOriginalTextureId(texture!.index);
    this.emissiveTexturePicker.selectedIndex = this.thumbnailIds.indexOf(id);
    this.onEmissiveTextureChange();
  }

  revertEmissiveFactor() {
    const factor = this.getOriginalMaterial().emissiveFactor!;
    this.emissiveFactorPicker.selectedColorHex = this.rgbToHex(factor);
    this.onEmissiveFactorChanged();
  }

  revertOcclusionTexture() {
    const texture = this.getOriginalMaterial()?.occlusionTexture;
    const id = this.getOriginalTextureId(texture!.index);
    this.occlusionTexturePicker.selectedIndex = this.thumbnailIds.indexOf(id);
    this.onOcclusionTextureChange();
  }

  revertAlphaCutoff() {
  }

  revertAlphaMode() {
  }

  revertDoubleSided() {
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
    // TODO: hide Alpha Cutoff unless material.alphaMode === 'MASK'
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
    <div class="SectionLabel" id="alpha-cutoff-label">Alpha Cutoff:</div>
    <div class="MRSliderContainer">
      <mwc-icon-button class="RevertButton" id="revert-alpha-mode" icon="undo"
        title="Revert to original alpha cutoff"
        @click=${this.revertAlphaCutoff}></mwc-icon-button>
      <me-slider-with-input class="MRSlider" id="alpha-cutoff" min="0.0" max="1.0"
      step="0.01" @change=${this.onAlphaCutoffChange}></me-slider-with-input>
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
