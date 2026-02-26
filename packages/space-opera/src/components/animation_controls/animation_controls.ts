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

import {html} from 'lit';
import {customElement, state, query} from 'lit/decorators.js';

import {reduxStore} from '../../space_opera_base.js';
import {State} from '../../types.js';
import {dispatchAnimationName, dispatchAutoplayEnabled, getConfig} from '../config/reducer';
import {ConnectedLitElement} from '../connected_lit_element/connected_lit_element.js';
import {getModelViewer, getUpdatedModelViewer, isLoaded} from '../model_viewer_preview/reducer.js';
import {CheckboxElement} from '../shared/checkbox/checkbox.js';
import {Dropdown} from '../shared/dropdown/dropdown.js';
import {SectionRow} from '../shared/section_row/section_row.js';
import {SliderWithInputElement} from '../shared/slider_with_input/slider_with_input.js';

/**
 * Animation controls for gltf and model-viewer.
 */
@customElement('me-animation-controls')
export class AnimationControls extends ConnectedLitElement {
  @query('me-checkbox#animation-autoplay') autoplayCheckbox!: CheckboxElement;
  @query('me-slider-with-input#scrubber') scrubber!: SliderWithInputElement;
  @query('me-section-row#time') timeElement!: SectionRow;
  @state() animationNames: string[] = [];
  @state() selectedAnimation: string|undefined = undefined;
  @state() autoplay = false;
  @state() clipLength = 0;

  stateChanged(state: State) {
    const config = getConfig(state);
    this.selectedAnimation = config.animationName;
    this.autoplay = !!config.autoplay;

    if (isLoaded(state)) {
      this.animationNames = getModelViewer().availableAnimations ?? [];
      this.updateScrubber();
    }
  }

  render() {
    let selectedAnimationIndex = this.selectedAnimation ?
        this.animationNames.findIndex(
            (name) => name === this.selectedAnimation) :
        0;  // Select first animation as model-viewer default

    if (selectedAnimationIndex === -1) {
      selectedAnimationIndex = 0;
    }

    const hasAnims = this.animationNames.length > 0;
    const tabHeader = hasAnims ? 'Animations' : 'Animations (Model has none)';
    return html`
      <me-expandable-tab tabName=${tabHeader} .enabled=${hasAnims} .open=${
        true}>
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
          <me-checkbox id="animation-autoplay" label="Play"
            ?checked="${!!this.autoplay}"
            @change=${this.onAutoplayChange}></me-checkbox>
          <me-section-row class="Row" label="Time" id="time">
            <me-slider-with-input
              id="scrubber"
              min=0 max=${this.clipLength} step=0.01
              @change=${this.onScrub}>
            </me-slider-with-input>
          </me-section-row>
        </div>
      </me-expandable-tab>
        `;
  }

  onAutoplayChange() {
    const {checked} = this.autoplayCheckbox!;
    reduxStore.dispatch(dispatchAutoplayEnabled(checked));
    if (checked === false) {
      getModelViewer()?.pause();
    }
  }

  onAnimationNameChange(event: CustomEvent) {
    // Autoplay must be enabled otherwise the animation won't play and the
    // console throws a warning.
    const dropdown = event.target as Dropdown;
    const value = dropdown.selectedItem?.getAttribute('value') || undefined;
    if (value !== undefined && this.animationNames.indexOf(value) !== -1) {
      reduxStore.dispatch(dispatchAnimationName(value));
    }
  }

  onScrub() {
    const time = this.scrubber.value;
    getModelViewer().currentTime = time;
  }

  async updateScrubber() {
    const modelViewer = await getUpdatedModelViewer();
    this.clipLength = Math.floor(modelViewer.duration * 100) / 100;
    this.scrubber.value = modelViewer.currentTime;
    this.timeElement.style.display = this.autoplay ? 'none' : '';
  }
}

declare global {
  interface AnimationControls {
    'me-animation-controls': AnimationControls;
  }
}
