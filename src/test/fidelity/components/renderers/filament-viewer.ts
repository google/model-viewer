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

import {css, customElement, html, LitElement, property} from 'lit-element';

import {resolveDpr} from '../../../../utilities.js';

import {ScenarioConfig} from '../../common.js';

const fetchFilamentAssets = async(assets: Array<string>): Promise<void> =>
    new Promise((resolve) => {
      self.Filament.fetch(assets, () => resolve(), () => {});
    });

const basepath = (urlString: string): string => {
  const url = new URL(urlString, self.location.toString());
  const {pathname} = url;
  url.pathname = pathname.slice(0, pathname.lastIndexOf('/') + 1);
  return url.toString();
};

const IS_BINARY_RE = /\.glb$/;

interface BoundingBox {
  min: [number, number, number];
  max: [number, number, number];
}

const $engine = Symbol('engine');
const $scene = Symbol('scene');
const $ibl = Symbol('ibl');
const $skybox = Symbol('skybox');
const $swapChain = Symbol('swapChain');
const $renderer = Symbol('renderer');
const $camera = Symbol('camera');
const $view = Symbol('view');
const $canvas = Symbol('canvas');
const $boundingBox = Symbol('boundingBox');
const $currentAsset = Symbol('currentAsset');

const $initialize = Symbol('initialize');
const $updateScenario = Symbol('scenario');
const $updateSize = Symbol('updateSize');
const $render = Symbol('render');
const $rendering = Symbol('rendering');

@customElement('filament-viewer')
export class FilamentViewer extends LitElement {
  @property({type: Object}) scenario: ScenarioConfig|null = null;

  private[$rendering]: boolean = false;
  private[$engine]: any = null;
  private[$scene]: any = null;
  private[$renderer]: any = null;
  private[$swapChain]: any = null;
  private[$camera]: any = null;
  private[$view]: any = null;

  private[$ibl]: any = null;
  private[$skybox]: any = null;
  private[$currentAsset]: any = null;

  private[$canvas]: HTMLCanvasElement|null = null;
  private[$boundingBox]: BoundingBox|null = null;

  constructor() {
    super();

    self.Filament.init([], () => {
      this[$initialize]();
    });
  }

  connectedCallback() {
    super.connectedCallback();
    this[$render]();
  }

  disconnectedCallback() {
    this[$rendering] = false;
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
    const {Filament} = self;

    this[$canvas] = this.shadowRoot!.querySelector('canvas');
    this[$engine] = Filament.Engine.create(this[$canvas]);
    this[$scene] = this[$engine].createScene();
    this[$swapChain] = this[$engine].createSwapChain();
    this[$renderer] = this[$engine].createRenderer();
    this[$camera] = this[$engine].createCamera();
    this[$view] = this[$engine].createView();
    this[$view].setCamera(this[$camera]);
    this[$view].setScene(this[$scene]);

    this[$updateSize]();
  }

  private async[$updateScenario](scenario: ScenarioConfig) {
    const modelUrl =
        new URL(scenario.model, window.location.toString()).toString();
    const lightingBaseName = (scenario.lighting.split('/').pop() as string)
                                 .split('.')
                                 .slice(0, -1)
                                 .join('');
    const iblUrl = `./ktx/${lightingBaseName}/${lightingBaseName}_ibl.ktx`;
    const skyboxUrl =
        `./ktx/${lightingBaseName}/${lightingBaseName}_skybox.ktx`;

    console.log('Scenario:', scenario.name);
    console.log('Lighting:', lightingBaseName);

    if (this[$currentAsset] != null) {
      const entities = this[$currentAsset].getEntities();
      const size = entities.size();

      for (let i = 0; i < size; ++i) {
        const entity = entities.get(i);
        this[$scene].remove(entity);
        this[$engine].destroyEntity(entity);
      }

      this[$currentAsset] = null;
    }

    if (this[$ibl] != null) {
      this[$engine].destroyIndirectLight(this[$ibl]);
      this[$ibl] = null;
    }

    if (this[$skybox] != null) {
      this[$engine].destroySkybox(this[$skybox]);
      this[$skybox] = null;
    }

    await fetchFilamentAssets([modelUrl, iblUrl, skyboxUrl]);

    this[$ibl] = this[$engine].createIblFromKtx(iblUrl);
    this[$scene].setIndirectLight(this[$ibl]);
    this[$ibl].setIntensity(1.0);
    this[$ibl].setRotation([0, 0, -1, 0, 1, 0, 1, 0, 0]);  // 90 degrees

    this[$skybox] = this[$engine].createSkyFromKtx(skyboxUrl);
    this[$scene].setSkybox(this[$skybox]);

    const loader = this[$engine].createAssetLoader();
    this[$currentAsset] = IS_BINARY_RE.test(modelUrl) ?
        loader.createAssetFromBinary(modelUrl) :
        loader.createAssetFromJson(modelUrl);

    const finalize = (await new Promise((resolve) => {
                       console.log('Loading resources for', modelUrl);
                       this[$currentAsset].loadResources(
                           resolve, () => {}, basepath(modelUrl));
                     })) as () => void;

    finalize();
    loader.delete();

    this[$boundingBox] = this[$currentAsset].getBoundingBox() as BoundingBox;
    this[$scene].addEntities(this[$currentAsset].getEntities());

    this[$updateSize]();

    // Wait two rAFs to ensure we rendered at least once:
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.dispatchEvent(
            new CustomEvent('model-visibility', {detail: {visible: true}}));
      });
    });
  }

  private[$render]() {
    this[$rendering] = true;

    if (this[$renderer] != null) {
      this[$renderer].render(this[$swapChain], this[$view]);
    }

    self.requestAnimationFrame(() => {
      if (this[$rendering]) {
        this[$render]();
      }
    });
  }

  private[$updateSize]() {
    if (this[$canvas] == null || this.scenario == null) {
      // Not initialized yet. This will be invoked again when initialized.
      return;
    }

    const Fov = self.Filament.Camera$Fov;
    const canvas = this[$canvas]!;
    const {dimensions, target, orbit, verticalFoV} = this.scenario;

    const dpr = resolveDpr();
    const width = dimensions.width * dpr;
    const height = dimensions.height * dpr;

    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${dimensions.width}px`;
    canvas.style.height = `${dimensions.height}px`;

    this[$view].setViewport([0, 0, width, height]);

    const aspect = width / height;

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

    const {min, max} = this[$boundingBox]!;
    const modelRadius =
        Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
    const far = 2 * Math.max(modelRadius, orbit.radius);
    const near = far / 1000;

    this[$camera].setProjectionFov(
        verticalFoV, aspect, near, far, Fov!.VERTICAL);
    const up = [0, 1, 0];
    this[$camera].lookAt(eye, center, up);
    this[$camera].setExposureDirect(1.0);
  }
}