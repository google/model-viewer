import {ModelViewerElement} from '../model-viewer.js';
import {Constructor} from '../utilities.js';

import {assetPath, waitForEvent} from './helpers.js';
import {BasicSpecTemplate} from './templates.js';

const expect = chai.expect;

const LIGHTROOM_PATH = 'environments/lightroom_14b.hdr';
const SUNRISE_HDR_PATH = 'environments/spruit_sunrise_1k_HDR.hdr';
const SUNRISE_LDR_PATH = 'environments/spruit_sunrise_1k_LDR.jpg';

const setupModelViewer =
    async (modelViewer: ModelViewerElement, lighting: string) => {
  modelViewer.style.width = '100px';
  modelViewer.style.height = '100px';

  modelViewer.style.backgroundColor = 'rgba(255,255,255,0)';

  modelViewer.src = assetPath(
      'models/glTF-Sample-Models/2.0/MetalRoughSpheres/glTF/MetalRoughSpheres.gltf');

  const lightingPath = assetPath(lighting);
  modelViewer.environmentImage = lightingPath;
  modelViewer.skyboxImage = lightingPath;

  modelViewer.minCameraOrbit = 'auto auto 12m';
  modelViewer.maxCameraOrbit = 'auto auto 12m';
  modelViewer.cameraOrbit = '0deg 90deg 12m';
  modelViewer.cameraTarget = '0m 0m 0m';
  modelViewer.fieldOfView = '45deg';

  await waitForEvent(modelViewer, 'poster-dismissed');
};

async function captureScreenshot(blob: Blob): Promise<HTMLCanvasElement> {
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

  return Promise.resolve(fiddleCanvas);
};

// TODO(sun765): this only test whether the screenshot
// is colorless or not. Replace this with more robust
// test in later pr.
function testFidelity(screenshotCanvas: HTMLCanvasElement) {
  let colorlessPixelCount = 0;
  const width = screenshotCanvas.width;
  const height = screenshotCanvas.height;
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const pixelData =
          screenshotCanvas.getContext('2d')?.getImageData(col, row, 1, 1).data;
      let isWhite = true;
      let isBlack = true;

      const alpha = pixelData![3];

      for (let i = 0; i < 3; i++) {
        const colorComponent = pixelData![i] * alpha;
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

  const imagePixelCount = width * height;
  expect(colorlessPixelCount).to.be.below(imagePixelCount);
};

function download(canvas: HTMLCanvasElement) {
  const link = document.createElement('a');
  link.download = 'golden.png';
  link.href = canvas.toDataURL();
  link.click();
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
  });

  BasicSpecTemplate(() => ModelViewer, () => tagName);

  suite('Fidelity Test', () => {
    suite('Metal roughness spheres', () => {
      let element: ModelViewerElement;

      setup(async () => {
        element = new ModelViewerElement();
        document.body.insertBefore(element, document.body.firstChild);
        await setupModelViewer(element, LIGHTROOM_PATH);
      });

      teardown(() => {
        if (element.parentNode != null) {
          element.parentNode.removeChild(element);
        }
      });

      test('Is model-viewer colorless', async () => {
        const blob = await element.toBlob();
        const screenshotCanvas = await captureScreenshot(blob);
        testFidelity(screenshotCanvas);
        download(screenshotCanvas);
      });
    });

    suite('Metal roughness spheres HDR', () => {
      let element: ModelViewerElement;

      setup(async () => {
        element = new ModelViewerElement();
        document.body.insertBefore(element, document.body.firstChild);
        await setupModelViewer(element, SUNRISE_HDR_PATH);
      });

      teardown(() => {
        if (element.parentNode != null) {
          element.parentNode.removeChild(element);
        }
      });

      test('Is model-viewer colorless', async () => {
        const blob = await element.toBlob();
        const screenshotCanvas = await captureScreenshot(blob);
        testFidelity(screenshotCanvas);
        download(screenshotCanvas);
      });
    });

    suite('Metal roughness spheres LDR', () => {
      let element: ModelViewerElement;

      setup(async () => {
        element = new ModelViewerElement();
        document.body.insertBefore(element, document.body.firstChild);
        await setupModelViewer(element, SUNRISE_LDR_PATH);
      });

      teardown(() => {
        if (element.parentNode != null) {
          element.parentNode.removeChild(element);
        }
      });

      test('Model-viewer is not colorless', async () => {
        const blob = await element.toBlob();
        const screenshotCanvas = await captureScreenshot(blob);
        testFidelity(screenshotCanvas);
        download(screenshotCanvas);
      });
    });
  });
})