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
import '../../shared/expandable_content/expandable_tab.js';
import '../../shared/section_row/section_row.js';
import '../../shared/slider_with_input/slider_with_input.js';
import '../../shared/checkbox/checkbox.js';

import {html} from 'lit';
import {state, query} from 'lit/decorators.js';

import {Limits} from '../../config/types.js';
import {ConnectedLitElement} from '../../connected_lit_element/connected_lit_element.js';
import {getModelViewer} from '../../model_viewer_preview/reducer.js';
import {SliderWithInputElement} from '../../shared/slider_with_input/slider_with_input.js';

import {styles} from './limits_base.css.js';


/** Abstract component that can be extended for editing scalar limits. */
export abstract class LimitsBase extends ConnectedLitElement {
  static styles = [styles];

  @state() limitsProperty?: Limits;

  abstract get label(): string;
  abstract get minimumLabel(): string;
  abstract get maximumLabel(): string;
  abstract get absoluteMinimum(): number;
  abstract get absoluteMaximum(): number;
  abstract get currentPreviewValue(): number;
  abstract dispatchLimits(limits?: Limits): void;

  get decimalPlaces(): number {
    return 0;
  }

  get sliderStep(): number {
    return 1;
  }

  @query('#minimum') minimumInput!: SliderWithInputElement;
  @query('#maximum') maximumInput!: SliderWithInputElement;
  @query('#limit-enabled') enabledInput!: HTMLInputElement;

  get inputLimits() {
    if (!this.maximumInput || !this.minimumInput || !this.enabledInput) {
      throw new Error('Rendering not complete');
    }

    return {
      enabled: this.enabledInput.checked,
      min: this.minimumInput.value,
      max: this.maximumInput.value,
    };
  }

  onToggle(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;

    if (!this.limitsProperty) {
      this.limitsProperty = {
        enabled: checked,
        min: this.absoluteMinimum,
        max: this.absoluteMaximum,
      };
    } else {
      this.limitsProperty = {...this.limitsProperty, enabled: checked};
    }
    this.dispatchLimits();
  }

  onSetMin() {
    this.limitsProperty!.min = this.currentPreviewValue;
    this.dispatchLimits();
  }

  onSetMax() {
    this.limitsProperty!.max = this.currentPreviewValue;
    this.dispatchLimits();
  }

  onMinimumInputChange() {
    if (this.limitsProperty == null) {
      return;
    }
    this.limitsProperty.min = this.minimumInput.value;
    // Push max if needed
    this.limitsProperty.max =
        Math.max(this.limitsProperty.max, this.limitsProperty.min);
    this.dispatchLimits();
  }

  onMaximumInputChange() {
    if (this.limitsProperty == null) {
      return;
    }
    this.limitsProperty.max = this.maximumInput.value;
    // Push min if needed
    this.limitsProperty.min =
        Math.min(this.limitsProperty.max, this.limitsProperty.min);
    this.dispatchLimits();
  }

  render() {
    return html`
    <me-checkbox
      id="limit-enabled"
      label=${this.label}
      ?checked="${!!this.limitsProperty?.enabled}"
      @change=${this.onToggle}>
    </me-checkbox>
    ${this.renderLimits()}
`;
  }

  renderLimits() {
    if (!this.limitsProperty?.enabled || !getModelViewer())
      return html``;

    return html`
    <me-section-row label="${this.minimumLabel}">
      <div class="LabelRowContent">
        <mwc-button id="set-min-button" class="SetButton" unelevated @click="${
        this.onSetMin}">Set to ${
        this.currentPreviewValue.toFixed(this.decimalPlaces)}</mwc-button>
      </div>
    </me-section-row>

    <me-slider-with-input
      class="LimitSlider"
      id="minimum"
      min=${this.absoluteMinimum} max=${this.absoluteMaximum} step="${
        this.sliderStep}"
      value=${this.limitsProperty.min}
      @change=${this.onMinimumInputChange}>
    </me-slider-with-input>

    <me-section-row class="MaxLabelRow" label="${this.maximumLabel}">
      <div class="LabelRowContent">
        <mwc-button id="set-max-button" class="SetButton" unelevated @click="${
        this.onSetMax}">Set to ${
        this.currentPreviewValue.toFixed(this.decimalPlaces)}</mwc-button>
      </div>
    </me-section-row>

    <me-slider-with-input
      class="LimitSlider"
      id="maximum"
      min=${this.absoluteMinimum} max=${this.absoluteMaximum} step="${
        this.sliderStep}"
      value=${this.limitsProperty.max}
      @change=${this.onMaximumInputChange}>
    </me-slider-with-input>
    `;
  }
}
