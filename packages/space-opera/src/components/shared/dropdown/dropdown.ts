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

import '@polymer/paper-dropdown-menu/paper-dropdown-menu';
import '@polymer/paper-listbox';
import '@polymer/paper-item';

import {PaperDropdownMenuElement} from '@polymer/paper-dropdown-menu/paper-dropdown-menu';
import {PaperListboxElement} from '@polymer/paper-listbox';
import {html, LitElement} from 'lit';
import {customElement, property, query} from 'lit/decorators.js';

import {checkFinite} from '../../utils/reducer_utils.js';

import {styles} from './dropdown.css.js';

/**
 * A dropdown button.
 */
@customElement('me-dropdown')
export class Dropdown extends LitElement {
  static styles = styles;

  @property({type: String}) label = '';

  /** Proxies to paper-listbox's selected attribute */
  // Note that paperListbox also accept string, we explicitly require index
  // only.
  @property({type: Number}) selectedIndex = 0;

  @query('paper-dropdown-menu') paperDropdownMenu!: PaperDropdownMenuElement;
  @query('paper-listbox') paperListbox!: PaperListboxElement;

  readonly observer = new MutationObserver(this.onSlotChange.bind(this));

  firstUpdated() {
    // Observe a character update in children (slot), then force update on
    // paperListbox
    this.observer.observe(this, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  /**
   * Proxies to paper-dropdown-menu's selectedItem
   */
  get selectedItem(): Element {
    return this.paperDropdownMenu.selectedItem as Element;
  }

  onValueChanged() {
    // Filters unselect event fired by paper-dropdown-menu
    if (this.paperDropdownMenu.selectedItem &&
        this.paperListbox.selected != null &&
        this.paperListbox.selected != this.selectedIndex) {
      this.selectedIndex = checkFinite(Number(this.paperListbox.selected));
      this.dispatchEvent(new Event('select'));
    }
  }

  private onSlotChange() {
    // Force update paperListbox
    this.paperListbox.set('selected', null);
    this.paperListbox.set('selected', this.selectedIndex);
  }

  render() {
    // The custom style gets rid of the underline in the NPM build.
    return html`
      <custom-style>
        <style>
        paper-dropdown-menu {
          --paper-input-container-underline: { display: none; };
          --paper-input-container-underline-focus: { display: none; };
        }
        </style>
      </custom-style>
      <paper-dropdown-menu class="EditorDropdown exportEditorDropdown exportSpacecraftTheme" label="${
        this.label}" no-label-float @value-changed="${this.onValueChanged}">
        <paper-listbox slot="dropdown-content" class="exportSelectPopup" selected="${
        this.selectedIndex}">
          <slot></slot>
        </paper-listbox>
      </paper-dropdown-menu>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'me-dropdown': Dropdown;
  }
}
