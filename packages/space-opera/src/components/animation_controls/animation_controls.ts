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

import {State} from '../../redux/space_opera_base.js';
import {ConnectedLitElement} from '../connected_lit_element/connected_lit_element.js';
import {CheckboxElement} from '../shared/checkbox/checkbox.js';
import {Dropdown} from '../shared/dropdown/dropdown.js';

import {dispatchAnimationName, dispatchAutoplayEnabled, dispatchPlayAnimation} from './reducer.js';

interface AnimationControlsInterface {
  autoplay?: boolean;
  animationName?: string;
}

/**
 * Animation controls for gltf and model-viewer.
 */
@customElement('me-animation-controls')
export class AnimationControls extends ConnectedLitElement {
  @internalProperty() animationNames: string[] = [];
  @internalProperty() config: AnimationControlsInterface = {};
  @internalProperty() playAnimation?: boolean = false;

  @query('me-checkbox#animation-autoplay') autoplayCheckbox?: CheckboxElement;
  @query('me-checkbox#animation-play') playCheckbox?: CheckboxElement;

  stateChanged(state: State) {
    this.animationNames = state.animationNames;
    this.config = state.config;
    this.playAnimation = state.playAnimation;
  }

  // Specifically overriding a super class method.
  // tslint:disable-next-line:enforce-name-casing
  async _getUpdateComplete() {
    await super._getUpdateComplete();
    await this.autoplayCheckbox!.updateComplete;
    await this.playCheckbox!.updateComplete;
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
          <me-checkbox id="animation-play" label="Play animation"
            ?checked="${!!this.playAnimation}"
            @change=${this.onPlayAnimationChange}></me-checkbox>
        </div>
      </me-expandable-tab>
        `;
  }

  onAutoplayChange() {
    dispatchAutoplayEnabled(this.autoplayCheckbox!.checked);
  }

  onAnimationNameChange(event: CustomEvent) {
    // Autoplay must be enabled otherwise the animation won't play and the
    // console throws a warning.
    const dropdown = event.target as Dropdown;
    const value = dropdown.selectedItem?.getAttribute('value') || undefined;

    dispatchAnimationName(value);

    // Set the bool options values to something sensible
    if (value) {
      dispatchAutoplayEnabled(true);
      dispatchPlayAnimation(true);
    } else {
      dispatchAutoplayEnabled(false);
      // Leave "playAnimation" alone. It's just UI state.
    }
  }

  onPlayAnimationChange() {
    dispatchPlayAnimation(this.playCheckbox!.checked);
  }
}

declare global {
  interface AnimationControls {
    'me-animation-controls': AnimationControls;
  }
}
