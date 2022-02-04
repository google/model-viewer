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

import {colorDelta} from './third_party/pixelmatch/color-delta.js';

export interface OffscreenCanvas extends HTMLCanvasElement {}

export const COMPONENTS_PER_PIXEL: number = 4;

// 35215 is the maximum possible value for the YIQ difference metric
// @see https://github.com/mapbox/pixelmatch/blob/master/index.js#L14
// @see http://www.progmat.uaem.mx:8080/artVol2Num2/Articulo3Vol2Num2.pdf
export const MAX_COLOR_DISTANCE: number = 35215;

export const DEVICE_PIXEL_RATIO: number = 2;

// use this threshold to do automatic fidelity test for model-viewer. any
// scenario whose rms value (in dB) is bigger than the threshold will fail.
export const FIDELITY_TEST_THRESHOLD: number = -22;

export interface FidelityRegressionResults {
  results: Array<ImageComparisonAnalysis>;
  warnings: Array<string>;
  errors: Array<string>;
}

export interface ImageComparisonAnalysis {
  rmsDistanceRatio: number;
}

export interface ImageComparisonResults {
  analysis: ImageComparisonAnalysis
}

export interface Visuals {
  imageBuffers: {delta: ArrayBuffer|null; blackWhite: ArrayBuffer | null;};
}

export interface ScenarioRecord {
  analysisResults: Array<ImageComparisonAnalysis>;
  scenarioConfig: ScenarioConfig;
}

export interface ImageComparisonMessage {
  type: 'canvases-ready'|'images-assigned'|'threshold-changed'|
      'analysis-completed';
}

export interface CanvasesReadyMessage extends ImageComparisonMessage {
  candidateCanvas: OffscreenCanvas;
  goldenCanvas: OffscreenCanvas;
  blackWhiteCanvas: OffscreenCanvas;
  deltaCanvas: OffscreenCanvas;
}

export interface ImagesAssignedMessage extends ImageComparisonMessage {
  candidateImageBuffer: ArrayBuffer;
  goldenImageBuffer: ArrayBuffer;
  dimensions: Dimensions;
}

export interface ThresholdChangedMessage extends ImageComparisonMessage {
  threshold: number;
}

export interface AnalysisCompletedMessage extends ImageComparisonMessage {
  result: Visuals
}

export interface Dimensions {
  width: number;
  height: number;
}

export interface Pixel {
  x: number;
  y: number;
}

export interface Rect extends Dimensions {
  x: number;
  y: number;
}


export interface ScenarioConfig {
  name: string;
  model: string;
  lighting: string;
  dimensions: Dimensions;
  target: {x: number, y: number, z: number};
  orbit: {theta: number, phi: number, radius: number};
  verticalFoV: number;
  exclude?: Array<string>;
  renderSkybox: boolean;
  pt?: {numSamples?: number};
}

export interface RendererConfig {
  name: string, 
  description: string, 
  scripts?: {setup: string}, 
  command?: {
    executable?: string, 
    args?: string[]
  }
}

export interface GoldenConfig extends RendererConfig {
  file: string;
}

export interface ImageComparisonConfig {
  rootDirectory: string;
  analysisThresholds: Array<number>;
  renderers: Array<RendererConfig>;
  scenarios: Array<ScenarioConfig>;
}

export interface AnalysisOptions {
  generateVisuals: boolean;
}

export class ImageComparator {
  protected imagePixels: number;

  constructor(
      protected candidateImage: Uint8ClampedArray,
      protected goldenImage: Uint8ClampedArray,
      readonly dimensions: Dimensions) {
    const {width, height} = dimensions;

    this.imagePixels = width * height;
  }

  protected drawPixel(
      image: Uint8ClampedArray, position: number, r: number, g: number,
      b: number, a: number = 255) {
    image[position + 0] = r;
    image[position + 1] = g;
    image[position + 2] = b;
    image[position + 3] = a;
  }

