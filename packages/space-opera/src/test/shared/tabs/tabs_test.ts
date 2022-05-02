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


import '../../../components/shared/tabs/tabs.js';

import {html, render} from 'lit';

import {Tabs} from '../../../components/shared/tabs/tabs.js';

describe('<tabs>', () => {
  let tabs: Tabs;
  let container: HTMLDivElement;

  beforeEach(async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    render(
        html`
      <me-tabs id="section">
        <me-tabbed-panel id="panelOne"></me-tabbed-panel>
        <me-tabbed-panel icon="favorite" id="panelTwo"></me-tabbed-panel>
      </me-tabs>`,
        container);

    tabs = container.querySelector('me-tabs')!;
    expect(tabs).toBeDefined();
    await tabs.updateComplete;
  });

  it('exists', () => {
    expect(tabs instanceof HTMLElement).toBe(true);
    expect(tabs.tagName).toEqual('ME-TABS');
  });
});
