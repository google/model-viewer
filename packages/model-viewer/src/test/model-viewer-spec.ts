// why do we have to specify the type to be .js? something about mocha?
import {ModelViewerElement} from '../model-viewer.js';
import {Constructor} from '../utilities.js';

import {assetPath, waitForEvent} from './helpers.js';
import {BasicSpecTemplate} from './templates.js';

const expect = chai.expect;

const DEFAULT_SCENARIO = {
  name: 'khronos-Cube',
  model: 'models/glTF-Sample-Models/2.0/Cube/glTF/Cube.gltf',
  lighting: 'environments/lightroom_14b.hdr',
  dimensions: {width: 100, height: 100},
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

  modelViewer.src = assetPath(config.model);

  const lightingPath = assetPath(config.lighting);
  modelViewer.environmentImage = lightingPath;
  modelViewer.skyboxImage = null;

  const {theta, phi, radius} = config.orbit;
  modelViewer.minCameraOrbit = `auto auto ${radius}m`;
  modelViewer.maxCameraOrbit = `auto auto ${radius}m`;
  modelViewer.cameraOrbit = `${theta}deg ${phi}deg ${radius}m`;
  const {x, y, z} = config.target;
  modelViewer.cameraTarget = `${x}m ${y}m ${z}m`;
  modelViewer.fieldOfView = `${config.verticalFoV}deg`;

  await waitForEvent(modelViewer, 'poster-dismissed');
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
    suite('Check all scenarions', () => {
      setup(async () => {
      await setupModelViewer(element, DEFAULT_SCENARIO);
      })

    test('test one scenario first', async () => {
      // capture screenshot;
      const blob = await element.toBlob();

      const image = await new Promise<HTMLImageElement>((resolve) => {
        const image = new Image();
        const url = URL.createObjectURL(blob);
        image.src = url;
        image.onload = () => {
          resolve(image);
        }
      });

      const fiddleCanvas = document.createElement('canvas');
      fiddleCanvas.width = image.width;
      fiddleCanvas.height = image.height;
      fiddleCanvas.getContext('2d')?.drawImage(
          image, 0, 0, image.width, image.height);

      // ayalysis
      expect(fiddleCanvas.width).to.be.equal(image.width);
      expect(fiddleCanvas.height).to.be.equal(image.height);

      let whiteCcount = 0;
      let blackCount = 0;
      let transparentCount = 0;
      for (let row = 0; row < image.height; row++) {
        for (let col = 0; col < image.width; col++) {
          const pixelData =
              fiddleCanvas.getContext('2d')?.getImageData(col, row, 1, 1).data;
          let isWhite = true;
          let isBlack = true;

          if (pixelData![3] === 0)
            transparentCount++;

          for (let i = 0; i < 3; i++) {
            const colorComponent = pixelData![i];
            if (colorComponent != 255) {
              isWhite = false;
            }
            if (colorComponent != 0) {
              isBlack = false;
            }
          }

          if (isWhite) {
            whiteCcount++;
          }

          if (isBlack) {
            blackCount++;
          }
        }
      }

      const imagePixels = image.width * image.height;
      console.log('white pixels rate' + (whiteCcount / imagePixels).toFixed(2));
      console.log('black pixels rate' + (blackCount / imagePixels).toFixed(2));
      console.log(
          'transparent pixel rate' +
          (transparentCount / imagePixels).toFixed(2));
      expect(whiteCcount).to.be.below(imagePixels);
      expect(blackCount).to.be.below(imagePixels);
      expect(transparentCount).to.be.below(imagePixels);
      // download the image
      const link = document.createElement('a');
      link.download = 'golden.png';
      link.href = fiddleCanvas.toDataURL();
      link.click();
    })

      teardown(()=>{
        // clear all setup for model-viewer
      })
    })
                          })
                        })