  generateVisuals(threshold: number): Visuals {
    const {candidateImage, goldenImage} = this;
    const {width, height} = this.dimensions;

    const blackWhiteImage =
        new Uint8ClampedArray(this.imagePixels * COMPONENTS_PER_PIXEL);
    const deltaImage =
        new Uint8ClampedArray(this.imagePixels * COMPONENTS_PER_PIXEL);

    const thresholdSquared = threshold * threshold;

    let maximumDeltaIntensity = 0;

    if (candidateImage.length != goldenImage.length) {
      throw new Error(`Image sizes do not match (candidate: ${
          candidateImage.length}, golden: ${goldenImage.length})`);
    }

    for (let y = 0; y < height; ++y) {
      for (let x = 0; x < width; ++x) {
        const index = y * width + x;
        const position = index * COMPONENTS_PER_PIXEL;
        const delta =
            colorDelta(candidateImage, goldenImage, position, position);
        const exactlyMatched = (delta <= thresholdSquared ? 1 : 0) * 255;

        const thresholdDelta = Math.max(0, delta - thresholdSquared);

        const deltaIntensity =
            Math.round(255 * thresholdDelta / MAX_COLOR_DISTANCE);

        maximumDeltaIntensity = Math.max(deltaIntensity, maximumDeltaIntensity);

        this.drawPixel(
            blackWhiteImage,
            position,
            exactlyMatched,
            exactlyMatched,
            exactlyMatched);
        this.drawPixel(
            deltaImage,
            position,
            255,
            255 - deltaIntensity,
            255 - deltaIntensity);
      }
    }

    for (let y = 0; y < height; ++y) {
      for (let x = 0; x < width; ++x) {
        const index = y * width + x;
        const position = index * COMPONENTS_PER_PIXEL;
        const absoluteDeltaIntensity = 255 - deltaImage![position + 1];
        const relativeDeltaIntensity = Math.round(
            255 - 255 * (absoluteDeltaIntensity / maximumDeltaIntensity));

        this.drawPixel(
            deltaImage,
            position,
            255,
            relativeDeltaIntensity,
            relativeDeltaIntensity);
      }
    }

    return {
      imageBuffers:
          {delta: deltaImage.buffer, blackWhite: blackWhiteImage.buffer}
    };
  }

  analyze(): ImageComparisonResults {
    const {candidateImage, goldenImage} = this;
    const {width, height} = this.dimensions;

    let squareSum = 0;

    if (candidateImage.length != goldenImage.length) {
      throw new Error(`Image sizes do not match (candidate: ${
          candidateImage.length}, golden: ${goldenImage.length})`);
    }

    let modelPixelCount = 0;
    let colorlessPixelCount = 0;

    for (let y = 0; y < height; ++y) {
      for (let x = 0; x < width; ++x) {
        const index = y * width + x;
        // image's pixel data is stored in an 1-D array, 1st row sequentialy,
        // then 2nd row, .. for each pixel, its data is stored by order of r, g,
        // b, a.  here position is the index for current pixel's r , position+3
        // is index for its alpha
        const position = index * COMPONENTS_PER_PIXEL;
        // alpha is in range 0~255 here, map it to 0~1
        const alpha = candidateImage[position + 3] / 255;

        let isWhitePixel = true;
        let isBlackPixel = true;
        for (let i = 0; i < 3; i++) {
          const colorComponent = candidateImage[position + i] * alpha;
          if (colorComponent != 255) {
            isWhitePixel = false;
          }
          if (colorComponent != 0) {
            isBlackPixel = false;
          }
        }

        if (isBlackPixel || isWhitePixel) {
          colorlessPixelCount++;
        }

        if (alpha === 0) {
          continue;
        }

        const delta =
            colorDelta(candidateImage, goldenImage, position, position);

        squareSum += delta * delta;
        modelPixelCount++;
      }
    }

    const imagePixelCount = width * height;

    if (colorlessPixelCount === imagePixelCount) {
      throw new Error('Candidate image is colorless!');
    }

    const rmsDistanceRatio =
        Math.sqrt(squareSum / modelPixelCount) / MAX_COLOR_DISTANCE;
    return {analysis: {rmsDistanceRatio}};
  }
}

export function toDecibel(value: number): number {
  return 10 * Math.log10(value);
}