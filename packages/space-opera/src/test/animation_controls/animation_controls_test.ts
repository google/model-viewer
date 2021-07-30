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

import {AnimationControls} from '../../components/animation_controls/animation_controls.js';
import {dispatchAnimationName, dispatchAutoplayEnabled, getConfig} from '../../components/config/reducer.js';
import {ModelViewerPreview} from '../../components/model_viewer_preview/model_viewer_preview.js';
import {dispatchGltfUrl, getModelViewer} from '../../components/model_viewer_preview/reducer.js';
import {Dropdown} from '../../components/shared/dropdown/dropdown.js';
import {dispatchReset} from '../../reducers.js';
import {reduxStore} from '../../space_opera_base.js';
import {waitForEvent} from '../utils/test_utils.js';

const ANIMATED_GLB_PATH = '../base/shared-assets/models/RobotExpressive.glb';

describe('animation controls test', () => {
  let preview: ModelViewerPreview;
  let animationControls: AnimationControls;

  beforeEach(async () => {
    reduxStore.dispatch(dispatchReset());
    preview = new ModelViewerPreview();
    document.body.appendChild(preview);
    await preview.updateComplete;

    animationControls = new AnimationControls();
    document.body.appendChild(animationControls);

    reduxStore.dispatch(dispatchGltfUrl(ANIMATED_GLB_PATH));
    await waitForEvent(getModelViewer()!, 'load');

    await animationControls.updateComplete;
  });

  afterEach(() => {
    document.body.removeChild(animationControls);
    document.body.removeChild(preview);
  })

  it('updates the animation names when a gltf is uploaded', async () => {
    const animationNameSelector = animationControls.shadowRoot!.querySelector(
        'me-dropdown#animation-name-selector');
    const paperItems =
        animationNameSelector!.getElementsByTagName('paper-item');

    expect(paperItems.length).toBe(14);
    expect(paperItems[0].getAttribute('value')).toBe('Dance');
    expect(paperItems[1].getAttribute('value')).toBe('Death');
  });

  it('dispatches an event when an animation is selected', async () => {
    const animationNameSelector =
        animationControls.shadowRoot!.querySelector(
            'me-dropdown#animation-name-selector') as Dropdown;
    const danceAnimationItem = animationNameSelector.querySelector(
                                   'paper-item[value="Death"]') as HTMLElement;
    danceAnimationItem.click();

    expect(getConfig(reduxStore.getState()).animationName).toBe('Death');
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
