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


import {expect} from '@esm-bundle/chai';

import {HotspotEditorElement} from '../../components/hotspot_panel/hotspot_editor.js';
import {dispatchAddHotspot, dispatchClearHotspot, getHotspots} from '../../components/hotspot_panel/reducer.js';
import {dispatchReset} from '../../reducers.js';
import {reduxStore} from '../../space_opera_base.js';

suite('hotspot editor test', () => {
  let hotspotEditor: HotspotEditorElement;

  setup(async () => {
    reduxStore.dispatch(dispatchReset());
    const config = {name: 'test', surface: 'stuff'};
    reduxStore.dispatch(dispatchAddHotspot(config));
    hotspotEditor = new HotspotEditorElement();
    hotspotEditor.config = config;
    document.body.appendChild(hotspotEditor);
    await hotspotEditor.updateComplete;
  });

  teardown(() => {
    document.body.removeChild(hotspotEditor);
    reduxStore.dispatch(dispatchClearHotspot());
  });

  test('fires dispatchUpdateHotspot when user updates annotation text', () => {
    const annotationTextArea =
        hotspotEditor.shadowRoot!.querySelector('textarea#annotation') as
        HTMLTextAreaElement;
    annotationTextArea.value = 'new annotation';
    annotationTextArea.dispatchEvent(new Event('input'));

    const hotspots = getHotspots(reduxStore.getState());
    expect(hotspots.length).to.be.equal(1);
    expect(hotspots[0].annotation).to.be.equal('new annotation');
  });

  test('fires dispatchRemoveHotspot when onRemoveHotspot is called', () => {
    hotspotEditor.onRemoveHotspot();
    const hotspots = getHotspots(reduxStore.getState());
    expect(hotspots.length).to.be.equal(0);
  });
});
