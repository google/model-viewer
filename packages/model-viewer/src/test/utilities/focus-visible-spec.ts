/* @license
 * Copyright 2019 Google LLC. All Rights Reserved.
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

import ModelViewerElementBase from '../../model-viewer-base.js';
import {waitForEvent} from '../../utilities.js';
import {FocusVisiblePolyfillMixin} from '../../utilities/focus-visible.js';
import {assetPath} from '../helpers.js';
import {BasicSpecTemplate} from '../templates.js';

const expect = chai.expect;

suite('ModelViewerElementBase with FocusVisiblePolyfillMixin', () => {
  let nextId = 0;
  let tagName: string;
  let ModelViewerElement: Constructor<ModelViewerElementBase>;
  let element: ModelViewerElementBase;

  setup(() => {
    tagName = `model-viewer-focus-visible-${nextId++}`;
    ModelViewerElement = class extends
    FocusVisiblePolyfillMixin<Constructor<ModelViewerElementBase>>(
        ModelViewerElementBase) {
      static get is() {
        return tagName;
      }
    };
    customElements.define(tagName, ModelViewerElement);
  });


  BasicSpecTemplate(() => ModelViewerElement, () => tagName);

  suite('when polyfill is present', () => {
    setup(async () => {
      element = new ModelViewerElement();
      element.tabIndex = 0;
      element.src = assetPath('models/cube.gltf');
      document.body.insertBefore(element, document.body.firstChild);
      await waitForEvent(element, 'load');
    });

    teardown(() => {
      if (element.parentNode != null) {
        element.parentNode.removeChild(element);
      }
    });

    test('typically does not show the focus ring when focused', async () => {
      element.dispatchEvent(new CustomEvent('mousedown'));
      element.focus();

      expect(document.activeElement).to.be.equal(element);
      expect(window.getComputedStyle(element).outlineStyle).to.be.equal('none');
    });
  });
});