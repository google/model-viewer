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

import {promises as fs} from 'fs';
import mkdirp from 'mkdirp';
import {join, resolve} from 'path';
import pngjs from 'pngjs';
import puppeteer from 'puppeteer';

import {DEVICE_PIXEL_RATIO, Dimensions, FIDELITY_TEST_THRESHOLD, FidelityRegressionResults, GoldenConfig, ImageComparator, ImageComparisonAnalysis, ImageComparisonConfig, ScenarioConfig, toDecibel} from './common.js';
import {ConfigReader} from './config-reader.js';

const $configReader = Symbol('configReader');

export type AnalysisResults = Array<ImageComparisonAnalysis>;

export interface ScenarioRecord extends ScenarioConfig {
  analysisResults: AnalysisResults;
}

export class ArtifactCreator {
  private[$configReader]: ConfigReader = new ConfigReader(this.config);

  constructor(
      protected config: ImageComparisonConfig, protected rootDirectory: string,
      protected baseUrl: string) {
    console.log('🌈 Preparing to capture screenshots for fidelity comparison');
  }

  protected get outputDirectory(): string {
    return join(resolve(this.rootDirectory), 'results');
  }

  protected get goldens(): Array<GoldenConfig> {
    return this.config.renderers.map(
        renderer => ({...renderer, file: `${renderer.name}-golden.png`}));
  }

  async compareRenderers(scenario: ScenarioConfig) {
    const analysisResults: AnalysisResults = [];
    const {rootDirectory, outputDirectory, goldens} = this;
    const {name: scenarioName, exclude, dimensions} = scenario;

    console.log(
        `Start to compare model-viewer's golden with other renderers' goldens:`);

    const modelViewerIndex = 0;
    const modelViewerGoldenPath = join(
        rootDirectory, 'goldens', scenarioName, goldens[modelViewerIndex].file);
    let modelViewerGolden;
    try {
      modelViewerGolden = await fs.readFile(modelViewerGoldenPath);
    } catch (error) {
      throw new Error(`❌ Failed to read model-viewer's ${
          scenarioName} golden! Error message: ${error.message}`);
    }

    // save goldens images to result folder which will be used to show in the
    // result-viewer page.
    await fs.writeFile(
        join(outputDirectory, scenarioName, goldens[modelViewerIndex].file),
        modelViewerGolden);

    const modelViewerGoldenImage =
        new Uint8ClampedArray(pngjs.PNG.sync.read(modelViewerGolden).data);

    for (const golden of goldens) {
      if (golden.name === 'model-viewer' ||
          (exclude != null && exclude.includes(golden.name))) {
        continue;
      }

      console.log(`\n🔍 Comparing <model-viewer> to ${golden.description}`);

      const candidateGoldenPath =
          join(rootDirectory, 'goldens', scenarioName, golden.file);
      let candidateGolden;
      try {
        candidateGolden = await fs.readFile(candidateGoldenPath);
      } catch (error) {
        throw new Error(`❌ Failed to read ${golden.name}'s ${
            scenarioName} golden! Error message: ${error.message}`);
      }

      // save goldens images to result folder which will be used to show in the
      // result-viewer page.
      await fs.writeFile(
          join(outputDirectory, scenarioName, golden.file), candidateGolden);

      const candidateGoldenImage =
          new Uint8ClampedArray(pngjs.PNG.sync.read(candidateGolden).data);
      const analysisResult = await this.analyze(
          modelViewerGoldenImage, candidateGoldenImage, dimensions);
      analysisResults.push(analysisResult);
    }
    const scenarioRecord = {analysisResults, scenario};

    console.log(`\n💾 Recording analysis`);
    await fs.writeFile(
        join(outputDirectory, scenarioName, 'analysis.json'),
        JSON.stringify(scenarioRecord));
  }

