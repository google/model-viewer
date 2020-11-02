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

import {customElement, html, LitElement, property} from 'lit-element';

import {styles} from './styles.css.js';

/**
 * A styled checkbox with label
 */
@customElement('me-card')
export class CardElement extends LitElement {
  @property({type: String}) title = '';
  static styles = styles;

  /** Proxies to mwc-checkbox's checked field */
  @property({type: Boolean}) checked = false;
  render() {
    return html`
    <div class="card">
      <div class="container">
        <div class="header">${this.title}</div> 
        <div class="content-container">
          <span slot="content">
            <slot name="content"></slot>
          </span>
        </div>
      </div>
    </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'me-card': CardElement;
  }
}
