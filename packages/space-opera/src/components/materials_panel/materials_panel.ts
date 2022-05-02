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

import '@material/mwc-button';
import '@material/mwc-dialog';
import '@material/mwc-icon-button';
import '@material/mwc-textfield';
import '@polymer/paper-item';
import '@polymer/paper-slider';
import '../shared/checkbox/checkbox.js';
import '../shared/color_picker/color_picker.js';
import '../shared/dialog/input_dialog';
import '../shared/dropdown/dropdown.js';
import '../shared/editor_panel/editor_panel.js';
import '../shared/expandable_content/expandable_tab.js';
import '../shared/section_row/section_row.js';
import '../shared/slider_with_input/slider_with_input.js';
import '../shared/texture_picker/texture_picker.js';

import {Material} from '@google/model-viewer/lib/features/scene-graph/material';
import {TextureInfo} from '@google/model-viewer/lib/features/scene-graph/texture-info.js';
import {RGB, RGBA} from '@google/model-viewer/lib/model-viewer';
import {AlphaMode} from '@google/model-viewer/lib/three-components/gltf-instance/gltf-2.0';
import {GLTF, TextureInfo as GLTFTextureInfo} from '@google/model-viewer/lib/three-components/gltf-instance/gltf-defaulted';
import {TextField} from '@material/mwc-textfield';
import {PaperListboxElement} from '@polymer/paper-listbox';
import {html} from 'lit';
import {customElement, state, query} from 'lit/decorators.js';
import * as color from 'ts-closure-library/lib/color/color';  // from //third_party/javascript/closure/color

import {reduxStore} from '../../space_opera_base.js';
import {State} from '../../types.js';
import {ConnectedLitElement} from '../connected_lit_element/connected_lit_element.js';
import {dispatchModelDirty, getModel, getModelViewer, getTextureId, pushThumbnail} from '../model_viewer_preview/reducer.js';
import {Thumbnail} from '../model_viewer_preview/types.js';
import {CheckboxElement} from '../shared/checkbox/checkbox.js';
import {ColorPicker} from '../shared/color_picker/color_picker.js';
import {InputDialog} from '../shared/dialog/input_dialog';
import {Dropdown} from '../shared/dropdown/dropdown.js';
import {SliderWithInputElement} from '../shared/slider_with_input/slider_with_input.js';
import {TabbedPanel} from '../shared/tabs/tabs.js';
import {FileDetails, TexturePicker} from '../shared/texture_picker/texture_picker.js';
import {ALPHA_BLEND_MODES} from '../utils/gltf_constants.js';
import {checkFinite} from '../utils/reducer_utils.js';

import {styles} from './materials_panel.css.js';



/** Material panel. */
@customElement('me-materials-panel')
export class MaterialPanel extends ConnectedLitElement {
  static styles = styles;

  @state() thumbnailsById = new Map<string, Thumbnail>();
  private thumbnailUrls: string[] = [];
  private thumbnailIds: string[] = [];
  private originalMaterialFromCloneMap = new Map<number, number>();

  @state() originalGltf?: GLTF;

  @state() isNewModel: boolean = true;
  @state() isTesting: boolean = false;
  @state() isInterpolating: boolean = false;

  @query('#material-container') panel!: HTMLDivElement;
  @query('me-color-picker#base-color-picker') baseColorPicker!: ColorPicker;
  @query('me-slider-with-input#roughness-factor')
  roughnessFactorSlider!: SliderWithInputElement;
  @query('me-slider-with-input#metallic-factor')
  metallicFactorSlider!: SliderWithInputElement;
  @query('me-dropdown#material-selector') materialSelector!: Dropdown;
  @query('me-dropdown#variant-selector') variantSelector!: Dropdown;
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
  @query('me-slider-with-input#alpha-factor')
  alphaFactorSlider!: SliderWithInputElement;
  @query('#alpha-cutoff-container') alphaCutoffContainer!: HTMLDivElement;
  @query('me-checkbox#doubleSidedCheckbox')
  doubleSidedCheckbox!: CheckboxElement;
  selectableMaterials = new Array<Material>();
  @query('input-dialog#edit-variant-name') editVariantNameDialog!: InputDialog;
  @query('input-dialog#create-variant-name')
  createVariantNameDialog!: InputDialog;
  @query('input-dialog#edit-material-name')
  editMaterialNameDialog!: InputDialog;

