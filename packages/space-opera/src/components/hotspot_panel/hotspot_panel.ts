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
import './hotspot_editor.js';
import '@material/mwc-button';

import {html} from 'lit';
import {customElement, state} from 'lit/decorators.js';

import {reduxStore} from '../../space_opera_base.js';
import {State} from '../../types.js';
import {ConnectedLitElement} from '../connected_lit_element/connected_lit_element.js';

import {dispatchUpdateHotspotMode, getHotspotMode, getHotspots} from './reducer.js';
import {HotspotConfig} from './types.js';

/** Hotspot panel. */
@customElement('me-hotspot-panel')
export class HotspotPanel extends ConnectedLitElement {
  @state() addHotspotMode = false;
  @state() hotspots: HotspotConfig[] = [];

  stateChanged(state: State) {
    this.addHotspotMode = getHotspotMode(state) || false;
    this.hotspots = getHotspots(state);
  }

  onAddHotspot() {
    reduxStore.dispatch(dispatchUpdateHotspotMode(true));
  }

  render() {
    return html`
  <me-expandable-tab tabName="Hotspots">
    <span slot="content">
    ${
        this.hotspots.map(
            (hotspot) => html`<me-hotspot-editor .config="${
                hotspot}"></me-hotspot-editor>`)}
    ${
        this.addHotspotMode ?
            html`<div> Click on the model in the preview to add a hotspot.</div>` :
            html`<mwc-button unelevated icon="add_circle"
                id="add-hotspot" @click="${this.onAddHotspot}">Add hotspot
      </mwc-button>`}
    </span>
  </me-expandable-tab>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'me-hotspot-panel': HotspotPanel;
  }
}
