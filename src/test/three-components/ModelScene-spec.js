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

import XRModelElementBase, { $canvas } from '../../xr-model-element-base.js';
import ModelScene from '../../three-components/ModelScene.js';

const expect = chai.expect;

suite('ModelScene', () => {
  let element;
  let scene;
  let XRModelElement = class extends XRModelElementBase {};
  customElements.define('xr-model-modelscene', XRModelElement);

  setup(() => {
    element = new XRModelElement();
    scene = new ModelScene({
      element: element,
      canvas: element[$canvas],
      width: 200,
      height: 100,
    });
  });

  suite('setModelSource', () => {
    test('fires a model-load event when loaded', async function () {
      let fired = false;
      scene.addEventListener('model-load', () => fired = true);
      await scene.setModelSource('./examples/assets/Astronaut.glb');
      expect(fired).to.be.ok;
    });
  });

  suite('setSize', () => {
    test('updates visual and buffer size', () => {
      scene.setSize(500, 200);
      const { width, height } = scene;
      expect(scene.width).to.be.equal(500);
      expect(scene.canvas.width).to.be.equal(500 * devicePixelRatio);
      expect(scene.canvas.style.width).to.be.equal('500px');
      expect(scene.height).to.be.equal(200);
      expect(scene.canvas.height).to.be.equal(200 * devicePixelRatio);
      expect(scene.canvas.style.height).to.be.equal('200px');
    });

    test('cannot set the canvas smaller than 1x1', () => {
      scene.setSize(0, 0);
      expect(scene.width).to.be.equal(1);
      expect(scene.height).to.be.equal(1);
    });
  });
});
