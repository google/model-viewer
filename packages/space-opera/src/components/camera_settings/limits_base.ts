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
import '../shared/expandable_content/expandable_tab.js';
import '../shared/section_row/section_row.js';
import '../shared/slider_with_input/slider_with_input.js';
import '../shared/checkbox/checkbox.js';

import {html, query} from 'lit-element';

import {Limits} from '../../redux/state_types.js';
import {ConnectedLitElement} from '../connected_lit_element/connected_lit_element.js';
import {SliderWithInputElement} from '../shared/slider_with_input/slider_with_input.js';
import {styles} from './limits_base.css.js';

/** Abstract component that can be extended for editing scalar limits. */
export abstract class LimitsBase extends ConnectedLitElement {
  static get styles() {
    return styles;
  }

  abstract get label(): string;
  abstract get absoluteMinimum(): number;
  abstract get absoluteMaximum(): number;
  abstract get currentPreviewValue(): number;
  abstract get limitsProperty(): Limits|undefined;
  abstract dispatchLimits(limits?: Limits): void;

  get decimalPlaces(): number {
    return 0;
  }

  get sliderStep(): number {
    return 1;
  }

  @query('#minimum') minimumInput?: SliderWithInputElement;
  @query('#maximum') maximumInput?: SliderWithInputElement;
  @query('#limit-enabled') enabledInput?: HTMLInputElement;

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
      const newLimits = {
        enabled: checked,
        min: this.absoluteMinimum,
        max: this.absoluteMaximum,
      };
      this.dispatchLimits(newLimits);
    } else {
      this.dispatchLimits({...this.limitsProperty, enabled: checked});
    }
  }

  onSetMin() {
    this.dispatchLimits({...this.inputLimits, min: this.currentPreviewValue});
  }

  onClearMin() {
    this.dispatchLimits({...this.inputLimits, min: this.absoluteMinimum});
  }

  onSetMax() {
    this.dispatchLimits({...this.inputLimits, max: this.currentPreviewValue});
  }

  onClearMax() {
    this.dispatchLimits({...this.inputLimits, max: this.absoluteMaximum});
  }

  onMinimumInputChange() {
    const limits = this.inputLimits;
    // Push max if needed
    limits.max = Math.max(limits.max, limits.min);
    this.dispatchLimits(limits);
  }

  onMaximumInputChange() {
    const limits = this.inputLimits;
    // Push min if needed
    limits.min = Math.min(limits.max, limits.min);
    this.dispatchLimits(limits);
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
    if (!this.limitsProperty?.enabled) return html``;

    return html`
    <me-section-row label="Minimum">
      <div class="LabelRowContent">
        <mwc-button id="clear-min-button" unelevated icon="cancel" @click="${
        this.onClearMin}"></mwc-button>
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

    <me-section-row class="MaxLabelRow" label="Maximum">
      <div class="LabelRowContent">
        <mwc-button id="clear-max-button" unelevated icon="cancel" @click="${
        this.onClearMax}"></mwc-button>
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
