/* @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License atQ
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// import {Engine, Scene} from '@babylonjs/core';
import {css, customElement, html, LitElement, property} from 'lit-element';

import {ScenarioConfig} from '../../common.js';


// const IS_BINARY_RE = /\.glb$/;

const $initialize = Symbol('initialize');
const $updateScenario = Symbol('scenario');
const $updateSize = Symbol('updateSize');
const $render = Symbol('render');
const $canvas = Symbol('canvas');

@customElement('babylon-viewer')
export class BabylonViewer extends LitElement {
  @property({type: Object}) scenario: ScenarioConfig|null = null;
  private[$canvas]: HTMLCanvasElement|null;

  constructor() {
    super();
    this[$initialize]();
  }

  connectedCallback() {
    super.connectedCallback();
  }

  disconnectedCallback() {
  }

  updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);
    this[$updateSize]();

    if (changedProperties.has('scenario') && this.scenario != null) {
      this[$updateScenario](this.scenario);
    }
  }

  static get styles() {
    return css`
:host {
 display: block;
}
`;
  }

  render() {
    this[$render]();
    return html`<canvas id="canvas"></canvas>`;
  }

  private[$initialize]() {
    this[$updateSize]();
    this[$updateScenario](this.scenario!);
  }

  private async[$updateScenario](scenario: ScenarioConfig) {
    if (this.scenario == null)
      return;
    console.log(scenario);
  }

  private[$render]() {
    if (!this[$canvas]) {
      this[$canvas] = this.shadowRoot!.querySelector('canvas');
      console.log(this[$canvas]);
    }
  }

  private[$updateSize]() {
  }
}
