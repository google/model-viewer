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

import '@material/mwc-textfield';

import {Button} from '@material/mwc-button';
import {Dialog} from '@material/mwc-dialog';
import {TextField} from '@material/mwc-textfield';
import {html, LitElement} from 'lit';
import {customElement, property, query} from 'lit/decorators.js';



/**
 * A styled checkbox with label
 */
@customElement('input-dialog')
export class InputDialog extends LitElement {
  /** Proxies to mwc-checkbox's checked field */
  @property({type: Boolean}) openDialog = false;
  @property({type: Boolean}) modal = false;
  @property({type: String}) placeholder = 'Enter Value';
  @property({attribute: false}) OnOK = (_value: string) => {};
  @property({attribute: false})
  onValidate = (_value: string) => {
    return {valid: true, validationMessage: ''};
  };
  @query('mwc-textfield') textfield!: TextField;
  @query('mwc-button') button!: Button;
  @query('mwc-dialog') inputDialog!: Dialog;

  onClick = () => {
    this.OnOK(this.textfield.value);
  };

  get open() {
    return this.inputDialog.open;
  }

  set open(value: boolean) {
    this.textfield.validationMessage = '';
    this.textfield.value = '';
    this.textfield.placeholder = this.placeholder;
    this.inputDialog.open = value;
  }

  get textFieldValue() {
    return this.textfield.value;
  }

  set textFieldValue(value: string) {
    this.textfield.value = value;
  }

  render() {
    return html`
    <mwc-dialog scrimClickAction="${this.modal ? '' : 'close'}">
      <mwc-textfield placeholder=${
        this.placeholder} autoValidate="true"></mwc-textfield>
      <mwc-button
        slot="primaryAction"
        dialogAction="ok"
        disabled="true"
        @click=${this.onClick}>
        Ok
      </mwc-button>
      <mwc-button
              slot="secondaryAction"
              dialogAction="cancel">
          Cancel
      </mwc-button>
    </mwc-dialog>
     `;
  }

  firstUpdated() {
    const self = this;
    this.textfield.validityTransform =
        (value: string, nativeValidity: ValidityState) => {
          const {valid, validationMessage} = self.onValidate(value);
          if (!valid) {
            self.button.disabled = true;
            this.textfield.validationMessage = validationMessage;
            return {valid: false};
          }

          self.button.disabled = false;
          return nativeValidity;
        };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'input-dialog': InputDialog;
  }
}
