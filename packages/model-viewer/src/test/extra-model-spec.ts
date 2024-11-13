/* @license
 * Copyright 2024 Google LLC. All Rights Reserved.
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

import {expect} from 'chai';

import {ExtraModelElement} from '../extra-model.js';
import {ModelViewerElement} from '../model-viewer.js';
import {timePasses, waitForEvent} from '../utilities.js';

import {assetPath} from './helpers.js';

suite('ExtraModelElement', () => {
  let extraElement: ExtraModelElement;
  let modelViewer: ModelViewerElement;

  setup(() => {
    modelViewer = new ModelViewerElement();
    extraElement = new ExtraModelElement();
    document.body.insertBefore(modelViewer, document.body.firstChild);
    modelViewer.appendChild(extraElement);
  });

  teardown(() => {
    if (modelViewer.parentNode != null) {
      modelViewer.removeChild(extraElement);
      modelViewer.parentNode.removeChild(modelViewer);
    }
  });

  suite('with src property', () => {
    test('set loaded to false at first when src is set', async () => {
      extraElement.src = assetPath('models/Astronaut.glb');
      expect(extraElement.loaded).to.be.false;
    });
    test.skip('dispatches a load event when src is set', async () => {
      const sourceLoads = waitForEvent(extraElement, 'load');
      extraElement.src = assetPath('models/Astronaut.glb');
      await sourceLoads;
      expect(extraElement.loaded).to.be.true;
    });

    test.skip('dispatches an error event when src is invalid', async () => {
      const sourceErrors = waitForEvent(extraElement, 'error');
      extraElement.src = './does-not-exist.glb';
      await sourceErrors;
      expect(extraElement.loaded).to.be.false;
    });
  });

  suite('with availableVariants property', () => {
    test('updates when availableVariants is changed', async () => {
      const variants = ['variant1', 'variant2'];
      extraElement.availableVariants = variants;
      await timePasses();
      expect(extraElement.availableVariants).to.deep.equal(variants);
    });
  });

  suite('connectedCallback', () => {
    test('adds itself to the parent model-viewer', () => {
      const modelViewer = document.querySelector('model-viewer') as HTMLElement;
      const firstExtraModel = modelViewer.querySelector('extra-model'); 
      expect(firstExtraModel).to.include(extraElement);
    });
  });

  suite(
      'updated',
      () => {
          /*       test('reacts to src property changes', async () => {
                     const spy = sinon.spy(console, 'log');
                     extraElement.src = assetPath('models/Astronaut.glb');
                     await timePasses();
                     expect(spy.calledWith('updated is called')).to.be.true;
                     expect(spy.calledWith('src has changed')).to.be.true;
                     spy.restore();
                 });

                 test('reacts to availableVariants property changes', async ()
             => { const spy = sinon.spy(console, 'log');
                     extraElement.availableVariants = ['variant1', 'variant2'];
                     await timePasses();
                     expect(spy.calledWith('updated is called')).to.be.true;
                     expect(spy.calledWith('availableVariants has
             changed')).to.be.true; spy.restore();
                 });*/
      });

  // ... Add more tests for other functionalities ...
});