  async captureAndAnalyzeScreenshot(scenario: ScenarioConfig):
      Promise<ImageComparisonAnalysis> {
    const {rootDirectory, goldens} = this;
    const {name: scenarioName, dimensions, exclude} = scenario;

    console.log(
        `start compare model-viewer's golden with model-viewer's screenshot generated from fidelity test:`);

    let screenshot;
    try {
      // set the output path to an empty string to tell puppeteer to not save
      // the screenshot image
      screenshot = await this.captureScreenshot(
          'model-viewer', scenarioName, dimensions, '', 60);
    } catch (error) {
      throw new Error(`❌ Failed to capture model-viewer's screenshot of ${
          scenarioName}. Error message: ${error.message}`);
    }

    if (screenshot == null) {
      throw new Error(`❌ Model-viewer's screenshot of ${
          scenarioName} is not captured correctly (value is null).`);
    }
    const screenshotImage =
        new Uint8ClampedArray(pngjs.PNG.sync.read(screenshot as Buffer).data);

    const modelViewerIndex = 0;
    const modelViewerGoldenPath = join(
        rootDirectory, 'goldens', scenarioName, goldens[modelViewerIndex].file);
    let modelViewerGolden;
    try {
      modelViewerGolden = await fs.readFile(modelViewerGoldenPath);
    } catch (error) {
      throw new Error(`❌ Failed to read model-viewer's ${
          scenarioName} golden! Error message: ${error.message}`);
    }
    const modelViewerGoldenImage =
        new Uint8ClampedArray(pngjs.PNG.sync.read(modelViewerGolden).data);

    const result =
        await this.analyze(screenshotImage, modelViewerGoldenImage, dimensions);

    const rmsInDb = toDecibel(result.rmsDistanceRatio);

    // the rmsInDb is negative, and the less negative means the less closer the
    // two images are
    if (rmsInDb > FIDELITY_TEST_THRESHOLD) {
      if (exclude?.includes('model-viewer')) {
        console.log(`❌ Skipped! Senario name: ${
            scenario.name}, rms distance ratio: ${rmsInDb.toFixed(2)} dB.`);
      } else {
        throw new Error(`❌ Senarios name: ${
            scenario.name}, rms distance ratio: ${rmsInDb.toFixed(2)} dB.`);
      }
    }

    return result;
  }

  async fidelityTest(scenarioWhitelist: Set<string>|null = null) {
    const {scenarios} = this.config;
    const {outputDirectory} = this;
    const analyzedScenarios: Array<ScenarioConfig> = [];
    const fidelityRegressionResults:
        FidelityRegressionResults = {results: [], errors: [], warnings: []};

    const compareRenderersErrors: Array<string> = [];

    for (const scenarioBase of scenarios) {
      const scenarioName = scenarioBase.name;
      const scenario = this[$configReader].scenarioConfig(scenarioName)!;

      if (scenarioWhitelist != null && !scenarioWhitelist.has(scenarioName)) {
        continue;
      }

      console.log(`\n🎨 Scenario: ${scenarioName}`);

      const scenarioOutputDirectory = join(outputDirectory, scenarioName);
      mkdirp.sync(scenarioOutputDirectory);

      try {
        await this.compareRenderers(scenario);
      } catch (error) {
        const errorMessage =
            `❌Fail to compare model-viewer with other renderers of scenario ${
                scenarioName}. Error message: ${error.message}`;
        compareRenderersErrors.push(errorMessage);
      }

      try {
        const autoTestResult = await this.captureAndAnalyzeScreenshot(scenario);
        fidelityRegressionResults.results.push(autoTestResult);
      } catch (error) {
        const message = `❌Fail to analyze scenario :${
            scenarioName}! Error message: ${error.message}`;

        fidelityRegressionResults.errors.push(message);
      }

      analyzedScenarios.push(scenario);
    }

    console.log('💾 Recording configuration');

    const finalConfig: ImageComparisonConfig = Object.assign(
        {},
        this.config,
        {scenarios: analyzedScenarios, errors: compareRenderersErrors});

    await fs.writeFile(
        join(outputDirectory, 'config.json'), JSON.stringify(finalConfig));

    await fs.writeFile(
        join(outputDirectory, 'fidelityRegressionResults.json'),
        JSON.stringify(fidelityRegressionResults));
  }

