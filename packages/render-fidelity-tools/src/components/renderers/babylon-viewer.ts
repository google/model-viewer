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

import '@babylonjs/loaders/glTF';
import {ArcRotateCamera, Engine, HemisphericLight, Scene, SceneLoader, Vector3} from '@babylonjs/core';
import {css, customElement, html, LitElement, property} from 'lit-element';

import {ScenarioConfig} from '../../common.js';


// const IS_BINARY_RE = /\.glb$/;

const $initialize = Symbol('initialize');
const $updateScenario = Symbol('scenario');
const $updateSize = Symbol('updateSize');
const $render = Symbol('render');
const $canvas = Symbol('canvas');
const $engine = Symbol('engine');
const $scene = Symbol('scene');
const $camera = Symbol('camera');
const $light1 = Symbol('light1');


@customElement('babylon-viewer')
export class BabylonViewer extends LitElement {
  @property({type: Object}) scenario: ScenarioConfig|null = null;
  private[$canvas]: HTMLCanvasElement|null;
  private[$engine]: Engine;
  private[$scene]: Scene;
  private[$camera]: ArcRotateCamera;
  private[$light1]: HemisphericLight;

  constructor() {
    super();
    console.log(SceneLoader);
    console.log(this[$light1]);
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
    this[$canvas] = this.shadowRoot!.querySelector('canvas');

    // Create the scene space
    this[$engine] = new Engine(this[$canvas], true);
    this[$scene] = new Scene(this[$engine]);

    // Add a camera to the scene and attach it to the canvas
    this[$camera] = new ArcRotateCamera(
        'Camera',
        Math.PI / 2,
        Math.PI / 2,
        2,
        new Vector3(0, 0, 5),
        this[$scene]);
    this[$camera].attachControl(this[$canvas]!, true);

    this[$light1] =
        new HemisphericLight('light1', new Vector3(1, 1, 0), this[$scene]);

    this[$engine].runRenderLoop(() => {
      this[$scene].render();
    });
  }

  /*
    since in lit element life cycle the canvas is add to shadow dom after the
    constructor is called, i can't get <canvas>'s ref in the constructor, so i
    have to add it here. but it should only be called once
  */
  private async[$updateScenario](scenario: ScenarioConfig) {
    if (this[$canvas] == null) {
      this[$initialize]();
    }

    this[$updateSize]();

    const lastSlashIndex = scenario.model.lastIndexOf('/');
    const modelRootPath = scenario.model.substring(0, lastSlashIndex + 1);
    const modelFileName =
        scenario.model.substring(lastSlashIndex + 1, scenario.model.length);
    console.log(lastSlashIndex);
    console.log(scenario.model);
    console.log(modelRootPath);
    console.log(modelFileName);

    await new Promise((resolve) => {
      console.log('Loading models for', scenario.model);
      SceneLoader.Append(modelRootPath, modelFileName, this[$scene], () => {
        resolve();
      });
    });
  }

  private[$render]() {
  }

  private[$updateSize]() {
    if (this[$canvas] == null || this.scenario == null) {
      // Not initialized yet. This will be invoked again when initialized.
      return;
    }

    const canvas = this[$canvas]!;
    const {dimensions} = this.scenario;

    const dpr = window.devicePixelRatio;
    const width = dimensions.width * dpr;
    const height = dimensions.height * dpr;

    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${dimensions.width}px`;
    canvas.style.height = `${dimensions.height}px`;
  }
}
