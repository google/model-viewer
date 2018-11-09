/*
 * Copyright 2018 Google Inc. All Rights Reserved.
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
 */

import ModelViewerElementBase, {$renderer} from '../../model-viewer-element-base.js';
import ARRenderer from '../../three-components/ARRenderer.js';
import ModelScene from '../../three-components/ModelScene.js';
import {$arRenderer} from '../../three-components/Renderer.js';

const expect = chai.expect;

customElements.define('model-viewer-element', ModelViewerElementBase);

suite('ARRenderer', () => {
  let element;
  let scene;
  let renderer;
  let arRenderer;

  setup(() => {
    element = new ModelViewerElementBase();
    renderer = element[$renderer];
    arRenderer = renderer[$arRenderer];
  });

  teardown(() => {
    renderer.scenes.clear();
  });

  // NOTE(cdata): It will be a notable day when this test fails
  test('does not support presenting to AR on any browser', async () => {
    expect(await arRenderer.supportsPresentation()).to.be.equal(false);
  });

  test('is not presenting if present has not been invoked', () => {
    expect(arRenderer.isPresenting).to.be.equal(false);
  });
});
