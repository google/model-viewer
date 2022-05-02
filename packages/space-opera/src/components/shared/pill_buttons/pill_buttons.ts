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

import {html, LitElement} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {styles} from './pill_buttons.css.js';

/**
 * A pill radio button group. The closest material design analog is probably
 * a choice chip, but those are yet to be implemented in MWC; for now just copy
 * over the Spacecraft implementation.
 */
@customElement('me-pill-buttons')
export class PillButtons extends LitElement {
  static styles = styles;

  @property({type: String}) name = '';

  get buttons() {
    const slot = this.shadowRoot!.querySelector('slot');
    return slot &&
        slot.assignedElements().filter(e => e instanceof PillButton) ||
        [];
  }

  render() {
    return html`
        <div class="PillButtons">
          ${this.buttons.map(button => this.renderButton(button as PillButton))}
        </div>

        <slot
          @slotchange=${() => this.requestUpdate()}
          style='display:none'></slot>
        `;
  }

  renderButton(button: PillButton) {
    return html`
        <div class="PillRadio">
          <input type="radio"
            name="${this.name}"
            class="PillRadioInput"
            value="${button.value}"
            id="${button.id}"
            ?checked=${button.checked}>
          <label
            class="RadioLabel"
            for="${button.id}" value="${button.value}">
            ${button.textContent}
          </label>
        </div>`;
  }
}

/**
 * A single pill button.
 */
@customElement('me-pill-button')
export class PillButton extends LitElement {
  @property({type: String}) id = '';
  @property({type: String}) value = '';
  @property({type: Boolean}) checked = false;

  render() {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'me-pill-button': PillButton;
    'me-pill-buttons': PillButtons;
  }
}
