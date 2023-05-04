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

import {InspectorPanel} from '../../components/inspector/inspector.js';
import {ModelViewerPreview} from '../../components/model_viewer_preview/model_viewer_preview.js';
import {dispatchGltfUrl, getModelViewer} from '../../components/model_viewer_preview/reducer.js';
import {dispatchReset} from '../../reducers.js';
import {reduxStore} from '../../space_opera_base.js';

const ASTRONAUT_PATH = 'packages/shared-assets/models/Astronaut.glb';

suite('loader inspector pane test', () => {
  let preview: ModelViewerPreview;
  let inspectorPane: InspectorPanel;

  setup(async () => {
    reduxStore.dispatch(dispatchReset());
    preview = new ModelViewerPreview();
    document.body.appendChild(preview);
    await preview.updateComplete;

    inspectorPane = new InspectorPanel();
    document.body.appendChild(inspectorPane);

    reduxStore.dispatch(dispatchGltfUrl(ASTRONAUT_PATH));
    await preview.loadComplete;
    await inspectorPane.updateComplete;
  });

  teardown(() => {
    document.body.removeChild(inspectorPane);
    document.body.removeChild(preview);
  })

  test('outputs valid JSON to the inspector pane', async () => {
    const textContent =
        inspectorPane.shadowRoot!.querySelector(
                                     '.inspector-content')!.textContent!;
    expect(textContent).to.be.ok;
    expect(JSON.parse(textContent))
        .to.be.eql(getModelViewer()!.originalGltfJson);
  });

  test('uploads images in the bin to the inspector pane', async () => {
    const texImage = inspectorPane.shadowRoot!.querySelector<HTMLImageElement>(
        '.texture-images img')!;
    expect(texImage).to.be.ok;
    // Check that an object URL was generated
    expect(texImage.src).to.match(/^blob:http/);
  });
});
