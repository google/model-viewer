/**
 * @license
 * Copyright 2021 Google LLC. All Rights Reserved.
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

import {customElement, html, internalProperty, LitElement} from 'lit-element';

/**
 * A section of best practices to enable or disable.
 */
@customElement('best-practices')
export class BestPractices extends LitElement {
  @internalProperty() progressBar: boolean = false;
  @internalProperty() arButton: boolean = false;

  onProgressBarChange() {
    this.progressBar = !this.progressBar;
  }

  onARButtonChange() {
    this.arButton = !this.arButton;
  }

  render() {
    return html`
    <div style="font-size: 14px; font-weight: 500; margin: 16px 0px 10px 0px;">
      Override Default Slots:
    </div> 
    <me-checkbox 
      id="progress-bar" 
      label="Progress Bar"
      ?checked="${this.progressBar}"
      @change=${this.onProgressBarChange}
      >
    </me-checkbox>
    <me-checkbox 
      id="ar-button" 
      label="AR Button"
      ?checked="${this.arButton}"
      @change=${this.onARButtonChange}
      >
    </me-checkbox>
    <div style="margin-bottom: 50px;"></div>
    `;
  }
}


declare global {
  interface HTMLElementTagNameMap {
    'best-practices': BestPractices;
  }
}
