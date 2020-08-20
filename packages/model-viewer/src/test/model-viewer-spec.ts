// why do we have to specify the type to be .js? something about mocha?
import {ModelViewerElement} from '../model-viewer.js';
import {Constructor} from '../utilities.js';
import {assetPath, waitForEvent} from './helpers.js';
import {BasicSpecTemplate} from './templates.js';

const expect = chai.expect;

interface scenarioConfig {
  name: string, model: string, lighting: string,
      dimensions: {width: number, height: number},
      target: {x: number, y: number, z: number},
      orbit: {theta: number, phi: number, radius: number}, verticalFoV: number,
      renderSkybox: boolean
}

interface FidelityResult {
  colorlessPixelCount: number;
  transparentPixelCount: number;
}

const SCENARIOS: Array<scenarioConfig> =
    [
      {
        name: 'khronos-MetalRoughSpheres',
        model:
            'models/glTF-Sample-Models/2.0/MetalRoughSpheres/glTF/MetalRoughSpheres.gltf',
        lighting: 'environments/lightroom_14b.hdr',
        dimensions: {width: 100, height: 100},
        target: {x: 0, y: 0, z: 0},
        orbit: {theta: 0, phi: 90, radius: 12},
        verticalFoV: 45,
        renderSkybox: true
      },
      {
        name: 'khronos-MetalRoughSpheres-HDR',
        model:
            'models/glTF-Sample-Models/2.0/MetalRoughSpheres/glTF/MetalRoughSpheres.gltf',
        lighting: 'environments/spruit_sunrise_1k_HDR.hdr',
        dimensions: {width: 100, height: 100},
        target: {x: 0, y: 0, z: 0},
        orbit: {theta: 0, phi: 90, radius: 12},
        verticalFoV: 45,
        renderSkybox: true
      },
      {
        name: 'khronos-MetalRoughSpheres-LDR',
        model:
            'models/glTF-Sample-Models/2.0/MetalRoughSpheres/glTF/MetalRoughSpheres.gltf',
        lighting: 'environments/spruit_sunrise_1k_LDR.jpg',
        dimensions: {width: 100, height: 100},
        target: {x: 0, y: 0, z: 0},
        orbit: {theta: 0, phi: 90, radius: 12},
        verticalFoV: 45,
        renderSkybox: true
      }
    ]

    const setupModelViewer =
        async (
            modelViewer: ModelViewerElement,
            config:
                any) => {
      modelViewer.style.width = `${config.dimensions.width}px`;
      modelViewer.style.height = `${config.dimensions.height}px`;

      modelViewer.style.backgroundColor = 'rgba(255,255,255,0)';

      const {model, lighting, orbit, renderSkybox} = config;
      modelViewer.src = assetPath(model);

      const lightingPath = assetPath(lighting);
      modelViewer.environmentImage = lightingPath;
      modelViewer.skyboxImage = renderSkybox ? lightingPath : null;

      const {theta, phi, radius} = orbit;
      modelViewer.minCameraOrbit = `auto auto ${radius}m`;
      modelViewer.maxCameraOrbit = `auto auto ${radius}m`;
      modelViewer.cameraOrbit = `${theta}deg ${phi}deg ${radius}m`;
      const {x, y, z} = config.target;
      modelViewer.cameraTarget = `${x}m ${y}m ${z}m`;
      modelViewer.fieldOfView = `${config.verticalFoV}deg`;

      await waitForEvent(modelViewer, 'poster-dismissed');
    }

                        async function captureScreenshot(blob: Blob):
                            Promise<HTMLCanvasElement> {
                              const image = await new Promise<HTMLImageElement>(
                                  (resolve) => {
                                    const image = new Image();
                                    const url = URL.createObjectURL(blob);
                                    image.src = url;
                                    image.onload = () => {
                                      resolve(image);
                                    }
                                  })

                              const fiddleCanvas =
                                  document.createElement('canvas');
                              fiddleCanvas.width = image.width;
                              fiddleCanvas.height = image.height;
                              fiddleCanvas.getContext('2d')?.drawImage(
                                  image, 0, 0, image.width, image.height);

                              return Promise.resolve(fiddleCanvas);
                            }

                        // TODO(sun765): this only test whether the screenshot
                        // is colorless or not. Replace this with more robust
                        // test later.
                        function testFidelity(
                            screenshotCanvas: HTMLCanvasElement):
                            FidelityResult {
                              let colorlessPixelCount = 0;
                              let transparentPixelCount = 0;
                              for (let row = 0; row < screenshotCanvas.height;
                                   row++) {
                                for (let col = 0; col < screenshotCanvas.width;
                                     col++) {
                                  const pixelData =
                                      screenshotCanvas.getContext('2d')
                                          ?.getImageData(col, row, 1, 1)
                                          .data;
                                  let isWhite = true;
                                  let isBlack = true;

                                  if (pixelData![3] === 0)
                                    transparentPixelCount++;

                                  for (let i = 0; i < 3; i++) {
                                    const colorComponent = pixelData![i];
                                    if (colorComponent != 255) {
                                      isWhite = false;
                                    }
                                    if (colorComponent != 0) {
                                      isBlack = false;
                                    }
                                  }

                                  if (isWhite || isBlack) {
                                    colorlessPixelCount++;
                                  }
                                }
                              }

                              return {
                                colorlessPixelCount,
                                transparentPixelCount
                              };
                            }

                        suite.only('ModelViewerElement', () => {
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
                            customElements.define(tagName, ModelViewer);
                          })

                          BasicSpecTemplate(() => ModelViewer, () => tagName);

                          suite('Fidelity Test', () => {
                            SCENARIOS.forEach((scenario) => {
                              suite(`test ${scenario.name}`, () => {
                                let element: ModelViewerElement;

                                setup(async () => {
                                  element = new ModelViewerElement();
                                  document.body.insertBefore(
                                      element, document.body.firstChild);
                                  await setupModelViewer(element, scenario);
                                });

                                teardown(() => {
                                  if (element.parentNode != null) {
                                    element.parentNode.removeChild(element);
                                  }
                                });

                                test(scenario.name, async () => {
                                  const blob = await element.toBlob();
                                  const screenshotCanvas =
                                      await captureScreenshot(blob);
                                  const result = testFidelity(screenshotCanvas);
                                  const {
                                    transparentPixelCount,
                                    colorlessPixelCount
                                  } = result;
                                  const imagePixelCount =
                                      screenshotCanvas.width *
                                      screenshotCanvas.height;

                                  expect(transparentPixelCount)
                                      .to.be.below(imagePixelCount);
                                  expect(colorlessPixelCount)
                                      .to.be.below(imagePixelCount);
                                });
                              });
                            });
                          });
                        })