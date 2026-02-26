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

import '@polymer/paper-radio-button';
import '@polymer/paper-radio-group';

import {html, LitElement} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {styles} from './radio_group.css.js';

/**
 * LitElement for a radio group
 */
@customElement('me-radio-group')
export class RadioGroup extends LitElement {
  @property({type: String}) selected = '';

  static styles = styles;

  render() {
    return html`
      <paper-radio-group selected="${this.selected}">
        <slot></slot>
      </paper-radio-group>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'me-radio-group': RadioGroup;
  }
}
