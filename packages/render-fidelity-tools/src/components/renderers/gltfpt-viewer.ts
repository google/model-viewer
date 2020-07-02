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

import {resolveDpr} from '@google/model-viewer/lib/utilities.js';
// @ts-ignore
import {PathtracingRenderer} from 'dspbr-pt/lib/renderer.js';
import {css, customElement, html, LitElement, property} from 'lit-element';

import {ScenarioConfig} from '../../common.js';

const $canvas = Symbol('canvas');

const $initialize = Symbol('initialize');
const $updateScenario = Symbol('scenario');
const $updateSize = Symbol('updateSize');
// const $render = Symbol('render');

const $renderer = Symbol('renderer');

@customElement('gltfpt-viewer')
export class PathtracingViewer extends LitElement {
  @property({type: Object}) scenario: ScenarioConfig|null = null;

  private[$renderer]: any|null;

  private[$canvas]: HTMLCanvasElement|null = null;

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
    return html`<canvas id="canvas"></canvas>`;
  }

  private[$initialize]() {
    this[$updateSize]();
  }

  private async[$updateScenario](scenario: ScenarioConfig) {
    this[$canvas] = this.shadowRoot!.querySelector('canvas');

    const dpr = resolveDpr();

    const settings = {
      pathtracing: true,
      debugMode: 'None',
      maxBounceDepth: 1,
      useIBL: true,
      autoScaleOnImport: false,
      pixelRatio: 1.0 / dpr,  // TODO: clarify
      autoRotate: false,
      disableDirectShadows: true
    };

    this[$renderer] =
        new PathtracingRenderer({'canvas': this[$canvas]!}, settings);

    const renderer = this[$renderer];

    await new Promise((resolve) => {
      console.log('Loading resources for', scenario.model);
      renderer.loadScene(scenario.model, scenario.lighting, () => {
        this[$updateSize]();
        // console.log(this[$canvas]!.width, this[$canvas]!.height);
        renderer.resize(this[$canvas]!.width, this[$canvas]!.height)
        resolve();
      });
    });

    let numSamples = scenario.pt?.numSamples;

    if (numSamples == null)
      numSamples = 512;

    console.log('Rendering ' + numSamples + ' samples');
    renderer.render(
        numSamples,
        (frame: number) => {
          // printProgress('frame finished: ' + frame);
          console.log('frame finished ' + frame);
        },
        () => {
          // Wait two rAFs to ensure we rendered at least once //TODO: clarify
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              this.dispatchEvent(new CustomEvent(
                  'model-visibility', {detail: {visible: true}}));
            });
          });
        });
  }

  private[$updateSize]() {
    if (this[$canvas] == null || this.scenario == null) {
      // Not initialized yet. This will be invoked again when initialized.
      return;
    }

    // const Fov = Camera$Fov;
    const canvas = this[$canvas]!;
    const {dimensions, target, orbit, verticalFoV} = this.scenario;
    console.log('Scenario:', dimensions, target, orbit, verticalFoV);

    // const dpr = resolveDpr(); //TODO: clarify
    const width = dimensions.width;    // * dpr;
    const height = dimensions.height;  // * dpr;

    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${dimensions.width}px`;
    canvas.style.height = `${dimensions.height}px`;

    const center = [target.x, target.y, target.z];

    const theta = orbit.theta * Math.PI / 180;
    const phi = orbit.phi * Math.PI / 180;
    const radiusSinPhi = orbit.radius * Math.sin(phi);
    const eye = [
      radiusSinPhi * Math.sin(theta) + target.x,
      orbit.radius * Math.cos(phi) + target.y,
      radiusSinPhi * Math.cos(theta) + target.z
    ];
    if (orbit.radius <= 0) {
      center[0] = eye[0] - Math.sin(phi) * Math.sin(theta);
      center[1] = eye[1] - Math.cos(phi);
      center[2] = eye[2] - Math.sin(phi) * Math.cos(theta);
    }

    const bbox = this[$renderer].getBoundingBox();
    console.log(bbox);
    const modelRadius = Math.max(
        bbox.max.x - bbox.min.x,
        bbox.max.y - bbox.min.y,
        bbox.max.z - bbox.min.z);
    const far = 2 * Math.max(modelRadius, orbit.radius);
    const near = far / 1000;

    const camera = this[$renderer].getCamera();
    camera.position.set(eye[0], eye[1], eye[2]);
    camera.up.set(0, 1, 0);
    camera.lookAt(center[0], center[1], center[2]);
    camera.updateMatrixWorld();
    console.log(eye, center);

    camera.fov = verticalFoV;
    camera.near = near;
    camera.far = far;
    camera.updateProjectionMatrix();
    console.log('perspective: ', near, far);
  }
}
