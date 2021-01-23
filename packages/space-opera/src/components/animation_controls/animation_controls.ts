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
import '../shared/dropdown/dropdown.js';
import '../shared/checkbox/checkbox.js';
import '@polymer/paper-item';

import {customElement, html, internalProperty, query} from 'lit-element';

import {reduxStore} from '../../space_opera_base.js';
import {State} from '../../types.js';
import {dispatchAnimationName, dispatchAutoplayEnabled, getConfig} from '../config/reducer';
import {ConnectedLitElement} from '../connected_lit_element/connected_lit_element.js';
import {CheckboxElement} from '../shared/checkbox/checkbox.js';
import {Dropdown} from '../shared/dropdown/dropdown.js';
import {getAnimationNames} from './reducer.js';

interface AnimationControlsInterface {
  autoplay?: boolean;
  animationName?: string;
}

/**
 * Animation controls for gltf and model-viewer.
 */
@customElement('me-animation-controls')
export class AnimationControls extends ConnectedLitElement {
  @query('me-checkbox#animation-autoplay') autoplayCheckbox?: CheckboxElement;
  @internalProperty() animationNames: string[] = [];
  @internalProperty() config: AnimationControlsInterface = {};

  stateChanged(state: State) {
    this.animationNames = getAnimationNames(state);
    this.config = getConfig(state);
  }

  // Specifically overriding a super class method.
  // tslint:disable-next-line:enforce-name-casing
  async _getUpdateComplete() {
    await super._getUpdateComplete();
    await this.autoplayCheckbox!.updateComplete;
  }

  render() {
    let selectedAnimationIndex = this.config.animationName ?
        this.animationNames.findIndex(
            (name) => name === this.config.animationName) :
        0;  // Select first animation as model-viewer default

    if (selectedAnimationIndex === -1) {
      selectedAnimationIndex = 0;
    }

    const hasAnims = this.animationNames.length > 0;
    const tabHeader = hasAnims ? 'Animations' : 'Animations (Model has none)';
    return html`
      <me-expandable-tab tabName=${tabHeader} .enabled=${hasAnims}>
        <div slot="content">
          <me-dropdown id="animation-name-selector"
            selectedIndex=${selectedAnimationIndex}
            @select=${this.onAnimationNameChange}>
            ${this.animationNames.map(name => {
      return html`
              <paper-item value="${name}">
                ${name}
              </paper-item>`;
    })}
          </me-dropdown>
          <me-checkbox id="animation-autoplay" label="Autoplay"
            ?checked="${!!this.config.autoplay}"
            @change=${this.onAutoplayChange}></me-checkbox>
        </div>
      </me-expandable-tab>
        `;
  }

  onAutoplayChange() {
    reduxStore.dispatch(
        dispatchAutoplayEnabled(this.autoplayCheckbox!.checked));
  }

  onAnimationNameChange(event: CustomEvent) {
    // Autoplay must be enabled otherwise the animation won't play and the
    // console throws a warning.
    const dropdown = event.target as Dropdown;
    const value = dropdown.selectedItem?.getAttribute('value') || undefined;
    if (value !== undefined && this.animationNames.indexOf(value) !== -1) {
      reduxStore.dispatch(dispatchAnimationName(value));
    }

    // Set the bool options values to something sensible
    if (value) {
      reduxStore.dispatch(dispatchAutoplayEnabled(true));
    } else {
      reduxStore.dispatch(dispatchAutoplayEnabled(false));
    }
  }
}

declare global {
  interface AnimationControls {
    'me-animation-controls': AnimationControls;
  }
}
