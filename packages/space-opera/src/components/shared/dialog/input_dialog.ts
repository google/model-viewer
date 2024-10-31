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

import '@material/web/all.js';

import {Button} from '@material/web/button/internal/button';
import {Dialog} from '@material/web/dialog/internal/dialog';
import {TextField} from '@material/web/textfield/internal/text-field';
import {html, LitElement} from 'lit';
import {customElement, property, query} from 'lit/decorators.js';



/**
 * A styled checkbox with label
 */
@customElement('input-dialog')
export class InputDialog extends LitElement {
  /** Proxies to md-checkbox's checked field */
  @property({type: Boolean}) openDialog = false;
  @property({type: Boolean}) modal = false;
  @property({type: String}) placeholder = 'Enter Value';
  @property({attribute: false}) OnOK = (_value: string) => {};
  @property({attribute: false})
  onValidate = (_value: string) => {
    return {valid: true, validationMessage: ''};
  };
  @query('md-textfield') textfield!: TextField;
  @query('md-button') button!: Button;
  @query('md-dialog') inputDialog!: Dialog;

  onClick = () => {
    this.OnOK(this.textfield.value);
  };

  get open() {
    return this.inputDialog.open;
  }

  set open(value: boolean) {
    this.textfield.setCustomValidity('');
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
    <md-dialog scrimClickAction="${this.modal ? '' : 'close'}">
      <md-textfield placeholder=${
        this.placeholder} autoValidate="true"></md-textfield>
      <md-button
        slot="primaryAction"
        dialogAction="ok"
        disabled="true"
        @click=${this.onClick}>
        Ok
      </md-button>
      <md-button
              slot="secondaryAction"
              dialogAction="cancel">
          Cancel
      </md-button>
    </md-dialog>
     `;
  }

  firstUpdated() {
    this.textfield.addEventListener('input', (e: Event) => {
      const button = e.target as Button;
      const {valid, validationMessage} = this.onValidate(this.textfield.value);
      if (!valid) {
        button.disabled = true;
        this.textfield.errorText = validationMessage;
        return {valid: false};
      }
      button.disabled = false;
      return {valid: true, validationMessage: ''};
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'input-dialog': InputDialog;
  }
}
