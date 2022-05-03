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

import '../shared/expandable_content/expandable_tab.js';
import '../shared/section_row/section_row.js';
import '@material/mwc-icon-button';

import {html, LitElement, PropertyValues} from 'lit';
import {customElement, property, query} from 'lit/decorators.js';

import {reduxStore} from '../../space_opera_base.js';

import {hotspotEditorStyles} from '../../styles.css.js';
import {dispatchRemoveHotspot, dispatchUpdateHotspot} from './reducer.js';
import {HotspotConfig} from './types.js';

/** A editor card for a single hotspot */
@customElement('me-hotspot-editor')
export class HotspotEditorElement extends LitElement {
  static styles = hotspotEditorStyles;

  @property({type: Object}) config?: HotspotConfig;
  @query('textarea#annotation') annotationInput!: HTMLTextAreaElement;

  updated(properties: PropertyValues) {
    if (properties.has('config')) {
      this.annotationInput.value = this.config?.annotation || '';
    }
  }

  render() {
    if (!this.config)
      return html``;

    return html`
    <me-section-row label="Label:">
      <textarea id="annotation" @input=${this.onAnnotationInput}>${
        this.config.annotation}</textarea>
      <mwc-icon-button id="remove-hotspot"
        icon="delete"
        @click="${this.onRemoveHotspot}"></mwc-icon-button>
    </me-section-row>
    `;
  }

  onAnnotationInput() {
    if (!this.annotationInput)
      return;
    const newConfig = {
      ...this.config,
      annotation: this.annotationInput.value
    } as HotspotConfig;
    reduxStore.dispatch(dispatchUpdateHotspot(newConfig));
  }

  onRemoveHotspot() {
    if (!this.config) {
      throw new Error('Invalid config');
    }
    reduxStore.dispatch(dispatchRemoveHotspot(this.config.name));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'me-hotspot-editor': HotspotEditorElement;
  }
}
