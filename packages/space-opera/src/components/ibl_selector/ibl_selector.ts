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

import '../shared/expandable_content/expandable_tab.js';
import '../shared/dropdown/dropdown.js';
import '../shared/section_row/section_row.js';
import '../shared/slider_with_input/slider_with_input.js';
import '../shared/checkbox/checkbox.js';
import '@polymer/paper-item';
import '@material/mwc-button';
import '../file_modal/file_modal.js';

import {customElement, html, internalProperty, query} from 'lit-element';

import {IMAGE_MIME_TYPES, ModelViewerConfig} from '@google/model-viewer-editing-adapter/lib/main.js'
import {createSafeObjectUrlFromArrayBuffer} from '@google/model-viewer-editing-adapter/lib/util/create_object_url.js'
import {EnvironmentImage} from '../../redux/environment_lighting_state.js';
import {registerStateMutator, State} from '../../redux/space_opera_base.js';
import {ConnectedLitElement} from '../connected_lit_element/connected_lit_element.js';
import {FileModalElement} from '../file_modal/file_modal.js';
import {CheckboxElement} from '../shared/checkbox/checkbox.js';
import {Dropdown} from '../shared/dropdown/dropdown.js';
import {SliderWithInputElement} from '../shared/slider_with_input/slider_with_input.js';

import {styles} from './ibl_selector.css.js';

/**
 * Dispatch an edit to model viewer environmentImage attribute
 */
export const dispatchEnvrionmentImage =
    registerStateMutator('UPDATE_IBL', (state, ibl?: string) => {
      state.config = {...state.config, environmentImage: ibl};
    });

/**
 * Dispatch an edit to model viewer exposure attribute
 */
export const dispatchExposure =
    registerStateMutator('UPDATE_EXPOSURE', (state, exposure?: number) => {
      state.config = {...state.config, exposure};
    });

const DEFAULT_EXPOSURE = 1;

/** Dispatch an edit to potential environment images to select */
export const dispatchAddEnvironmentImage = registerStateMutator(
    'UPLOAD_ENVIRONMENT_IMAGE', (state, image?: EnvironmentImage) => {
      if (!image) {
        return;
      }
      state.environmentImages = [...state.environmentImages, image];
    });

/** Dispatch an edit to model viewer exposure attribute */
export const dispatchUseEnvAsSkybox = registerStateMutator(
    'SET_USE_ENV_AS_SKYBOX', (state, useEnvAsSkybox?: boolean) => {
      state.config = {...state.config, useEnvAsSkybox};
    });

/**
 * Dispatch an edit to model viewer shadow intensity
 */
export const dispatchShadowIntensity = registerStateMutator(
    'UPDATE_SHADOW_INTENSITY', (state, shadowIntensity?: number) => {
      state.config = {...state.config, shadowIntensity};
    });

const DEFAULT_SHADOW_INTENSITY = 0;

/**
 * Dispatch an edit to model viewer shadow softness
 */
export const dispatchShadowSoftness = registerStateMutator(
    'UPDATE_SHADOW_SOFTNESS', (state, shadowSoftness?: number) => {
      state.config = {...state.config, shadowSoftness};
    });

const DEFAULT_SHADOW_SOFTNESS = 1;

// TODO:: Support HDR images
const ACCEPT_IMAGE_TYPE = IMAGE_MIME_TYPES.join(',');

/**
 * IBL environment selector.
 */
@customElement('me-ibl-selector')
export class IblSelector extends ConnectedLitElement {
  static styles = styles;

  @internalProperty() config: ModelViewerConfig = {};
  @internalProperty() environmentImages: EnvironmentImage[] = [];

  @query('me-slider-with-input#exposure')
  exposureSlider!: SliderWithInputElement;
  @query('me-file-modal#imageUpload') imageFileModal!: FileModalElement;
  @query('me-checkbox#skybox') skyboxCheckbox!: CheckboxElement;

  @query('me-slider-with-input#shadow-intensity')
  shadowIntensitySlider!: SliderWithInputElement;
  @query('me-slider-with-input#shadow-softness')
  shadowSoftnessSlider!: SliderWithInputElement;

  // Specifically overriding a super class method.
  // tslint:disable-next-line:enforce-name-casing
  async _getUpdateComplete() {
    await super._getUpdateComplete();
    await this.exposureSlider.updateComplete;
    await this.skyboxCheckbox.updateComplete;
    await this.shadowIntensitySlider.updateComplete;
    await this.shadowSoftnessSlider.updateComplete;
  }

