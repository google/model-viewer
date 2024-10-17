/* @license
 * Copyright 2019 Google LLC. All Rights Reserved.
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
 */

import {html, ReactiveElement} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import ModelViewerElementBase from './model-viewer-base.js';

/**
 * Definition for a basic <extra-model> element.
 */
@customElement('extra-model')
export class ExtraModelElement extends ReactiveElement {
  @property({type: String}) src: string|null = null;

  render() {
    return html`<slot> </slot>`;
  }

  firstUpdated() {
    // Get the parent <model-viewer> element
    const modelViewer = this.closest('model-viewer') as ModelViewerElementBase;
    if (modelViewer) {
      // Add this extra model to the scene
      modelViewer.addExtraModel(this);
    } else {
      console.error('<extra-model> must be a child of <model-viewer>');
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'extra-model': ExtraModelElement;
  }
}
