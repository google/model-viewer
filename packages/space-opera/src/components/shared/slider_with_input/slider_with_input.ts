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

import '@polymer/paper-slider';
import '@material/mwc-textfield';

import {PaperSliderElement} from '@polymer/paper-slider';
import {html, LitElement} from 'lit';
import {customElement, property, query} from 'lit/decorators.js';

import {clamp} from '../../utils/reducer_utils.js';

import {styles} from './slider_with_input.css.js';

/**
 * LitElement for a slider and input box pair that should always stay in sync
 * with each other.
 */
@customElement('me-slider-with-input')
export class SliderWithInputElement extends LitElement {
  @property({type: Number}) min = 0;
  @property({type: Number}) max = 10;
  @property({type: Number}) step = 1;
  @property({type: Number}) value = 0;
  @property({type: String}) inputLabel = '';
  @property({type: Boolean}) disabled = false;

  @query('paper-slider') slider!: PaperSliderElement;
  @query('input') input!: HTMLInputElement;

  static styles = styles;

  updated() {
    this.value = clamp(this.value, this.min, this.max);

    // Force input value to update, this is necessary as programmatic value
    // update is disabled after user keyboard input
    this.input.value = String(this.value);
  }

  onSliderChange(event: CustomEvent) {
    event.stopPropagation();  // Retarget input event
    this.value = this.slider.immediateValue!;
    this.dispatchEvent(new Event('change'));
  }

  onInputChange(event: InputEvent) {
    event.stopPropagation();  // Retarget input event

    const newNumber = Number(this.input.value);
    this.value =
        clamp(isFinite(newNumber) ? newNumber : this.value, this.min, this.max);

    this.dispatchEvent(new Event('change'));
  }

  render() {
    return html`
    <div class="Container">
      <paper-slider
        class="Slider"
        value="${this.value}"
        min="${this.min}"
        max="${this.max}"
        step="${this.step}"
        secondary-progress="-180"
        @immediate-value-change=${this.onSliderChange}
        @change=${this.onSliderChange}></paper-slider>

      <div class="InputContainer">
        <input type="number"
          class="InlineInput"
          value="${String(this.value)}"
          step="${this.step}"
          min="${this.min}" max="${this.max}"
          @change="${this.onInputChange}"
          ?disabled=${this.disabled}>
      </div>
    </div>`;
  }

  // Convenience function for testing
  clickTo(value: number) {
    this.value = value;
    this.dispatchEvent(new Event('change'));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'me-slider-with-input': SliderWithInputElement;
  }
}
