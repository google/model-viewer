/* @license
 * Copyright 2019 Google LLC. All Rights Reserved.
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

import {css, html, LitElement} from 'lit';
import {customElement, property} from 'lit/decorators.js'

import {ImageComparisonConfig, ScenarioConfig} from '../common.js';
import {ConfigReader} from '../config-reader.js';

@customElement('renderer-harness')
export class RendererConfiguration extends LitElement {
  @property({type: String, attribute: 'scenario-name'})
  scenarioName: string|null = null;

  @property({type: String, attribute: 'config-url'})
  configUrl: string|null = null;

  @property({type: Boolean, attribute: 'hide-ui'}) hideUi: boolean = false;

  @property({type: Object}) protected config: ImageComparisonConfig|null = null;

  @property({type: Object}) protected scenario: ScenarioConfig|null = null;

  connectedCallback() {
    super.connectedCallback();

    const {queryParameters} = this;
    this.configUrl = queryParameters.config || '../../config.json';
    this.scenarioName = queryParameters.scenario || null;
    this.hideUi = 'hide-ui' in queryParameters || false;
  }

  protected get queryParameters(): {[index: string]: string} {
    return self.location.search.slice(1).split('&').reduce(
        (queryParameters, parameter) => {
          const [key, value] = parameter.split('=');
          queryParameters[key] = decodeURIComponent(value);
          return queryParameters;
        },
        {} as {[index: string]: string});
  }

  async updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);

    if (changedProperties.has('configUrl')) {
      if (this.configUrl == null) {
        this.config = null;
      } else {
        this.config = await (await fetch(this.configUrl)).json();
      }
    }

    if (changedProperties.has('scenarioName') ||
        changedProperties.has('configUrl')) {
      if (this.scenarioName == null || this.config == null) {
        this.scenario = null;
      } else {
        this.scenario =
            (new ConfigReader(this.config)).scenarioConfig(this.scenarioName);
      }

      const previousScenarioName = changedProperties.get('scenarioName');

      if (previousScenarioName !== this.scenarioName) {
        this.dispatchEvent(new CustomEvent(
            'scenario-change', {detail: {scenario: this.scenario}}));
      }

      if (previousScenarioName != null && this.scenarioName != null) {
        const url = new URL(window.location.toString());
        url.search = url.search.replace(
            `scenario=${encodeURIComponent(previousScenarioName)}`,
            `scenario=${encodeURIComponent(this.scenarioName)}`);
        history.pushState(null, document.title, url.toString());
      }
    }
  }

  static get styles() {
    return css`
:host {
  display: flex;
  flex-direction: column;
  font-family: system-ui, sans-serif;
  color: #fafafa;
}

#widgets {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  background-color: #444;
  padding: 0 1em;
  min-height: 4em;
}

#widgets > * {
  margin-right: 1em;
}

#widgets.hidden {
  display: none;
}

#renderer {
  max-width: 100%;
  overflow: auto;
}
`;
  }

  render() {
    const widgets = [];

    if (this.config != null) {
      const scenarioOptions = this.config.scenarios.map(
          scenario => html`<option ?selected="${
              scenario.name === this.scenarioName}">${scenario.name}</option>`);
      widgets.push(html`
<select @change="${
          (event: Event) => this.scenarioName =
              (event.target != null ?
                   (event.target as HTMLSelectElement).value :
                   this.scenarioName)}">
  ${scenarioOptions}
</select>`);
    }

    return html`
<div id="widgets" class="${this.hideUi ? 'hidden' : ''}">
  <h2><slot name="title"></slot></h2>
  ${widgets}
</div>
<div id="renderer" .style="${this.hideUi ? 'overflow: visible' : ''}">
  <slot name="renderer"></slot>
</div>
`;
  }
}