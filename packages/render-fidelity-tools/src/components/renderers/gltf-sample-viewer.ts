// @ts-ignore
import {computePrimitiveCentroids, GltfState, GltfView, initDracoLib, initKtxLib, loadEnvironment, loadGltf, ToneMaps} from 'gltf-viewer';
import {css, customElement, html, LitElement, property} from 'lit-element';

import {ScenarioConfig} from '../../common.js';


const $updateScenario = Symbol('updateScenario');
const $updateSize = Symbol('updateSize');
const $canvas = Symbol('canvas');
const $view = Symbol('view');
const $state = Symbol('state');
const $degToRadians = Symbol('degToRadians');

@customElement('gltf-sample-viewer')
export class GltfSampleViewer extends LitElement {
  @property({type: Object}) scenario: ScenarioConfig|null = null;
  private[$canvas]: HTMLCanvasElement|null;
  private[$view]: GltfView;
  private[$state]: GltfState;

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
      console.log('test');
      this[$canvas] = this.shadowRoot!.querySelector('canvas');
      this[$view] = new GltfView(
          this[$canvas]!.getContext('webgl2', {alpha: false, antialias: true}));
      this[$state] = this[$view].createState();
      initDracoLib();
      initKtxLib(this[$view]);
    }
    this[$updateSize]();

    this[$state].gltf = await loadGltf(scenario.model, this[$view]);

    const defaultScene = this[$state].gltf.scene;
    this[$state].sceneIndex = defaultScene === undefined ? 0 : defaultScene;
    const scene = this[$state].gltf.scenes[this[$state].sceneIndex];
    scene.applyTransformHierarchy(this[$state].gltf);
    computePrimitiveCentroids(this[$state].gltf);

    const {target, orbit, verticalFoV} = scenario;
    const camera = this[$state].userCamera;
    camera.fitViewToScene(this[$state].gltf, this[$state].sceneIndex);
    camera.setTarget([target.x, target.y, target.z]);
    const pitch = this[$degToRadians](orbit.theta);
    const yaw = this[$degToRadians](orbit.phi - 90);
    camera.setRotation(yaw, pitch);
    camera.setZoom(orbit.radius);
    camera.setVerticalFoV(verticalFoV);

    this[$state].renderingParameters.clearColor = [0, 0, 0];

    const luts = {
      lut_ggx_file: '../../../node_modules/gltf-viewer/assets/lut_ggx.png',
      lut_charlie_file:
          '../../../node_modules/gltf-viewer/assets/lut_charlie.png',
      lut_sheen_E_file:
          '../../../node_modules/gltf-viewer/assets/lut_sheen_E.png'
    };

    this[$state].environment =
        await loadEnvironment(scenario.lighting, this[$view], luts);

    // this[$state].renderSkybox = renderSkybox;

    this[$state].renderingParameters.toneMap = ToneMaps.ACES;

    this[$view].renderFrame(this[$state]).then(() => {
      requestAnimationFrame(() => {
        this.dispatchEvent(
            // This notifies the framework that the model is visible and the
            // screenshot can be taken
            new CustomEvent('model-visibility', {detail: {visible: true}}));
      });
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
    this[$view].updateViewport(width, height);

    const aspect = width / height;

    const camera = this[$state].userCamera;
    camera.aspectRatio = aspect;
  }

  private[$degToRadians](degree: number) {
    return Math.PI * (degree / 180);
  }
}
