/*
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import './analysis-view.js';
import './rendering-scenario.js';

import {html, LitElement, property} from 'lit-element';

import {ImageComparisonConfig} from '../common.js';

export class ImageComparisonApp extends LitElement {
  @property({type: String}) src: string = '';

  @property({type: Object}) config: ImageComparisonConfig|null = null;

  updated(changedProperties: Map<any, any>) {
    super.updated(changedProperties);

    if (changedProperties.has('src')) {
      this.loadConfig();
    }
  }

  private async loadConfig() {
    if (this.src) {
      this.config = await (await fetch(this.src)).json();
    } else {
      this.config = null;
    }
  }

  render() {
    const {config} = this;

    if (this.config == null) {
      return this.src ? html`Loading...` : html`No config specified`;
    }

    const scenarios = config!.scenarios.map((scenario) => html`
<rendering-scenario
    .slug="${scenario.slug}"
    .goldens="${scenario.goldens}"
    .dimensions="${scenario.dimensions}">
</rendering-scenario>`);

    return html`
<style>
#scenarios {
  display: flex;
  max-width: 100%;
  flex-direction: column;
  align-items: center;
  padding-bottom: 5em;
}
</style>
<div id="scenarios">
  ${scenarios}
</div>
<analysis-view></analysis-view>`;
  }
};

customElements.define('image-comparison-app', ImageComparisonApp);
