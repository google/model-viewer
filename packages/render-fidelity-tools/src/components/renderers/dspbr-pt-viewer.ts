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
import {PathtracingRenderer, PerspectiveCamera, Box3, Loader} from 'dspbr-pt';
import {css, html, LitElement} from 'lit';
import {customElement, property} from 'lit/decorators.js'
import {ScenarioConfig} from '../../common.js';

const $canvas = Symbol('canvas');

const $initialize = Symbol('initialize');
const $updateScenario = Symbol('scenario');
const $updateSize = Symbol('updateSize');

const $renderer = Symbol('renderer');
const $camera = Symbol('camera');
const $boundingBox = Symbol('boundingBox');

@customElement('dspbr-pt-viewer')
export class PathtracingViewer extends LitElement {
  @property({type: Object}) scenario: ScenarioConfig|null = null;

  private[$renderer]: any|null;
  private[$camera]: any|null;
  private[$boundingBox]: Box3;

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


    this[$camera] = new PerspectiveCamera(45, this[$canvas]!.width/this[$canvas]!.height, 0.01, 1000);
    this[$renderer] = new PathtracingRenderer({ canvas: this[$canvas]!});

    this[$renderer].pixelRatio = 1.0;
    // this.renderer.iblRotation = 180.0;
    this[$renderer].exposure = 1.0;
    this[$renderer].maxBounces = 8;
    this[$renderer].tonemapping = "AcesFilm";

    await new Promise<void>((resolve) => {
      // console.log('Loading resources for', scenario.model);

      Loader.loadScene(scenario.model, false).then((gltf: any) => {
        this[$boundingBox] = new Box3().setFromObject(gltf.scene);
        this[$renderer].setScene(gltf.scene, gltf).then(() => {
          if (scenario.lighting) {
            Loader.loadIBL(scenario.lighting).then((ibl: any) => {
              // console.log("Loaded ibl", scenario.lighting);
              this[$renderer].setIBL(ibl);
            });
          }
          this[$updateSize]();
          this[$renderer].resize(this[$canvas]!.width, this[$canvas]!.height);

          if (!scenario.renderSkybox) {
            this[$renderer].showBackground = false;  // transparent background
          }
          resolve();
        });
      });

    });

    let numSamples = scenario.pt?.numSamples;

    if (numSamples == null) {
      numSamples = 8192;
    }

    console.log('Rendering ' + numSamples + ' samples');
    this[$renderer].render(this[$camera]!, numSamples, (sampleCount: number) => {
        if(sampleCount % 100 == 0) {
          console.log(sampleCount, '/', numSamples);
        }
      },
      () => {
        console.log('Done!');
        requestAnimationFrame(() => {
          this.dispatchEvent(
              new CustomEvent('model-visibility', {detail: {visible: true}}));
        });
      });
  }

  private[$updateSize]() {
    if (this[$canvas] == null || this.scenario == null) {
      // Not initialized yet. This will be invoked again when initialized.
      return;
    }

    const {dimensions, target, orbit, verticalFoV} = this.scenario;

    const width = dimensions.width * window.devicePixelRatio;
    const height = dimensions.height * window.devicePixelRatio;

    this[$canvas]!.width = width;
    this[$canvas]!.height = height;
    this[$canvas]!.style.width = `${dimensions.width}px`;
    this[$canvas]!.style.height = `${dimensions.height}px`;

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

    const bbox =  this[$boundingBox];
    const modelRadius = Math.max(
        bbox.max.x - bbox.min.x,
        bbox.max.y - bbox.min.y,
        bbox.max.z - bbox.min.z);
    const far = 2 * Math.max(modelRadius, orbit.radius);
    const near = far / 1000;

    this[$camera].position.set(eye[0], eye[1], eye[2]);
    this[$camera].lookAt(center[0], center[1], center[2]);
    this[$camera].updateMatrixWorld();

    this[$camera].aspect = this[$canvas]!.width/this[$canvas]!.height;
    this[$camera].fov = verticalFoV;
    this[$camera].near = near;
    this[$camera].far = far;
  }
}
