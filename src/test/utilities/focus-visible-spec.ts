/*
 * Copyright 2019 Google Inc. All Rights Reserved.
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
import {FocusVisiblePolyfillMixin} from '../../utilities/focus-visible.js';
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

  test('typically does not show the focus ring when focused', () => {
    element = new ModelViewerElement();
    element.tabIndex = 0;
    document.body.appendChild(element);

    element.focus();

    expect(element.matches(':focus')).to.be.equal(true);
    expect(window.getComputedStyle(element).outlineStyle).to.be.equal('none');
  });
});