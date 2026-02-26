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

import {html} from 'lit';
import {customElement, state, query} from 'lit/decorators.js';
import {reduxStore} from '../../space_opera_base';
import {BestPracticesState, State} from '../../types';
import {ConnectedLitElement} from '../connected_lit_element/connected_lit_element';
import {CheckboxElement} from '../shared/checkbox/checkbox';
import {dispatchSetARButton, dispatchSetARPrompt, dispatchSetProgressBar, getBestPractices} from './reducer';

/**
 * A section of best practices to enable or disable.
 */
@customElement('best-practices')
export class BestPractices extends ConnectedLitElement {
  @state() bestPractices?: BestPracticesState;

  @query('me-checkbox#progress-bar') progressBarCheckbox!: CheckboxElement;
  @query('me-checkbox#ar-button') arButtonCheckbox!: CheckboxElement;
  @query('me-checkbox#ar-prompt') arPromptCheckbox!: CheckboxElement;

  stateChanged(state: State) {
    this.bestPractices = getBestPractices(state);
  }

  onProgressBarChange() {
    reduxStore.dispatch(
        dispatchSetProgressBar(this.progressBarCheckbox.checked));
  }

  onARButtonChange() {
    reduxStore.dispatch(dispatchSetARButton(this.arButtonCheckbox.checked));
  }

  onARPromptChange() {
    reduxStore.dispatch(dispatchSetARPrompt(this.arPromptCheckbox.checked));
  }

  render() {
    return html`
    <div style="font-size: 14px; font-weight: 500; margin: 0px 0px 10px 0px;">
      Use Custom:
    </div>
    <me-checkbox
      id="progress-bar"
      label="Progress Bar"
      ?checked="${this.bestPractices?.progressBar}"
      @change=${this.onProgressBarChange}
      >
    </me-checkbox>
    <me-checkbox
      id="ar-button"
      label="AR Button"
      ?checked="${this.bestPractices?.arButton}"
      @change=${this.onARButtonChange}
      >
    </me-checkbox>
    <me-checkbox
      id="ar-prompt"
      label="AR Prompt"
      ?checked="${this.bestPractices?.arPrompt}"
      @change=${this.onARPromptChange}
      >
    </me-checkbox>
    `;
  }
}


declare global {
  interface HTMLElementTagNameMap {
    'best-practices': BestPractices;
  }
}
