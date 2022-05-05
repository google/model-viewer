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

import '@material/mwc-tab-bar';

import {html, LitElement} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {styles} from './styles.css.js';
import './tab';

/**
 * A tabbed panel.
 */
@customElement('me-tabs')
export class Tabs extends LitElement {
  static styles = styles;

  get panels() {
    const slot = this.shadowRoot!.querySelector('slot');
    return slot &&
        slot.assignedElements().filter(e => e instanceof TabbedPanel) ||
        [];
  }

  renderPanelIcon(panel: Element) {
    if (panel instanceof TabbedPanel) {
      return html`
      <me-tab
        icon='${panel.icon}'
        label='${panel.label}'
      ></me-tab>`;
    }
    return html``;
  }

  // Mystery.. But this is required for mwc-tab-bar to correctly select the
  // initial panel.
  firstUpdated() {
    this.requestUpdate();
  }

  render() {
    return html`
      <div class="TabHeader">
        <mv-link></mv-link>
        <mwc-tab-bar
               @MDCTabBar:activated=${this.tabActivated}>
          ${this.panels.map(this.renderPanelIcon)}
        </mwc-tab-bar>
      </div>
      <div class="TabPanelContainer">
        <slot @slotchange=${() => {
      this.requestUpdate();
    }}></slot>
      </div>
    `;
  }

  tabActivated(event: CustomEvent<{index: number}>) {
    const targetIndex = event.detail.index;
    this.panels.forEach((panel, index) => {
      (panel as TabbedPanel).selected = index === targetIndex;
    });
  }
}

/**
 * A panel of content, plus an icon and label to display in the tab bar.
 */
@customElement('me-tabbed-panel')
export class TabbedPanel extends LitElement {
  static styles = styles;

  @property({type: String, reflect: true}) icon = '';
  @property({type: String}) label = '';
  @property({type: Boolean}) selected = false;

  render() {
    return html`
      <slot class="TabPanel" ?selected=${this.selected}></slot>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'me-tabbed-panel': TabbedPanel;
    'me-tabs': Tabs;
  }
}
