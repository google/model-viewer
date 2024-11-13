import {expect} from 'chai';

import {$renderer} from '../model-viewer-base.js';
import {ModelViewerElement} from '../model-viewer.js';
import {Constructor, waitForEvent} from '../utilities.js';

import {assetPath, rafPasses} from './helpers.js';
import {BasicSpecTemplate} from './templates.js';

const SUNRISE_HDR_PATH = 'environments/spruit_sunrise_1k_HDR.hdr';
const SUNRISE_LDR_PATH = 'environments/spruit_sunrise_1k_LDR.jpg';

const COMPONENTS_PER_PIXEL = 4;

const setupLighting =
    async (modelViewer: ModelViewerElement, lighting?: string) => {
  const posterDismissed = waitForEvent(modelViewer, 'poster-dismissed');

  if (lighting) {
    const lightingPath = assetPath(lighting);
    modelViewer.environmentImage = lightingPath;
  }
  modelViewer.src = assetPath('models/reflective-sphere.gltf');

  await posterDismissed;
  await rafPasses();
}

// TODO(sun765): this only test whether the screenshot
// is colorless or not. Replace this with more robust
// test in later pr.
function testFidelity(screenshotContext: WebGLRenderingContext|
                      WebGL2RenderingContext) {
  const width = screenshotContext.drawingBufferWidth;
  const height = screenshotContext.drawingBufferHeight;

  const pixels = new Uint8Array(width * height * COMPONENTS_PER_PIXEL);
  // this function reads in the bottom-up direction from the coordinate
  // specified ((0,0) is the bottom-left corner).
  screenshotContext.readPixels(
      0,
      0,
      width,
      height,
      screenshotContext.RGBA,
      screenshotContext.UNSIGNED_BYTE,
      pixels);

  let transparentPixels = 0;
  let whitePixels = 0;
  let blackPixels = 0;
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      let isWhite = true;
      let isBlack = true;

      // read pixel data from top left corner
      const index = (height - row - 1) * width + col;
      const position = index * COMPONENTS_PER_PIXEL;

      if (pixels[position + 3] != 255) {
        transparentPixels++;
        continue;
      }
      for (let i = 0; i < 3; i++) {
        const colorComponent = pixels[position + i];
        if (colorComponent != 255) {
          isWhite = false;
        }
        if (colorComponent != 0) {
          isBlack = false;
        }
      }

      if (isWhite) {
        whitePixels++;
      }
      if (isBlack) {
        blackPixels++;
      }
    }
  }

  const imagePixelCount = width * height;
  expect(whitePixels + blackPixels + transparentPixels)
      .to.be.below(
          imagePixelCount,
          `Image had ${whitePixels} white pixels and ${
              blackPixels} black pixels and ${
              transparentPixels} background pixels.`);
};

suite('ModelViewerElement', () => {
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

  suite('Render Functionality Test', () => {
    let element: ModelViewerElement;

    setup(async () => {
      element = new ModelViewerElement();
      element.style.width = '100px';
      element.style.height = '100px';
      document.body.insertBefore(element, document.body.firstChild);
    });

    teardown(() => {
      if (element.parentNode != null) {
        element.parentNode.removeChild(element);
      }
    });

    test('Metal roughness sphere with generated lighting', async () => {
      await setupLighting(element);
      const screenshotContext = element[$renderer].threeRenderer.getContext();
      testFidelity(screenshotContext);
    });

    test('Metal roughness sphere with HDR lighting', async () => {
      await setupLighting(element, SUNRISE_HDR_PATH);
      const screenshotContext = element[$renderer].threeRenderer.getContext();
      testFidelity(screenshotContext);
    });

    test('Metal roughness sphere with LDR lighting', async () => {
      await setupLighting(element, SUNRISE_LDR_PATH);
      const screenshotContext = element[$renderer].threeRenderer.getContext();
      testFidelity(screenshotContext);
    });
  });
})