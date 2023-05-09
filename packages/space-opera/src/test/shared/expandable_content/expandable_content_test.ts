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

import '../../../components/shared/expandable_content/expandable_section.js';
import '../../../components/shared/expandable_content/expandable_tab.js';

import {expect} from '@esm-bundle/chai';
import {html, render} from 'lit';

import {ExpandableSection} from '../../../components/shared/expandable_content/expandable_section.js';
import {ExpandableTab} from '../../../components/shared/expandable_content/expandable_tab.js';

function elementIsVisible(e: HTMLElement) {
  const style = getComputedStyle(e);
  const rect = e.getBoundingClientRect();
  return style.visibility !== 'hidden' && style.display !== 'none' &&
      rect.width > 0 && rect.height > 0;
}

suite('<me-expandable-section>', () => {
  let section: ExpandableSection;
  let container: HTMLDivElement;

  setup(async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    render(
        html`
      <me-expandable-section id="section">
        <div slot="content">Peekaboo!</div>
      </me-expandable-section>`,
        container);

    section = container.querySelector('me-expandable-section')!;
    await section.updateComplete;
  });

  teardown(() => {
    document.body.removeChild(container);
  })

  test('is there', () => {
    expect(section instanceof HTMLElement).to.be.equal(true);
    expect(section.tagName).to.be.equal('ME-EXPANDABLE-SECTION');
  });

  test('contains content', () => {
    expect(section.innerText.trim()).to.be.equal('Peekaboo!');
    expect(section.textContent!.trim()).to.be.equal('Peekaboo!');
  });

  test('shows when opened', async () => {
    // Also checks that the default state is hidden:
    expect(section.open).to.be.equal(false);
    expect(elementIsVisible(section)).to.be.equal(false);

    section.open = true;
    await section.updateComplete;
    // TODO: add content visibility test
    // expect(elementIsVisible(section)).to.be.equal(true);
  });
});

suite('<me-expandable-tab>', () => {
  let tab: ExpandableTab;
  let container: HTMLDivElement;

  setup(async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    render(
        html`
      <me-expandable-tab id="tab" tabName="TheName">
        <div slot="content">Peekaboo!</div>
      </me-expandable-tab>`,
        container);

    tab = container.querySelector('me-expandable-tab')!;
    await tab.updateComplete;
  });

  teardown(() => {
    document.body.removeChild(container);
  })

  test('is there', () => {
    expect(tab instanceof HTMLElement).to.be.equal(true);
    expect(tab.tagName).to.be.equal('ME-EXPANDABLE-TAB');
  });

  test('contains header', () => {
    const tabHeader =
        tab.shadowRoot!.querySelector('.TabHeader')! as HTMLElement;
    expect(tabHeader).to.be.ok;
    expect(elementIsVisible(tabHeader)).to.be.equal(true);
    const headerText = tabHeader.innerText.trim();
    expect(headerText).to.match(/^TheName/);
    expect(headerText).to.match(/keyboard_arrow_down$/);
  });

  test('contains content', async () => {
    // This is sneaky; it just asserts on the raw HTML wias written above; so
    // the header text, which gets generated later by lit-element, is not
    // included in tab.innerText. In practice I'm not sure how useful this test
    // is.
    expect(tab.innerText.trim()).to.be.equal('Peekaboo!');
  });

  test('shows content when clicked', async () => {
    const tabHeader =
        tab.shadowRoot!.querySelector('.TabHeader')! as HTMLElement;
    expect(tabHeader).to.be.ok;
    const tabContent = tab.shadowRoot!.querySelector('me-expandable-section')!;
    expect(tabContent).to.be.ok;

    // Also checks that the default state is hidden:
    expect(elementIsVisible(tabHeader)).to.be.equal(true);
    expect(elementIsVisible(tabContent)).to.be.equal(false);

    tabHeader.click();
    await tab.updateComplete;
    await tabContent.updateComplete;

    expect(tabContent.open).to.be.equal(true);
    expect(elementIsVisible(tabHeader)).to.be.equal(true);

    // TODO: add content visibility test
    // expect(elementIsVisible(tabContent)).to.be.equal(true);
  });
});
