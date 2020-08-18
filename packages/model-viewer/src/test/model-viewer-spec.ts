import {ModelViewerElement} from '../model-viewer';
import {Constructor} from '../utilities';

import {BasicSpecTemplate} from './templates';


// const expect = chai.expect;


const DEFAULT_SCENARIO = {
  name: 'khronos-Cube',
  model:
      '../../../shared-assets/models/glTF-Sample-Models/2.0/Cube/glTF/Cube.gltf',
  lighting: '../../../shared-assets/environments/lightroom_14b.hdr',
  dimensions: {width: 768, height: 768},
  target: {x: 0, y: 0, z: 0},
  orbit: {theta: 30, phi: 60, radius: 5},
  verticalFoV: 45
}

const setupModelViewer =
    async (
        modelViewer: ModelViewerElement,
        config: any) => {
  modelViewer.style.width = `${config.dimensions.width}px`;
  modelViewer.style.height = `${config.dimensions.height}px`;

  modelViewer.style.backgroundColor = 'rgba(255,255,255,0)';

  modelViewer.src = config.model;

  modelViewer.environmentImage = config.lighting;
  modelViewer.skyboxImage = config.lighting;

  const {theta, phi, radius} = config.orbit;
  modelViewer.minCameraOrbit = `auto auto ${radius}m`;
  modelViewer.maxCameraOrbit = `auto auto ${radius}m`;
  modelViewer.cameraOrbit = `${theta}deg ${phi}deg ${radius}m`;
  const {x, y, z} = config.target;
  modelViewer.cameraTarget = `${x}m ${y}m ${z}m`;
  modelViewer.fieldOfView = `${config.verticalFoV}deg`;
}


                        suite.only('ModelViewerElement', () => {
                          // global variable
                          let nextId: number = 0;
                          let tagName: string;
                          let ModelViewer: Constructor<ModelViewerElement>;

                          setup(() => {
                            tagName = `model-viewer-${nextId++}`;
                            ModelViewer = class extends ModelViewerElement {
                              static get is() {
                                return tagName;
                              }
                            }
                            // not sure what does this do
                            customElements.define(tagName, ModelViewer);
                          })

                          BasicSpecTemplate(() => ModelViewer, () => tagName);

                          suite('Fidelity Test', () => {
                            let element: ModelViewerElement;

                            setup(() => {
                              element = new ModelViewerElement();
                              document.body.insertBefore(
                                  element, document.body.firstChild);
                              // read config here
                            })

                            teardown(() => {
                              // clear whatever in the setup file
                              if (element.parentNode != null) {
                                element.parentNode.removeChild(element);
                              }
                            })

                            // TODO: change this to test all scenarios
        suite('Check all scenarions', ()=>{
            setup(async ()=>{
      await setupModelViewer(element, DEFAULT_SCENARIO);
            })

            test('test one scenario first', async ()=>{
      // capture screenshot;
      const blob = await element.toBlob();
      const image = new Promise(
          (resolve) => {

          })
      // ayalysis
            })
        })
                          })
                        })