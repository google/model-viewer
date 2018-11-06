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

import {BackgroundImageMixin} from '../../features/background-image.js';
import XRModelElementBase, {$scene} from '../../xr-model-element-base.js';
import {pickShadowDescendant, timePasses, until, waitForEvent} from '../helpers.js';

const expect = chai.expect;
const skysphereHasMap = (scene, url) => scene.skysphere.material.map ?
    scene.skysphere.material.map.name === url :
    false;

suite('XRModelElementBase with BackgroundImageMixin', () => {
  let nextId = 0;
  let tagName;
  let XRModelElement;
  let element;
  let scene;

  setup(() => {
    tagName = `xr-model-background-image-${nextId++}`;
    XRModelElement = BackgroundImageMixin(XRModelElementBase);
    customElements.define(tagName, XRModelElement);
    element = new XRModelElement();
    scene = element[$scene];
  });

  test('has a blank skysphere if no background-image defined', () => {
    expect(skysphereHasMap(scene)).to.be.equal(false);
  });

  suite('with a background-image property', () => {
    suite('and a src property', () => {
      let onLoad;
      setup(async () => {
        onLoad = Promise.all([
          waitForEvent(element, 'load'),
          waitForEvent(scene.model, 'envmap-change', e =>
            e.value ? e.value.name === element.backgroundImage : false)
        ]);
        element.backgroundImage = './examples/assets/equirectangular.png';
        element.src = './examples/assets/reflective-sphere.gltf';
        await onLoad;
      });

      test('displays skysphere with the correct map and color', async function() {
        expect(skysphereHasMap(scene, element.backgroundImage)).to.be.equal(true);
        expect(scene.skysphere.material.color.getHexString()).to.be.equal('ffffff');
      });

      test('applies the image as an environment map', async function() {
        let found = 0;
        scene.model.traverse(object => {
          if (object && object.material && object.material.envMap &&
              object.material.envMap.name === element.backgroundImage) {
            found++;
          }
        });
        expect(found).to.be.equal(1);
      });
    });
  });
});
