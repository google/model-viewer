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

import '@material/mwc-switch';
import './expandable_section.js';
import {Switch} from '@material/mwc-switch';

import {html, LitElement} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {styles} from './expandable_switch.css.js';

/**
 * An expandable switch.
 */
@customElement('me-expandable-switch')
export class ExpandableSwitch extends LitElement {
  @property({type: Boolean}) open = false;
  @property({type: String}) label = '';

  static styles = styles;

  render() {
    return html`
  <div class="LabeledSwitchContainer exportLabeledSwitchContainer">
    <div class="SwitchLabel exportSwitchLabel">
      ${this.label}
    </div>
    <mwc-switch @change="${this.onChange}">
    </mwc-switch>
  </div>

  <me-expandable-section ?open=${this.open}>
    <span slot="content">
      <slot name="content"></slot>
    </span>
  </me-expandable-section>

  <div class="Spacer"></div>
   `;
  }

  protected onChange(event: Event) {
    const checkbox = event.target as Switch;
    this.open = checkbox.selected;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'me-expandable-switch': ExpandableSwitch;
  }
}
