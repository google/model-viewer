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

import {Aabb, Camera, Camera$Fov, Engine, Entity, EntityManager, fetch, gltfio$FilamentAsset, IndirectLight, init, LightManager, LightManager$Type, Renderer, Scene, Skybox, SwapChain, View} from 'filament';
import {css, customElement, html, LitElement, property} from 'lit-element';

import {ScenarioConfig} from '../../common.js';

const fetchFilamentAssets = async(assets: Array<string>): Promise<void> =>
    new Promise((resolve) => {
      fetch(assets, () => resolve(), () => {});
    });

const basepath = (urlString: string): string => {
  const url = new URL(urlString, self.location.toString());
  const {pathname} = url;
  url.pathname = pathname.slice(0, pathname.lastIndexOf('/') + 1);
  return url.toString();
};

const IS_BINARY_RE = /\.glb$/;

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
const $directionalLight = Symbol('this[$directionalLight]');

const $initialize = Symbol('initialize');
const $updateScenario = Symbol('scenario');
const $updateSize = Symbol('updateSize');
const $render = Symbol('render');
const $rendering = Symbol('rendering');

@customElement('filament-viewer')
export class FilamentViewer extends LitElement {
  @property({type: Object}) scenario: ScenarioConfig|null = null;

  private[$rendering]: boolean = false;
  private[$engine]: Engine;
  private[$scene]: Scene;
  private[$renderer]: Renderer;
  private[$swapChain]: SwapChain;
  private[$camera]: Camera;
  private[$view]: View;

  private[$ibl]: IndirectLight|null;
  private[$skybox]: Skybox|null;
  private[$currentAsset]: gltfio$FilamentAsset|null;
  private[$directionalLight]: Entity|null;

  private[$canvas]: HTMLCanvasElement|null = null;
  private[$boundingBox]: Aabb = {min: [0, 0, 0], max: [0, 0, 0]};

  constructor() {
    super();

    init([], () => {
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
    this[$canvas] = this.shadowRoot!.querySelector('canvas');
    const engine = Engine.create(this[$canvas]!);
    const view = engine.createView();

    this[$engine] = engine;
    this[$scene] = engine.createScene();
    this[$swapChain] = engine.createSwapChain();
    this[$renderer] = engine.createRenderer();
    this[$camera] = engine.createCamera();
    this[$view] = view;
    view.setCamera(this[$camera]);
    view.setScene(this[$scene]);
    view.setBloomOptions({enabled: false});

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
      const entities = this[$currentAsset]!.getEntities();
      const size = entities.size();

      for (let i = 0; i < size; ++i) {
        const entity = entities.get(i);
        this[$scene].remove(entity);
        this[$engine].destroyEntity(entity);
      }

      this[$currentAsset] = null;
    }

    if (this[$ibl] != null) {
      this[$scene].setIndirectLight(null);
      this[$engine].destroyIndirectLight(this[$ibl]!);
      this[$ibl] = null;
    }

    if (this[$skybox] != null) {
      this[$engine].destroySkybox(this[$skybox]!);
      this[$skybox] = null;
    }

    if (this[$directionalLight] != null) {
      this[$scene].remove(this[$directionalLight]!);
      this[$engine].destroyEntity(this[$directionalLight]!);
      this[$directionalLight] = null;
    }

    /*
    const {r, g, b} = scenario.clearColor;
    this[$renderer].setClearOptions(
        {clearColor: [r, g, b, 1], clear: true, discard: true});
    */
    await fetchFilamentAssets([modelUrl]);

    // This special case is for the DirectionalLightTest, where we compare the
    // <model-viewer> IBL to the Filament directional light by using a special
    // environment map with a single bright pixel that represents a 1 lux
    // directional light.
    if (lightingBaseName === 'spot1Lux') {
      const directionalLight = EntityManager.get().create();
      this[$directionalLight] = directionalLight;
      const x = 597;
      const y = 213;
      const theta = (x + 0.5) * Math.PI / 512;
      const phi = (y + 0.5) * Math.PI / 512;
      const lightDirection = [
        Math.sin(phi) * Math.cos(theta),
        -Math.cos(phi),
        Math.sin(phi) * Math.sin(theta)
      ];
      LightManager.Builder(LightManager$Type.DIRECTIONAL)
          .color([1, 1, 1])
          .intensity(1)
          .direction(lightDirection)
          .build(this[$engine], directionalLight);
      this[$scene].addEntity(directionalLight);
    } else {
      await fetchFilamentAssets([iblUrl, skyboxUrl]);
      const ibl = this[$engine].createIblFromKtx(iblUrl);
      this[$scene].setIndirectLight(ibl);
      this[$ibl] = ibl
      ibl.setIntensity(1.0);
      ibl.setRotation([0, 0, -1, 0, 1, 0, 1, 0, 0]);  // 90 degrees
      if (scenario.renderSkybox) {
        this[$skybox] = this[$engine].createSkyFromKtx(skyboxUrl);
        this[$scene].setSkybox(this[$skybox]);
      }
    }

    const loader = this[$engine].createAssetLoader();
    this[$currentAsset] = IS_BINARY_RE.test(modelUrl) ?
        loader.createAssetFromBinary(modelUrl) :
        loader.createAssetFromJson(modelUrl);

    const asset = this[$currentAsset]!;

    await new Promise((resolve) => {
      console.log('Loading resources for', modelUrl);
      asset.loadResources(resolve, () => {}, basepath(modelUrl), 1);
    });

    loader.delete();

    this[$boundingBox] = asset.getBoundingBox();
    this[$scene].addEntities(asset.getEntities());

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

    const Fov = Camera$Fov;
    const canvas = this[$canvas]!;
    const {dimensions, target, orbit, verticalFoV} = this.scenario;

    const dpr = window.devicePixelRatio;
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

    const camera = this[$camera];
    camera.setProjectionFov(verticalFoV, aspect, near, far, Fov!.VERTICAL);
    const up = [0, 1, 0];
    camera.lookAt(eye, center, up);
    camera.setExposureDirect(1.0);
  }
}
