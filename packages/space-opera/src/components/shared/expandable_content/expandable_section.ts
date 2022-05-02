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

import {styles} from './expandable_section.css.js';

/**
 * An expandable content section.
 */
@customElement('me-expandable-section')
export class ExpandableSection extends LitElement {
  @property({type: Boolean}) open = false;
  @property({type: Boolean}) sticky? = false;

  static styles = styles;

  render() {
    const stickyClass = this.sticky ? 'sticky' : '';
    return html`
    <div class="SectionContent ${stickyClass}" ?open=${this.open}>
        <slot name="content"></slot>
    </div>
   `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'me-expandable-section': ExpandableSection;
  }
}