  protected async analyze(
      candidateImage: Uint8ClampedArray, goldenImage: Uint8ClampedArray,
      dimensions: Dimensions): Promise<ImageComparisonAnalysis> {
    const imageDimensions = {
      width: dimensions.width * DEVICE_PIXEL_RATIO,
      height: dimensions.height * DEVICE_PIXEL_RATIO
    };
    const comparator =
        new ImageComparator(candidateImage, goldenImage, imageDimensions);

    const {analysis} = comparator.analyze();
    const {rmsDistanceRatio} = analysis;
    console.log(`\n  📊 Decibels of root mean square color distance: ${
        (10 * Math.log10(rmsDistanceRatio)).toFixed(2)}`);

    return analysis;
  }

  async captureScreenshot(
      renderer: string, scenarioName: string, dimensions: Dimensions,
      outputPath: string = join(this.outputDirectory, 'model-viewer.png'),
      maxTimeInSec: number = -1) {
    const scaledWidth = dimensions.width;
    const scaledHeight = dimensions.height;
    const rendererConfig = this[$configReader].rendererConfig(renderer);

    if (rendererConfig == null) {
      console.log(`⚠️ Renderer "${
          renderer}" is not configured. Did you add it to the test config?`);
      return;
    }

    console.log(`🚀 Launching browser`);

    const browser = await puppeteer.launch({
      defaultViewport: {
        width: scaledWidth,
        height: scaledHeight,
        deviceScaleFactor: DEVICE_PIXEL_RATIO
      },
      headless: false
    });

    const page = await browser.newPage();
    const url = `${this.baseUrl}?hide-ui&config=../../config.json&scenario=${
        encodeURIComponent(scenarioName)}`;

    page.on('error', (error: any) => {
      console.log(`🚨 ${error}`);
    });

    page.on('console', async (message: any) => {
      const args =
          await Promise.all(message.args().map((arg: any) => arg.jsonValue()));

      if (args.length) {
        console.log(`➡️`, ...args);
      }
    });

    console.log(`🗺  Navigating to ${url}`);

    await page.goto(url);

    console.log(
        `🖌  Rendering ${scenarioName} with ${rendererConfig.description}`);

    // NOTE: The function passed to page.evaluate is stringified and eval'd
    // in a browser context. Importantly, this implies that no external
    // variables are captured in its closure scope. TypeScript compiler
    // currently has no mechanism to detect this and will happily tell you
    // your code is correct when it isn't.
    const evaluateError = await page.evaluate(async (maxTimeInSec) => {
      const modelBecomesReady = new Promise<void>((resolve, reject) => {
        let timeout: NodeJS.Timeout;
        if (maxTimeInSec > 0) {
          timeout = setTimeout(() => {
            reject(new Error(
                `Stop capturing screenshot after ${maxTimeInSec} seconds`));
          }, maxTimeInSec * 1000);
        }

        self.addEventListener('model-ready', () => {
          if (maxTimeInSec > 0) {
            clearTimeout(timeout);
          }
          resolve();
        }, {once: true});
      });

      try {
        await modelBecomesReady;
        return null;
      } catch (error) {
        return error.message;
      }
    }, maxTimeInSec);

    if (evaluateError) {
      console.log(evaluateError);
      await browser.close();
      throw new Error(evaluateError);
    }

    console.log(`🖼  Capturing screenshot`);

    try {
      await fs.mkdir(this.outputDirectory);
    } catch (e) {
      // Ignored...
    }

    const screenshot =
        await page.screenshot({path: outputPath, omitBackground: true});

    await browser.close();

    return screenshot;
  }
}
