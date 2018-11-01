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

import XRModelElementBase, {$canvas} from '../../xr-model-element-base.js';
import ModelScene from '../../three-components/ModelScene.js';
import Renderer from '../../three-components/Renderer.js';

const expect = chai.expect;

suite('Renderer', () => {
  let element;
  let scene;
  let renderer = new Renderer();
  let XRModelElement = class extends XRModelElementBase {};
  customElements.define('xr-model-renderer', XRModelElement);

  teardown(() => {
    renderer.scenes.clear();
  });

  function createScene () {
    const element = new XRModelElement();
    const scene = new ModelScene({
      element: element,
      canvas: element[$canvas],
      width: 200,
      height: 100,
      renderer,
    });

    scene.renderCount = 0;
    const drawImage = scene.context.drawImage;
    scene.context.drawImage = (...args) => {
      scene.renderCount++;
      drawImage.call(scene.context, ...args);
    };

    return scene;
  }

  suite('render', () => {
    test('renders only dirty scenes', async function () {
      let scene1 = createScene();
      let scene2 = createScene();
      renderer.registerScene(scene1);
      renderer.registerScene(scene2);

      renderer.render(performance.now());
      expect(scene1.renderCount).to.be.equal(0);
      expect(scene2.renderCount).to.be.equal(0);

      scene1.isDirty = true;
      renderer.render(performance.now());
      expect(scene1.renderCount).to.be.equal(1);
      expect(scene2.renderCount).to.be.equal(0);
    });

    test('marks scenes no longer dirty after rendering', async function () {
      let scene = createScene();
      renderer.registerScene(scene);

      scene.isDirty = true;

      renderer.render(performance.now());
      expect(scene.renderCount).to.be.equal(1);
      expect(!scene.isDirty).to.be.ok;

      renderer.render(performance.now());
      expect(scene.renderCount).to.be.equal(1);
      expect(!scene.isDirty).to.be.ok;
    });
  });
});
