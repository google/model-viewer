// @ts-ignore
import {GltfState, GltfView, ResourceLoader} from '@khronosgroup/gltf-viewer';
import {css, html, LitElement} from 'lit';
import {customElement, property} from 'lit/decorators.js'

import {ScenarioConfig} from '../../common.js';


const $updateScenario = Symbol('updateScenario');
const $updateSize = Symbol('updateSize');
const $canvas = Symbol('canvas');
const $view = Symbol('view');
const $state = Symbol('state');
const $resourceLoader = Symbol('resourceLoader');
const $degToRadians = Symbol('degToRadians');

@customElement('gltf-sample-viewer')
export class GltfSampleViewer extends LitElement {
  @property({type: Object}) scenario: ScenarioConfig|null = null;
  private[$canvas]: HTMLCanvasElement|null;
  private[$view]: GltfView;
  private[$state]: GltfState;
  private[$resourceLoader]: ResourceLoader;

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


  updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);
    this[$updateSize]();

    if (changedProperties.has('scenario') && this.scenario != null) {
      this[$updateScenario](this.scenario);
    }
  }


  private async[$updateScenario](scenario: ScenarioConfig) {
    if (this[$view] == null) {
      this[$canvas] = this.shadowRoot!.querySelector('canvas');
      this[$view] = new GltfView(
          this[$canvas]!.getContext('webgl2', {alpha: true, antialias: true}));
      this[$state] = this[$view].createState();
      this[$resourceLoader] = this[$view].createResourceLoader();
    }
    this[$updateSize]();

    this[$state].gltf = await this[$resourceLoader].loadGltf(scenario.model);

    const defaultScene = this[$state].gltf.scene;
    this[$state].sceneIndex = defaultScene === undefined ? 0 : defaultScene;
    const scene = this[$state].gltf.scenes[this[$state].sceneIndex];
    scene.applyTransformHierarchy(this[$state].gltf);

    const {target, orbit, verticalFoV} = scenario;
    const camera = this[$state].userCamera;
    camera.setVerticalFoV(this[$degToRadians](verticalFoV));
    camera.fitViewToScene(this[$state].gltf, this[$state].sceneIndex);

    const yaw = this[$degToRadians](orbit.theta);
    const pitch = this[$degToRadians]((orbit.phi - 90));
    camera.setRotation(yaw, pitch);
    camera.setDistanceFromTarget(orbit.radius, [target.x, target.y, target.z]);
    this[$state].renderingParameters.clearColor = [0, 0, 0, 0];

    const luts = {
      lut_ggx_file:
          '../../../node_modules/@khronosgroup/gltf-viewer/dist/assets/lut_ggx.png',
      lut_charlie_file:
          '../../../node_modules/@khronosgroup/gltf-viewer/dist/assets/lut_charlie.png',
      lut_sheen_E_file:
          '../../../node_modules/@khronosgroup/gltf-viewer/dist/assets/lut_sheen_E.png'
    };

    this[$state].renderingParameters.environmentRotation = 0;

    this[$state].environment =
        await this[$resourceLoader].loadEnvironment(scenario.lighting, luts);

    this[$state].renderingParameters.renderEnvironmentMap =
        scenario.renderSkybox;
    this[$state].renderingParameters.blurEnvironmentMap = false;

    this[$state].renderingParameters.toneMap =
        GltfState.ToneMaps.ACES_HILL_EXPOSURE_BOOST;

    this[$view].renderFrame(
        this[$state], this[$canvas]!.width, this[$canvas]!.height);
    requestAnimationFrame(() => {
      this.dispatchEvent(
          // This notifies the framework that the model is visible and the
          // screenshot can be taken
          new CustomEvent('model-visibility', {detail: {visible: true}}));
    });
  }


  private[$updateSize]() {
    if (this[$canvas] == null || this.scenario == null) {
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

    const aspect = width / height;

    const camera = this[$state].userCamera;
    camera.aspectRatio = aspect;
  }

  private[$degToRadians](degree: number) {
    return Math.PI * (degree / 180);
  }
}
