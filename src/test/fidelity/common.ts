/*
 * Copyright 2018 Google Inc. All Rights Reserved.
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

import {colorDelta} from '../../third_party/pixelmatch/color-delta.js';

export interface OffscreenCanvas extends HTMLCanvasElement {}

export const COMPONENTS_PER_PIXEL: number = 4;

// 35215 is the maximum possible value for the YIQ difference metric
// @see https://github.com/mapbox/pixelmatch/blob/master/index.js#L14
// @see http://www.progmat.uaem.mx:8080/artVol2Num2/Articulo3Vol2Num2.pdf
export const MAX_COLOR_DISTANCE: number = 35215;

export interface ImageComparisonAnalysis {
  matchingRatio: number;
  averageDistanceRatio: number;
  mismatchingAverageDistanceRatio: number;
}

export interface ImageComparisonResults {
  analysis: ImageComparisonAnalysis;
  imageBuffers: {delta: ArrayBuffer|null; blackWhite: ArrayBuffer | null;};
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
  result: ImageComparisonResults
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

export interface GoldenConfig {
  name: string;
  file: string;
}

export interface ScenarioConfig {
  slug: string;
  goldens: Array<GoldenConfig>;
  dimensions: Dimensions;
}

export interface ImageComparisonConfig {
  outputDirectory: string;
  scenarioDirectory: string;
  analysisThresholds: Array<number>;
  scenarios: Array<ScenarioConfig>;
}

export interface ComparableImage {
  [index: number]: number;
  length: number;
}

export interface AnalysisOptions {
  generateVisuals: boolean;
}

export class ImageComparator {
  protected imagePixels: number;

  constructor(
      protected candidateImage: ComparableImage,
      protected goldenImage: ComparableImage, readonly dimensions: Dimensions) {
    const {width, height} = dimensions;

    this.imagePixels = width * height;
  }

  protected drawPixel(
      image: ComparableImage, position: number, r: number, g: number, b: number,
      a: number = 255) {
    image[position + 0] = r;
    image[position + 1] = g;
    image[position + 2] = b;
    image[position + 3] = a;
  }

  analyze(threshold: number, options: AnalysisOptions = {
    generateVisuals: true
  }): ImageComparisonResults {
    const {candidateImage, goldenImage} = this;
    const {width, height} = this.dimensions;
    const {generateVisuals} = options;

    const blackWhiteImage = generateVisuals ?
        new Uint8ClampedArray(this.imagePixels * COMPONENTS_PER_PIXEL) :
        null;
    const deltaImage = generateVisuals ?
        new Uint8ClampedArray(this.imagePixels * COMPONENTS_PER_PIXEL) :
        null;

    const thresholdSquared = threshold * threshold;

    let matched = 0;
    let sum = 0;
    let mismatchingSum = 0;
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
        const exactlyMatched = (delta < thresholdSquared ? 1 : 0) * 255;

        if (exactlyMatched) {
          matched++;
        } else {
          mismatchingSum += delta;
        }

        const thresholdDelta = Math.max(0, delta - thresholdSquared);

        sum += thresholdDelta;

        if (generateVisuals) {
          const deltaIntensity =
              Math.round(255 * thresholdDelta / MAX_COLOR_DISTANCE);

          maximumDeltaIntensity =
              Math.max(deltaIntensity, maximumDeltaIntensity);

          this.drawPixel(
              blackWhiteImage!,
              position,
              exactlyMatched,
              exactlyMatched,
              exactlyMatched);
          this.drawPixel(
              deltaImage!,
              position,
              255,
              255 - deltaIntensity,
              255 - deltaIntensity);
        }
      }
    }

    if (generateVisuals) {
      for (let y = 0; y < height; ++y) {
        for (let x = 0; x < width; ++x) {
          const index = y * width + x;
          const position = index * COMPONENTS_PER_PIXEL;
          const absoluteDeltaIntensity = 255 - deltaImage![position + 1];
          const relativeDeltaIntensity = Math.round(
              255 - 255 * (absoluteDeltaIntensity / maximumDeltaIntensity));

          this.drawPixel(
              deltaImage!,
              position,
              255,
              relativeDeltaIntensity,
              relativeDeltaIntensity);
        }
      }
    }

    const mismatchingPixels = this.imagePixels - matched;

    const mismatchingAverageDistanceRatio = mismatchingPixels > 0 ?
        mismatchingSum / (this.imagePixels - matched) / MAX_COLOR_DISTANCE :
        0;
    const averageDistanceRatio = sum / this.imagePixels / MAX_COLOR_DISTANCE;

    return {
      analysis: {
        matchingRatio: matched / this.imagePixels,
        averageDistanceRatio,
        mismatchingAverageDistanceRatio,
      },
      imageBuffers: {
        delta: deltaImage ? deltaImage.buffer as ArrayBuffer : null,
        blackWhite: blackWhiteImage ? blackWhiteImage.buffer as ArrayBuffer :
                                      null
      }
    };
  }
}
