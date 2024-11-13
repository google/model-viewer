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


import '../../../components/shared/popup/popup.js';

import {expect} from 'chai';
import {html, render} from 'lit';

import {PopUp} from '../../../components/shared/popup/popup.js';

suite('popup test', () => {
  let popup: PopUp;
  let container: HTMLElement;

  setup(async () => {
    container = document.createElement('div');
    document.body.appendChild(container);

    render(
        html`
      <me-popup id="popup">
        <div slot="label" id="label"></div>
        <div slot="content" id="content"></div>
      </me-popup>`,
        container);

    popup = document.body.querySelector('me-popup#popup') as PopUp;
    expect(popup).to.be.ok;
    await popup.updateComplete;
  });

  teardown(() => {
    document.body.removeChild(container);
  });

  test('opens when clicked', async () => {
    const label = popup.querySelector('#label')! as HTMLElement;
    label.click();

    await popup.updateComplete;

    const container = popup.shadowRoot!.querySelector('.PopupContainer')!;
    expect(container.hasAttribute('open')).to.be.equal(true);
  });

  test('closes when clicked outside', async () => {
    const label = popup.querySelector('#label')! as HTMLElement;
    label.click();

    await popup.updateComplete;

    const container = popup.shadowRoot!.querySelector('.PopupContainer')!;
    expect(container.hasAttribute('open')).to.be.equal(true);

    document.body.click();
    await popup.updateComplete;
    expect(container.hasAttribute('open')).to.be.equal(false);
  });

  test('doesnt close when clicked inside the content', async () => {
    const label = popup.querySelector('#label')! as HTMLElement;
    label.click();

    await popup.updateComplete;

    const container = popup.shadowRoot!.querySelector('.PopupContainer')!;
    expect(container.hasAttribute('open')).to.be.equal(true);

    const content = popup.querySelector('#content')! as HTMLElement;
    content.click();

    await popup.updateComplete;
    expect(container.hasAttribute('open')).to.be.equal(true);
  });

  test(
      'doesnt close when clicked inside the content within a shadowDom',
      async () => {
        const label = popup.querySelector('#label')! as HTMLElement;
        label.click();

        await popup.updateComplete;

        const container = popup.shadowRoot!.querySelector('.PopupContainer')!;
        expect(container.hasAttribute('open')).to.be.equal(true);

        const content = popup.querySelector('#content')! as HTMLElement;
        content.attachShadow({mode: 'open'});

        // Test event originated under shadowDom such as a LitElement component
        // get caught.
        const shadowDomLabel = document.createElement('div');
        content.shadowRoot!.appendChild(shadowDomLabel);
        shadowDomLabel.click();

        await popup.updateComplete;
        expect(container.hasAttribute('open')).to.be.equal(true);
      });
});
