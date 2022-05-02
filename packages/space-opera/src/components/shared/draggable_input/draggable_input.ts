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

import {checkFinite} from '../../utils/reducer_utils.js';

import {styles} from './draggable_input.css.js';

/**
 * A draggable input tag.
 */
@customElement('me-draggable-input')
export class DraggableInput extends LitElement {
  static styles = styles;

  @property({type: Number}) value = 0;
  @property({type: String}) innerLabel = 'X';
  @property({type: Number}) min = 0;
  @property({type: Number}) max = 100;
  @property({type: Number}) dragStepSize = 1;
  @property({type: Number}) precision = 2;

  private readonly bodyMoveHandler =
      this.onDocumentBodyMove.bind(this);                       // NOTYPO
  private readonly mouseUpHandler = this.onMouseup.bind(this);  // NOTYPO
  private inputElement?: HTMLInputElement;
  private startingDragX: number = 0;
  private startingDragValue: number = 0;

  firstUpdated() {
    this.inputElement =
        this.shadowRoot!.querySelector('input') as HTMLInputElement;
  }

  render() {
    return html`
  <input class="InlineInput exportInputInlineInput"
         type="number"
         @change="${this.onChange}"
         .value="${this.value.toFixed(this.precision)}"
         .step="${String(Math.pow(10, -this.precision))}">
  <div class="InlineLabel exportInputInlineLabel" @mousedown="${
        this.onMousedown}">
    ${this.innerLabel}
  </div>
    `;
  }

  onChange() {
    const numValue = Number(this.inputElement?.value);
    checkFinite(numValue);
    this.setValue(numValue);
  }

  onMousedown(e: MouseEvent) {
    document.body.addEventListener('mousemove', this.bodyMoveHandler);
    document.body.addEventListener('mouseup', this.mouseUpHandler);
    this.startingDragX = e.clientX;
    this.startingDragValue = Number(this.inputElement!.value);
  }

  onMouseup() {
    document.body.removeEventListener('mousemove', this.bodyMoveHandler);
  }

  onDocumentBodyMove(e: MouseEvent) {
    const currentX = e.clientX;
    this.setValue(
        this.startingDragValue +
        Math.round((currentX - this.startingDragX)) * this.dragStepSize);
  }

  setValue(value: number) {
    this.value = Math.min(Math.max(value, this.min), this.max);
    this.dispatchEvent(new CustomEvent('change'));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'me-draggable-input': DraggableInput;
  }
}