  @query('mwc-textfield#set-variant-name') setVariantName!: TextField;

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

        if (getModelViewer().availableVariants.length > 0) {
          getModelViewer().variantName = getModelViewer().availableVariants[0];
        }

        this.updateSelectableMaterials();

        // If a new model is loaded, don't interpolate material
        this.isNewModel = true;
        this.selectedMaterialIndex = 0;
        this.isNewModel = false;
      }
    }
  }

  getMaterial() {
    const materials = getModelViewer()!.model!.materials;
    return materials[this.selectedMaterialIndex];
  }

  getMaterialVariant() {
    let material = this.getMaterial();
    const originalMaterial = material;

    // Creates a new material instance if it does not currently exist under the
    // variant.
    if (this.selectedVariant != null &&
        !material.hasVariant(this.selectedVariant)) {
      // Creates unique material instance for this variant if one does not
      // exist.

      const clone = getModelViewer().model!.createMaterialInstanceForVariant(
          this.selectedMaterialIndex,
          material.name + ' ' + this.selectedVariant,
          this.selectedVariant,
          true)!;

      const sourceIndex = this.originalMaterialFromCloneMap.get(material.index);
      if (sourceIndex != null) {
        this.originalMaterialFromCloneMap.set(clone.index, sourceIndex);
      } else {
        this.originalMaterialFromCloneMap.set(clone.index, material.index);
      }

      this.updateSelectableMaterials();
      // Cloned material becomes the selected material.
      this.materialSelector.selectedIndex =
          this.selectableMaterials.indexOf(clone);
      if (this.materialSelector.selectedIndex === -1) {
        console.error('Could not select the new variant material');
      }
      material = clone;
    }
    // Ensures any other variants using this material create their own
    // instance.
    const otherVariants = getModelViewer().availableVariants;
    for (const variant of otherVariants) {
      if (variant === this.selectedVariant) {
        continue;
      }
      getModelViewer().model!.createMaterialInstanceForVariant(
          this.selectedMaterialIndex,
          originalMaterial.name + ' ' + variant,
          variant,
          false);
    }

    this.requestUpdate();
    return material;
  }

  getOriginalMaterial() {
    return this.originalGltf!.materials.length > this.selectedMaterialIndex ?
        this.originalGltf!.materials[this.selectedMaterialIndex] :
        this.originalGltf!.materials[this.originalMaterialFromCloneMap.get(
            this.selectedMaterialIndex)!];
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
    const DURATION = 500;  // in milliseconds

    const material = this.getMaterial();

    const interpolateStep = (timestamp: number) => {
      // New model is loaded mid interpolation
      if (start === -1) {
        start = timestamp;
      }

      const baseColorFactor = this.getInterpolatedColor(
          originalBaseColor, timestamp - start, DURATION);
      material.pbrMetallicRoughness.setBaseColorFactor(baseColorFactor);
      const emissiveFactor = this.getInterpolatedEmissive(
          originalEmissiveFactor, timestamp - start, DURATION);
      material.setEmissiveFactor(emissiveFactor);

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
    this.alphaFactorSlider.value = baseColorFactor[3];
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

  editVariantName(currentVariant: string, newVariantName: string) {
    getModelViewer().model!.updateVariantName(currentVariant, newVariantName);
    this.selectedVariant = newVariantName;
    this.requestUpdate();
  }

  editMaterialName(_currentName: string, newName: string) {
    this.selectedMaterial.name = newName;
    this.requestUpdate();
  }

  deleteCurrentVariant() {
    const deleteVariant = this.selectedVariant;
    let nextVariant: number = 0;
    let nextVariantName: string|null = null;
    const variantCount = getModelViewer().availableVariants.length;

    if (variantCount > 1) {
      nextVariant = (this.variantSelector.selectedIndex + 1) % variantCount;
      nextVariantName = getModelViewer().availableVariants[nextVariant];
      this.onSelectVariant(nextVariantName, () => {
        getModelViewer().model!.deleteVariant(deleteVariant!);
        if (nextVariantName == null) {
          this.variantSelector.selectedIndex = 0;
        } else {
          this.variantSelector.selectedIndex =
              getModelViewer().availableVariants.indexOf(nextVariantName);
        }
      });
    } else {
      getModelViewer().model!.deleteVariant(deleteVariant!);
      this.variantSelector.selectedIndex = 0;
      this.onSelectVariant(null);
    }

    this.requestUpdate();
  }

  renderVariantsTab() {
    const hasVariants = getModelViewer().availableVariants.length > 1;
    return html`
    <me-expandable-tab tabName="Variants" .open=${hasVariants}>
      <div slot="content">
      <div class="EditableSelector" style='display: ${
        hasVariants ? '' : 'none'}'>
        <me-dropdown
          style='display: ${hasVariants ? '' : 'none'}'
          id="variant-selector"
          @select="${() => {
      const paperItem =
          this.variantSelector.selectedItem as PaperListboxElement;
      if (paperItem != null && paperItem.hasAttribute('value')) {
        const selectedVariantName = paperItem.getAttribute('value');
        if (selectedVariantName != null) {
          this.onSelectVariant(selectedVariantName);
        }
      }
    }}">${
        getModelViewer().availableVariants.map(
            (name, id) => html`<paper-item value="${name}">
            (${id}) ${name}</paper-item>
            `)}
        </me-dropdown>
        <mwc-icon-button icon="create"
        @click="${() => {
      this.editVariantNameDialog.textFieldValue = '';
      this.editVariantNameDialog.placeholder = this.selectedVariant!;
      this.editVariantNameDialog.open = true;
    }}"
        value="${this.selectedVariant}">
        </mwc-icon-button>
        <mwc-icon-button icon="delete"
        @click="${this.deleteCurrentVariant}">
        </mwc-icon-button>
        </div>
        <mwc-button
          label="Create Variant"
          id="create-variant"
          @click="${() => {
      this.createVariantNameDialog.open = true;
    }}"></mwc-button>
        </div>
    </me-expandable-tab>
    `;
  }

  validateInput(textField: TextField): boolean {
    textField.validityTransform =
        (value: string, nativeValidity: ValidityState) => {
          // Validates length.
          if (value.length < 1) {
            textField.validationMessage = `Invalid input.`;
            return {valid: false} as ValidityState;
          }

          // Verifies name is unique.
          if (getModelViewer().availableVariants.find((existingNames) => {
                return existingNames === value;
              })) {
            textField.validationMessage = `The name ${value} already exists.`;
            return {valid: false};
          }

          return nativeValidity;
        };

    return textField.reportValidity();
  }

  isValidInput(_value: string): {valid: boolean, validationMessage: string} {
    // Validates length.
    if (_value.length < 1) {
      return {valid: false, validationMessage: `Invalid input.`};
    }

    // Verifies name is unique.
    if (getModelViewer().availableVariants.find((existingNames) => {
          return existingNames === _value;
        })) {
      return {
        valid: false,
        validationMessage: `The name ${_value} already exists.`
      };
    }

    return {valid: true, validationMessage: ''};
  }

  renderEditVariantDialog() {
    return html`
      <input-dialog id="edit-variant-name" modal="true"
        placeholder="Enter Variant Name">
      </input-dialog>
    `;
  }

  renderCreateVariantDialog() {
    return html`
      <input-dialog id="create-variant-name" modal="true"
        placeholder="Enter Variant Name">
      </input-dialog>
    `;
  }

  renderEditMaterialNameDialog() {
    return html`
      <input-dialog id="edit-material-name" modal="true"
        placeholder="Enter Material Name">
      </input-dialog>
    `;
  }

  onCreateVariant(newVariantName: string) {
    if (getModelViewer().availableVariants.length === 0) {
      // Creates a default variant for existing materials to live under if
      // there were no variants in the model to begin with.
      getModelViewer().model!.createVariant('Default');
      for (const material of getModelViewer().model!.materials) {
        getModelViewer().model!.setMaterialToVariant(material.index, 'Default');
      }
    }
    getModelViewer().model!.createVariant(newVariantName);
    this.variantSelector.selectedIndex =
        getModelViewer().availableVariants.indexOf(newVariantName)!;
    this.selectedVariant = newVariantName;
    this.requestUpdate();
  }

  renderSelectMaterialTab() {
    return html`
    <me-expandable-tab tabName="Selected Material" .open=${true}>
      <div slot="content" class="EditableSelector">
      <me-dropdown
        id="material-selector"
        @select=${this.onSelectMaterial}
        >${
        this.selectableMaterials.map(
            (material, i) =>
                html`<paper-item value="${i}">(${material.index}) ${
                    material.name ? material.name :
                                    'Unnamed Material'}</paper-item>`)}
      </me-dropdown>
      <mwc-icon-button icon="create"
        @click="${() => {
      this.editMaterialNameDialog.textFieldValue = '';
      this.editMaterialNameDialog.placeholder = this.selectedMaterial!.name;
      this.editMaterialNameDialog.open = true;
    }}">
      </mwc-icon-button>
      </div>
    </me-expandable-tab>
    `;
  }

  get selectedMaterialIndex(): number {
    return this.selectableMaterials[this.materialSelector.selectedIndex].index;
  }

  set selectedMaterialIndex(index: number) {
    this.materialSelector.selectedIndex = index;
    this.onSelectMaterial();
  }

  get selectedVariant(): string|null {
    return getModelViewer().variantName;
  }

  set selectedVariant(name: string|null) {
    getModelViewer().variantName = name;
  }

  get selectedMaterial(): Material {
    return getModelViewer().model!.materials[this.selectedMaterialIndex];
  }

  firstUpdated() {
    // Enables material picking but prevents selection while dragging a model.
    let drag = false;
    getModelViewer().addEventListener('pointerdown', () => drag = false);
    getModelViewer().addEventListener('pointermove', () => drag = true);
    getModelViewer().addEventListener('pointerup', (event) => {
      if (!drag) {
        this.onClick(event);
      }
    });

    // Captures this reference for use in callbacks.
    const self = this;
    // Sets up the OnOK callback methods of the InputDialogs these
    // handle dialog results.
    this.createVariantNameDialog.OnOK = (value: string) => {
      self.onCreateVariant(value);
    };
    this.editVariantNameDialog.OnOK = (value: string) => {
      self.editVariantName(self.editVariantNameDialog.placeholder, value);
    };
    this.editMaterialNameDialog.OnOK = (value: string) => {
      self.editMaterialName(self.editMaterialNameDialog.placeholder, value);
    };

    // Sets up the onValidate callbacks for InputDialogs these let the input
    // dialog know if input is valid or not.
    this.createVariantNameDialog.onValidate = (value: string) => {
      return self.isValidInput(value);
    };
    this.editVariantNameDialog.onValidate = (value: string) => {
      return self.isValidInput(value);
    };
  }

  onClick = (event) => {
    if (!(this.parentElement as TabbedPanel).selected) {
      return;
    }
    const modelviewer = getModelViewer();
    const pickedMaterial =
        modelviewer.materialFromPoint(event.clientX, event.clientY);
    if (pickedMaterial == null) {
      return;
    }

    for (const [index, material] of this.selectableMaterials.entries()) {
      if (material === pickedMaterial) {
        this.selectedMaterialIndex = index;
        return;
      }
    }
  };

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
    const material = this.getMaterialVariant();

    material.pbrMetallicRoughness.setBaseColorFactor(this.selectedBaseColor);

    reduxStore.dispatch(dispatchModelDirty());
  }

  onRoughnessChange() {
    this.getMaterialVariant().pbrMetallicRoughness.setRoughnessFactor(
        this.selectedRoughnessFactor);
    reduxStore.dispatch(dispatchModelDirty());
  }

  onMetallicChange() {
    this.getMaterialVariant().pbrMetallicRoughness.setMetallicFactor(
        this.selectedMetallicFactor);
    reduxStore.dispatch(dispatchModelDirty());
  }

  onDoubleSidedChange(event: Event) {
    this.updateDoubleSided((event.target as HTMLInputElement).checked);
  }

  updateDoubleSided(value: boolean) {
    this.getMaterialVariant().setDoubleSided(value);
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
        this.getMaterialVariant().pbrMetallicRoughness.baseColorTexture);
  }

  onBaseColorTextureUpload(event: CustomEvent<FileDetails>) {
    this.onTextureUpload(
        event.detail,
        this.baseColorTexturePicker,
        this.getMaterialVariant().pbrMetallicRoughness.baseColorTexture);
  }

  onMetallicRoughnessTextureChange() {
    this.onTextureChange(
        this.selectedMetallicRoughnessTextureId,
        this.getMaterialVariant()
            .pbrMetallicRoughness.metallicRoughnessTexture);
  }

  onMetallicRoughnessTextureUpload(event: CustomEvent<FileDetails>) {
    this.onTextureUpload(
        event.detail,
        this.metallicRoughnessTexturePicker,
        this.getMaterialVariant()
            .pbrMetallicRoughness.metallicRoughnessTexture);
  }

  onNormalTextureChange() {
    this.onTextureChange(
        this.selectedNormalTextureId, this.getMaterialVariant().normalTexture);
  }

  onNormalTextureUpload(event: CustomEvent<FileDetails>) {
    this.onTextureUpload(
        event.detail,
        this.normalTexturePicker,
        this.getMaterialVariant().normalTexture);
  }

  onEmissiveTextureChange() {
    this.onTextureChange(
        this.selectedEmissiveTextureId,
        this.getMaterialVariant().emissiveTexture);
  }

  onEmissiveTextureUpload(event: CustomEvent<FileDetails>) {
    this.onTextureUpload(
        event.detail,
        this.emissiveTexturePicker,
        this.getMaterialVariant().emissiveTexture);
  }

  onEmissiveFactorChanged() {
    this.getMaterialVariant().setEmissiveFactor(this.selectedEmissiveFactor);
    reduxStore.dispatch(dispatchModelDirty());
  }

  onOcclusionTextureChange() {
    this.onTextureChange(
        this.selectedOcclusionTextureId,
        this.getMaterialVariant().occlusionTexture);
  }

  onOcclusionTextureUpload(event: CustomEvent<FileDetails>) {
    this.onTextureUpload(
        event.detail,
        this.occlusionTexturePicker,
        this.getMaterialVariant().occlusionTexture);
  }

  onAlphaModeSelect() {
    const selectedMode =
        ALPHA_BLEND_MODES[this.alphaModePicker.selectedIndex] as AlphaMode;
    this.alphaCutoffContainer.style.display =
        selectedMode === 'MASK' ? '' : 'none';
    const material = this.getMaterialVariant();
    material.setAlphaMode(selectedMode);
    this.alphaCutoffSlider.value = material.getAlphaCutoff();
    reduxStore.dispatch(dispatchModelDirty());
  }

  onAlphaCutoffChange() {
    this.getMaterialVariant().setAlphaCutoff(this.selectedAlphaCutoff);
    reduxStore.dispatch(dispatchModelDirty());
  }

  onAlphaFactorChange() {
    const material = this.getMaterialVariant();
    const rgba = this.selectedBaseColor;
    rgba[3] = this.alphaFactorSlider.value;
    material.pbrMetallicRoughness.setBaseColorFactor(rgba);
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

  revertAlphaFactor() {
    this.alphaFactorSlider.value =
        this.getOriginalMaterial().pbrMetallicRoughness.baseColorFactor[3];
    this.onAlphaFactorChange();
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
      <me-dropdown class="TopMargin" id="alpha-mode-picker"
        @select=${this.onAlphaModeSelect}>
        ${
        ALPHA_BLEND_MODES.map(
            mode => html`<paper-item value=${mode}>${mode}</paper-item>`)}
      </me-dropdown>
    </div>
    <div id="alpha-factor-container"}>
      <div class="SectionLabel TopMargin" id="alpha-factor-label">Alpha Factor:</div>
      <div class="MRSliderContainer">
        <mwc-icon-button class="RevertButton" id="revert-alpha-mode" icon="undo"
          title="Revert to original alpha factor"
          @click=${this.revertAlphaFactor}></mwc-icon-button>
        <me-slider-with-input class="MRSlider" id="alpha-factor" min="0.0" max="1.0"
        step="0.01" @change=${this.onAlphaFactorChange}></me-slider-with-input>
      </div>
    </div>
    <div id="alpha-cutoff-container"}>
      <div class="SectionLabel TopMargin" id="alpha-cutoff-label">Alpha Cutoff:</div>
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

  updateSelectableMaterials() {
    this.selectableMaterials = [];
    for (const material of getModelViewer()!.model!.materials) {
      if (material.isActive) {
        this.selectableMaterials.push(material);
      }
    }
  }

  async onSelectVariant(name: string|null, onApplied?: () => void) {
    const onVariantApplied = () => {
      this.updateSelectableMaterials();
      this.selectedMaterialIndex = 0;
      if (onApplied != null) {
        onApplied();
      }
    };

    getModelViewer().addEventListener(
        'variant-applied', onVariantApplied, {once: true});

    this.selectedVariant = name;
  }

  render() {
    return html`
    <div id="material-container" style="display: none">
    ${this.renderVariantsTab()}
    ${this.renderEditVariantDialog()}
    ${this.renderCreateVariantDialog()}
    ${this.renderEditMaterialNameDialog()}
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
