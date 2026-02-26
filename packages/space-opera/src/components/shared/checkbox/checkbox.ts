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

import '@material/mwc-checkbox';
import {Checkbox} from '@material/mwc-checkbox';

import {html, LitElement} from 'lit';
import {customElement, property, query} from 'lit/decorators.js';

import {styles} from './checkbox.css.js';

/**
 * A styled checkbox with label
 */
@customElement('me-checkbox')
export class CheckboxElement extends LitElement {
  static styles = styles;

  /** Proxies to mwc-checkbox's checked field */
  @property({type: Boolean}) checked = false;
  @property({type: String}) label = '';
  @query('mwc-checkbox') checkbox!: Checkbox;

  // Specifically overriding a super class method.
  // tslint:disable-next-line:enforce-name-casing
  async getUpdateComplete() {
    const noTrigger = await super.getUpdateComplete();
    await this.checkbox.updateComplete;
    return noTrigger;
  }

  render() {
    return html`
  <mwc-checkbox ?checked="${this.checked}" @change="${
        this.onCheckedChange}"></mwc-checkbox>
  <div class="Label">
    ${this.label}
  </div>
    `;
  }

  onCheckedChange() {
    this.checked = this.checkbox.checked;
    this.dispatchEvent(new Event('change'));
  }

  // Convenience function for testing
  click() {
    this.checkbox.click();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'me-checkbox': CheckboxElement;
  }
}