  stateChanged(state: State) {
    this.config = state.config;
    this.environmentImages = state.environmentImages;
  }

  onSelectEnvironmentImage(event: CustomEvent) {
    const dropdownElement = event.target as Dropdown;
    // Polymer dropdown emits an deselect event before selection, we need to
    // filter that out
    if (dropdownElement.selectedItem &&
        dropdownElement.selectedItem.getAttribute('value') !==
            this.config.environmentImage) {
      dispatchEnvrionmentImage(
          dropdownElement.selectedItem.getAttribute('value') || undefined);
    }
  }

  onExposureChange() {
    dispatchExposure(this.exposureSlider.value);
  }

  onUseEnvAsSkyboxChange() {
    dispatchUseEnvAsSkybox(this.skyboxCheckbox.checked);
  }

  onShadowIntensityChange() {
    dispatchShadowIntensity(this.shadowIntensitySlider.value);
  }

  onShadowSoftnessChange() {
    dispatchShadowSoftness(this.shadowSoftnessSlider.value);
  }

  // TODO:: Add test to this.
  async openFileModal() {
    const files = await this.imageFileModal.open();

    if (files.length === 0) {
      return;
    }

    const name = (files[0] as File).name;

    const arrayBuffer = await files[0].arrayBuffer();
    const url = createSafeObjectUrlFromArrayBuffer(arrayBuffer);
    dispatchAddEnvironmentImage({uri: url.unsafeUrl, name});

    dispatchEnvrionmentImage(url.unsafeUrl);
  }

  // TODO: On snippet input if IBL is defined, select the
  // correct option from the dropdown.
  render() {
    const selectedIndex = this.config.environmentImage ?
        this.environmentImages.findIndex(
            (image) => image.uri === this.config.environmentImage) +
            1 :
        0;  // 0 is the default state
    return html`
      <me-expandable-tab tabName="Lighting">
        <div slot="content">
          <div class="HeaderLabel">Environment Image:</div>
          <me-dropdown
            class="EnvironmnetImageDropdown"
            selectedIndex=${selectedIndex}
            @select=${this.onSelectEnvironmentImage}>
            <paper-item>Default</paper-item>
            ${
        this.environmentImages.map(
            environmentImage => html`<paper-item value=${
                environmentImage.uri}>${environmentImage.name}</paper-item>`)}
          </me-dropdown>
          <mwc-button class="UploadButton" id="uploadButton" unelevated
        icon="cloud_upload" @click="${this.openFileModal}">Upload</mwc-button>
          <me-section-row class="Row" label="Exposure">
            <me-slider-with-input min="0" max="2" step="0.01" id="exposure"
              @change="${this.onExposureChange}"
              value="${this.config.exposure ?? DEFAULT_EXPOSURE}">
            </me-slider-with-input>
          </me-section-row>
          <me-section-row class="Row" label="Use Environment as Skybox">
            <me-checkbox id="skybox"
            ?checked="${!!this.config.useEnvAsSkybox}"
            @change=${this.onUseEnvAsSkyboxChange}></me-checkbox>
            ${
        selectedIndex === 0 && this.config.useEnvAsSkybox ?
            html`<br/><div><small>Choose a non-default environment</small></div>` :
            html``}
          </me-section-row>

          <me-section-row class="Row" label="Shadow Intensity">
            <me-slider-with-input min="0" max="1" step="0.01" id="shadow-intensity"
              @change="${this.onShadowIntensityChange}"
              value="${
        this.config.shadowIntensity ?? DEFAULT_SHADOW_INTENSITY}">
            </me-slider-with-input>
          </me-section-row>

          <me-section-row class="Row" label="Shadow Softness">
            <me-slider-with-input min="0" max="1" step="0.01" id="shadow-softness"
              @change="${this.onShadowSoftnessChange}"
              value="${this.config.shadowSoftness ?? DEFAULT_SHADOW_SOFTNESS}">
            </me-slider-with-input>
          </me-section-row>

          <me-file-modal id="imageUpload" accept=${ACCEPT_IMAGE_TYPE}>
          </me-file-modal>
        </div>
      </me-expandable-tab>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'me-ibl-selector': IblSelector;
  }
}
