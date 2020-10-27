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


import '../../components/animation_controls/animation_controls.js';

import {createBufferFromString, GltfModel} from '@google/model-viewer-editing-adapter/lib/main.js'

import {AnimationControls} from '../../components/animation_controls/animation_controls.js';
import {dispatchAnimationName, dispatchAutoplayEnabled} from '../../components/config/reducer.js';
import {getConfig} from '../../components/config/reducer.js';
import {dispatchGltfAndEdits} from '../../components/model_viewer_preview/gltf_edits.js';
import {Dropdown} from '../../components/shared/dropdown/dropdown.js';
import {reduxStore} from '../../space_opera_base.js';

const EXAMPLE_BIN_AS_STRING = 'example of some bin data';
const EXAMPLE_BIN_AS_ARRAY_BUFFER =
    createBufferFromString(EXAMPLE_BIN_AS_STRING);
const BIN_LENGTH_IN_BYTES = EXAMPLE_BIN_AS_ARRAY_BUFFER.byteLength;

const TEST_GLTF_JSON = {
  'asset': {'generator': 'FBX2glTF', 'version': '2.0'},
  'buffers': [{
    'byteLength': BIN_LENGTH_IN_BYTES,
  }],
  'bufferViews':
      [{'buffer': 0, 'byteLength': BIN_LENGTH_IN_BYTES, 'name': 'image1'}],
  'materials': [
    {
      'name': 'yellow',
      'pbrMetallicRoughness': {'baseColorFactor': [0.8, 0.8, 0.2]},
    },
    {
      'name': 'purple',
      'pbrMetallicRoughness': {'baseColorFactor': [0.8, 0.2, 0.8]},
    },
  ],
  'animations': [
    {
      'name': 'Dance',
      'channels': [{'sampler': 0, 'target': {'node': 13, 'path': 'weights'}}],
      'samplers': [{'input': 0, 'interpolation': 'LINEAR', 'output': 1}]
    },
    {
      'name': 'Idle',
      'channels': [{'sampler': 0, 'target': {'node': 13, 'path': 'weights'}}],
      'samplers': [{'input': 0, 'interpolation': 'LINEAR', 'output': 1}]
    }
  ],
  'nodes': [{'rotation': [0, 0, 0, 1]}],
};

describe('animation controls test', () => {
  let animationControls: AnimationControls;

  beforeEach(async () => {
    animationControls = new AnimationControls();
    document.body.appendChild(animationControls);

    await dispatchGltfAndEdits(new GltfModel(TEST_GLTF_JSON, null));
    await animationControls.updateComplete;
  });

  afterEach(() => {
    document.body.removeChild(animationControls);
  })

  it('updates the animation names when a gltf is uploaded', async () => {
    const animationNameSelector = animationControls.shadowRoot!.querySelector(
        'me-dropdown#animation-name-selector');
    const paperItems =
        animationNameSelector!.getElementsByTagName('paper-item');

    expect(paperItems.length).toBe(2);
    expect(paperItems[0].getAttribute('value')).toBe('Dance');
    expect(paperItems[1].getAttribute('value')).toBe('Idle');
  });

  it('dispatches an event when an animation is selected', async () => {
    const animationNameSelector =
        animationControls.shadowRoot!.querySelector(
            'me-dropdown#animation-name-selector') as Dropdown;
    const danceAnimationItem = animationNameSelector.querySelector(
                                   'paper-item[value="Dance"]') as HTMLElement;
    danceAnimationItem.click();

    expect(getConfig(reduxStore.getState()).animationName).toBe('Dance');
  });

  it('dispatches an event on UI click', async () => {
    reduxStore.dispatch(dispatchAutoplayEnabled(false));
    expect(getConfig(reduxStore.getState()).autoplay).toBe(false);
    const autoplayCheckbox = animationControls.autoplayCheckbox!;

    await animationControls.updateComplete;
    autoplayCheckbox.shadowRoot!.querySelector('mwc-checkbox')!.click();
    expect(getConfig(reduxStore.getState()).autoplay).toBe(true);

    await animationControls.updateComplete;
    autoplayCheckbox.shadowRoot!.querySelector('mwc-checkbox')!.click();
    expect(getConfig(reduxStore.getState()).autoplay).toBe(false);
  });

  it('updates selected value on animationName change', async () => {
    const animationName = 'Idle';
    reduxStore.dispatch(dispatchAnimationName(animationName));
    const animationNameSelector =
        animationControls.shadowRoot!.querySelector(
            'me-dropdown#animation-name-selector') as Dropdown;
    await animationControls.updateComplete;
    expect(animationNameSelector.selectedItem.getAttribute('value'))
        .toBe('Idle');
  });
});
