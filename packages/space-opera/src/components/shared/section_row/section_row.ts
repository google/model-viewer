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
import {styles} from './section_row.css.js';

/**
 * A section row with label and content.
 */
@customElement('me-section-row')
export class SectionRow extends LitElement {
  static styles = styles;

  @property({type: String}) label = '';

  render() {
    return html`
  <div class="SectionRow">
    ${this.label ? html`<div class="RowLabel">${this.label}</div>` : ''}
      <div class="RowContent">
      <slot></slot>
    </div>
  </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'me-section-row': SectionRow;
  }
}
