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

    const enableControls = false;
    this[$renderer] = new PathtracingRenderer(this[$canvas]!, enableControls);

    const renderer = this[$renderer];
    renderer.autoScaleOnImport(false);
    renderer.setPixelRatio(0.5);
    renderer.setMaxBounceDepth(8);

    await new Promise((resolve) => {
      console.log('Loading resources for', scenario.model);
      renderer.loadScene(scenario.model, scenario.lighting, () => {
        this[$updateSize]();
        // console.log(this[$canvas]!.width, this[$canvas]!.height);
        renderer.resize(this[$canvas]!.width, this[$canvas]!.height);

        if (!scenario.renderSkybox) {
          // when set to false, it will make the background to be white
          renderer.useBackgroundFromIBL(false);
        }
        resolve();
      });
    });

    let numSamples = scenario.pt?.numSamples;

    if (numSamples == null) {
      numSamples = 1024;
    }

    console.log('Rendering ' + numSamples + ' samples');
    this[$renderer].render(
        numSamples,
        (frame: number) => {
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

    const canvas = this[$canvas]!;
    const {dimensions, target, orbit, verticalFoV} = this.scenario;
    console.log('Scenario:', dimensions, target, orbit, verticalFoV);

    const width = dimensions.width;
    const height = dimensions.height;

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

    this[$renderer].setLookAt(eye, center, [0, 1, 0]);
    console.log(eye, center);

    this[$renderer].setPerspective(verticalFoV, near, far);
    console.log('perspective: ', near, far);
  }
}
