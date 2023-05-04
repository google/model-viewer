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

import '../../../components/shared/dropdown/dropdown.js';
import '@polymer/paper-item';

import {expect} from '@esm-bundle/chai';
import {html, render} from 'lit';

import {Dropdown} from '../../../components/shared/dropdown/dropdown.js';

suite('dropdown test', () => {
  let dropdown: Dropdown;
  let container: HTMLDivElement;

  setup(async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    render(
        html`
      <me-dropdown id="dropdown">
        <paper-item value="1">1</paper-item>
        <paper-item value="2">2</paper-item>
      </me-dropdown>`,
        container);

    dropdown = container.querySelector('me-dropdown#dropdown')! as Dropdown;
    await dropdown.updateComplete;
  });

  teardown(() => {
    document.body.removeChild(container);
  })

  test('exists', () => {
    expect(dropdown instanceof HTMLElement).to.be.equal(true);
    expect(dropdown.tagName).to.be.equal('ME-DROPDOWN');
  });

  test('dispatches an event when selected changed', () => {
    let nCalled = 0;
    const handler = () => ++nCalled;
    dropdown.addEventListener('select', handler);

    (dropdown.querySelectorAll('paper-item')[1] as HTMLElement).click();

    expect(nCalled).to.be.eq(1);
    expect(dropdown.selectedIndex).to.be.equal(1);
  });

  test('modifies paper-dropdown-menu when selectedIndex is set', async () => {
    dropdown.selectedIndex = 1;
    await dropdown.updateComplete;

    const paperListbox = dropdown.shadowRoot!.querySelector('paper-listbox')!;
    expect(Number(paperListbox.get('selected'))).to.be.equal(1);
  });
});
