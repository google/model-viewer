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

import './expandable_section.js';
import '@material/mwc-icon';

import {customElement, html, LitElement, property} from 'lit-element';

import {styles} from './expandable_tab.css.js';

/**
 * An expandable tab with a label and an arrow icon indicating its expanded
 * state.
 */
@customElement('me-expandable-tab')
export class ExpandableTab extends LitElement {
  @property({type: String}) tabName = '';
  @property({type: Boolean}) open = false;
  @property({type: Boolean}) enabled = true;

  static styles = styles;

  render() {
    if (!this.enabled) {
      return html`
    <div data-element-type="expandableTab">
      <div class="TabHeader DisabledTabHeader">
        <span class="TabLabel">
          ${this.tabName}
          <slot name="tooltip"></slot>
        </span>
      </div>
    </div>
  `;
    }
    return html`
  <div data-element-type="expandableTab">
    <div class="TabHeader" @click="${this.toggle}">
      <span class="TabLabel">
        ${this.tabName}
        <slot name="tooltip"></slot>
      </span>

      <div class="IconArea">
        <mwc-icon>
        ${this.open ? html`keyboard_arrow_up` : html`keyboard_arrow_down`}
        </mwc-icon>
      </div>
    </div>
  </div>

  <me-expandable-section ?open=${this.open}>
    <span slot="content">
      <slot name="content"></slot>
    </span>
  </me-expandable-section>
  <div class="Spacer"></div>
        `;
  }

  toggle() {
    this.open = !this.open;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'me-expandable-tab': ExpandableTab;
  }
}
