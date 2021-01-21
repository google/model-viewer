import {/*css,*/ customElement, /*html,*/ LitElement, property} from 'lit-element';
import {ScenarioConfig} from '../../common.js';
import { GltfView, GltfState, computePrimitiveCentroids, ToneMaps, loadGltf, loadEnvironment, /*initKtxLib, initDracoLib*/ } from 'gltf-sample-viewer';


const $updateScenario = Symbol('updateScenario');
const $updateSize = Symbol('updateSize');
const $canvas = Symbol('canvas');
const $view = Symbol('view');
const $state = Symbol('state');


@customElement('gltf-sample-viewer')
export class GltfSampleViewer extends LitElement {
  @property({type: Object}) scenario: ScenarioConfig|null = null;
  private[$canvas]: HTMLCanvasElement|null;
  private[$view]: GltfView;
  private[$state]: GltfState;


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
      this[$view] = new GltfView(this[$canvas]);
      this[$state] = this[$view].createState();
      //initDracoLib();
      //initKtxLib(this[$view]);
    }
    this[$updateSize]();
        
    this[$state].gltf = await loadGltf(scenario.model);

    const defaultScene = this[$state].gltf.scene;
    this[$state].sceneIndex = defaultScene === undefined ? 0 : defaultScene;
    const scene = this[$state].gltf.scenes[this[$state].sceneIndex];
    scene.applyTransformHierarchy(this[$state].gltf);
    computePrimitiveCentroids(this[$state].gltf);
    this[$state].userCamera.fitViewToScene(this[$state].gltf, this[$state].sceneIndex);
    this[$state].userCamera.updatePosition();

    this[$state].renderingParameters.clearColor = [0, 0, 0];

    //Setup camera
    //this[$state].activeCamera = new UserCamera(
    //    'Camera',
    //    alpha,
    //    beta,
    //    orbit.radius,
    //    verticalFoV,
    //    target);

  
    this[$state].environment = await loadEnvironment(scenario.lighting);

    //this[$state].renderSkybox = renderSkybox;
    
    this[$state].renderingParameters.toneMap = ToneMaps.None;      
    
    this[$view].renderFrame([$state]).then(() => {
      requestAnimationFrame(() => {
        this.dispatchEvent(
            //This notifies the framework that the model is visible and the screenshot can be taken
            new CustomEvent('model-visibility', {detail: {visible: true}}));
      });
    });
  }


  private[$updateSize]() {
    if (this[$canvas] == null || this.scenario == null) {
      return;
    }

    const canvas = this[$canvas]!;
    const {dimensions, target, orbit, verticalFoV} = this.scenario;

    const dpr = window.devicePixelRatio;
    const width = dimensions.width * dpr;
    const height = dimensions.height * dpr;

    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${dimensions.width}px`;
    canvas.style.height = `${dimensions.height}px`;
    this[$view].updateViewport(width, height);

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

    const camera = this[$state].userCamera;
    camera.fitViewToScene(this[$state].gltf, this[$state].sceneIndex);
    //TODO
    camera.setProjectionFov(verticalFoV, aspect, near, far);
    const up = [0, 1, 0];
    camera.lookAt(eye, center, up);
    camera.setExposureDirect(1.0);

  }
}
