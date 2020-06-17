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

import {ArcRotateCamera, Engine, Scene, Vector3} from '@babylonjs/core';
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


@customElement('babylon-viewer')
export class BabylonViewer extends LitElement {
  @property({type: Object}) scenario: ScenarioConfig|null = null;
  private[$canvas]: HTMLCanvasElement|null;
  private[$engine]: Engine;
  private[$scene]: Scene;
  private[$camera]: ArcRotateCamera;

  constructor() {
    super();
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

    console.log(this[$scene]);
    console.log(this[$engine]);
    console.log(this[$camera]);
    /*
    // Add lights to the scene
    var light1 = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(1,
    1, 0), scene); var light2 = new BABYLON.PointLight("light2", new
    BABYLON.Vector3(0, 1, -1), scene);

    // Add and manipulate meshes in the scene
    var sphere = BABYLON.MeshBuilder.CreateSphere("sphere", {diameter:2},
    scene);
    */
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

    console.log(this[$canvas]);
    console.log(scenario);
  }

  private[$render]() {
  }

  private[$updateSize]() {
  }
}
