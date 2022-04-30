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

import {html, render} from 'lit';

import {ExpandableSection} from '../../../components/shared/expandable_content/expandable_section.js';
import {ExpandableTab} from '../../../components/shared/expandable_content/expandable_tab.js';

function elementIsVisible(e: HTMLElement) {
  const style = getComputedStyle(e);
  const rect = e.getBoundingClientRect();
  return style.visibility !== 'hidden' && style.display !== 'none' &&
      rect.width > 0 && rect.height > 0;
}

describe('<me-expandable-section>', () => {
  let section: ExpandableSection;
  let container: HTMLDivElement;

  beforeEach(async () => {
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

  afterEach(() => {
    document.body.removeChild(container);
  })

  it('is there', () => {
    expect(section instanceof HTMLElement).toBe(true);
    expect(section.tagName).toEqual('ME-EXPANDABLE-SECTION');
  });

  it('contains content', () => {
    expect(section.innerText.trim()).toEqual('Peekaboo!');
    expect(section.textContent!.trim()).toEqual('Peekaboo!');
  });

  it('shows when opened', async () => {
    // Also checks that the default state is hidden:
    expect(section.open).toBe(false);
    expect(elementIsVisible(section)).toBe(false);

    section.open = true;
    await section.updateComplete;
    // TODO: add content visibility test
    // expect(elementIsVisible(section)).toBe(true);
  });
});

describe('<me-expandable-tab>', () => {
  let tab: ExpandableTab;
  let container: HTMLDivElement;

  beforeEach(async () => {
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

  afterEach(() => {
    document.body.removeChild(container);
  })

  it('is there', () => {
    expect(tab instanceof HTMLElement).toBe(true);
    expect(tab.tagName).toEqual('ME-EXPANDABLE-TAB');
  });

  it('contains header', () => {
    const tabHeader =
        tab.shadowRoot!.querySelector('.TabHeader')! as HTMLElement;
    expect(tabHeader).toBeDefined();
    expect(elementIsVisible(tabHeader)).toBe(true);
    const headerText = tabHeader.innerText.trim();
    expect(headerText).toMatch(/^TheName/);
    expect(headerText).toMatch(/keyboard_arrow_down$/);
  });

  it('contains content', async () => {
    // This is sneaky; it just asserts on the raw HTML wias written above; so
    // the header text, which gets generated later by lit-element, is not
    // included in tab.innerText. In practice I'm not sure how useful this test
    // is.
    expect(tab.innerText.trim()).toEqual('Peekaboo!');
  });

  it('shows content when clicked', async () => {
    const tabHeader =
        tab.shadowRoot!.querySelector('.TabHeader')! as HTMLElement;
    expect(tabHeader).toBeDefined();
    const tabContent = tab.shadowRoot!.querySelector('me-expandable-section')!;
    expect(tabContent).toBeDefined();

    // Also checks that the default state is hidden:
    expect(elementIsVisible(tabHeader)).toBe(true);
    expect(elementIsVisible(tabContent)).toBe(false);

    tabHeader.click();
    await tab.updateComplete;
    await tabContent.updateComplete;

    expect(tabContent.open).toBe(true);
    expect(elementIsVisible(tabHeader)).toBe(true);

    // TODO: add content visibility test
    // expect(elementIsVisible(tabContent)).toBe(true);
  });
});
