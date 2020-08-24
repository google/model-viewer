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

import {FollowCamera} from '@babylonjs/core';
import {promises as fs} from 'fs';
import mkdirp from 'mkdirp';
import {join, resolve} from 'path';
import pngjs from 'pngjs';
import puppeteer from 'puppeteer';

import {AutoTestResults, DEVICE_PIXEL_RATIO, Dimensions, FIDELITY_TEST_THRESHOLD, GoldenConfig, ImageComparator, ImageComparisonAnalysis, ImageComparisonConfig, ScenarioConfig, toDecibel, WARNING_MESSAGE} from './common.js';
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

  /*
  async captureAndAnalyzeScreenshots(
      scenarioWhitelist: Set<string>|null = null) {
    const {scenarios} = this.config;
    const analyzedScenarios: Array<ScenarioConfig> = [];
    const {goldens, outputDirectory} = this;
    const modelViewerFidelityErrors: Array<string> = [];
    const modelViewerFidelityWarnings: Array<string> = [];

    for (const scenarioBase of scenarios) {
      const scenarioName = scenarioBase.name;
      const scenario = this[$configReader].scenarioConfig(scenarioName)!;
      const {dimensions} = scenario;

      if (scenarioWhitelist != null && !scenarioWhitelist.has(scenarioName)) {
        continue;
      }

      console.log(`\n🎨 Scenario: ${scenarioName}`);

      const scenarioOutputDirectory = join(outputDirectory, scenarioName);

      mkdirp.sync(scenarioOutputDirectory);

      let screenshot;
      try {
        screenshot = await this.captureScreenshot(
            'model-viewer',
            scenarioName,
            dimensions,
            join(scenarioOutputDirectory, 'model-viewer.png'),
            60);
      } catch (error) {
        const errorMessage =
            `❌ Failed to capture model-viewer's screenshot of ${
                scenarioName}. Error message: ${error.message}`;
        modelViewerFidelityErrors.push(errorMessage);
        continue;
      }

      if (screenshot == null) {
        const errorMessage = `❌ Model-viewer's screenshot of ${
            scenarioName} is not captured correctly(value is null). `;
        modelViewerFidelityErrors.push(errorMessage);
        continue;
      }

      let analysisResults;
      try {
        analysisResults =
            await this.analyze(screenshot, goldens, scenario, dimensions);
      } catch (error) {
        const message = `Fail to analyze scenario :${
            scenarioName}! Error message: ${error.message}`;

        if (error.message === WARNING_MESSAGE) {
          modelViewerFidelityWarnings.push(message);
        } else {
          modelViewerFidelityErrors.push(message);
        }

        continue;
      }

      const modelViewerIndex = 0;
      const modelViewerRmsInDb =
          toDecibel(analysisResults[modelViewerIndex].rmsDistanceRatio);

      if (modelViewerRmsInDb > FIDELITY_TEST_THRESHOLD) {
        const errorMessage =
            `❌ Senarios name: ${scenario.name}, rms distance ratio: ${
                modelViewerRmsInDb.toFixed(2)} dB.`;
        modelViewerFidelityErrors.push(errorMessage);
        continue;
      }

      const scenarioRecord = {analysisResults, scenario};

      console.log(`\n💾 Recording analysis`);

      await fs.writeFile(
          join(outputDirectory, scenarioName, 'analysis.json'),
          JSON.stringify(scenarioRecord));

      analyzedScenarios.push(scenario);
    }

    console.log('💾 Recording configuration');

    const finalConfig: ImageComparisonConfig =
        Object.assign({}, this.config, {scenarios: analyzedScenarios});

    await fs.writeFile(
        join(outputDirectory, 'config.json'), JSON.stringify(finalConfig));

    await fs.writeFile(
        join(outputDirectory, 'modelViewerFidelityErrors.json'),
        JSON.stringify(modelViewerFidelityErrors));

    await fs.writeFile(
        join(outputDirectory, 'modelViewerFidelityWarnings.json'),
        JSON.stringify(modelViewerFidelityWarnings));

    return scenarios;
  }
*/
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

    const modelViewerGoldenImage = pngjs.PNG.sync.read(modelViewerGolden).data;

    for (let golden of goldens) {
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

      const candidateGoldenImage = pngjs.PNG.sync.read(candidateGolden).data;
      try {
        const analysisResult = await this.analyze(
            modelViewerGoldenImage, candidateGoldenImage, dimensions);
        analysisResults.push(analysisResult);
      } catch (error) {
        if (error.message === WARNING_MESSAGE) {
          continue;
        }
      }
    }

    console.log(`\n💾 Recording analysis`);
    await fs.writeFile(
        join(outputDirectory, scenarioName, 'analysis.json'),
        JSON.stringify(analysisResults));
  }

  async autoTest(scenario: ScenarioConfig): Promise<ImageComparisonAnalysis> {
    const {rootDirectory, outputDirectory, goldens} = this;
    const {name: scenarioName, dimensions} = scenario;
    const scenarioOutputDirectory = join(outputDirectory, scenarioName)

    console.log(
        `start compare model-viewer's golden with model-viewer's screenshot generated from fidelity test:`);

    let screenshot;
    try {
      screenshot = await this.captureScreenshot(
          'model-viewer',
          scenarioName,
          dimensions,
          join(scenarioOutputDirectory, 'model-viewer.png'),
          60);
    } catch (error) {
      throw new Error(`❌ Failed to capture model-viewer's screenshot of ${
          scenarioName}. Error message: ${error.message}`);
    }

    if (screenshot == null) {
      throw new Error(`❌ Model-viewer's screenshot of ${
          scenarioName} is not captured correctly(value is null).`);
    }
    const screenshotImage = pngjs.PNG.sync.read(screenshot).data;

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
    const modelViewerGoldenImage = pngjs.PNG.sync.read(modelViewerGolden).data;

    const result =
        await this.analyze(screenshotImage, modelViewerGoldenImage, dimensions);
    return result;
  }

  async fidelityTest(scenarioWhitelist: Set<string>|null = null) {
    const {scenarios} = this.config;
    const {outputDirectory} = this;
    const analyzedScenarios: Array<ScenarioConfig> = [];
    const autoTestResults:
        AutoTestResults = {results: [], errors: [], warnings: []};

    for (let scenarioBase of scenarios) {
      const scenarioName = scenarioBase.name;
      const scenario = this[$configReader].scenarioConfig(scenarioName)!;
      const {dimensions} = scenario;

      if (scenarioWhitelist != null && !scenarioWhitelist.has(scenarioName)) {
        continue;
      }

      console.log(`\n🎨 Scenario: ${scenarioName}`);

      const scenarioOutputDirectory = join(outputDirectory, scenarioName);
      mkdirp.sync(scenarioOutputDirectory);

      // TODO try and catch errors
      await this.compareRenderers(scenario);

      // TODO try and catch
      try {
        const autoTestResult = await this.autoTest(scenario);
        autoTestResults.results.push(autoTestResult);
      } catch (error) {
        const message = `Fail to analyze scenario :${
            scenarioName}! Error message: ${error.message}`;

        if (error.message === WARNING_MESSAGE) {
          autoTestResults.warnings.push(message);
        } else {
          autoTestResults.errors.push(message);
        }
      }

      analyzedScenarios.push(scenario);
    }

    console.log('💾 Recording configuration');

    const finalConfig: ImageComparisonConfig =
        Object.assign({}, this.config, {scenarios: analyzedScenarios});

    await fs.writeFile(
        join(outputDirectory, 'config.json'), JSON.stringify(finalConfig));

    await fs.writeFile(
        join(outputDirectory, 'autoTestResults.json'),
        JSON.stringify(autoTestResults));
  }

  protected async analyze(
      candidateImage: Buffer, goldenImage: Buffer,
      dimensions: Dimensions): Promise<ImageComparisonAnalysis> {
    const imageDimensions = {
      width: dimensions.width * DEVICE_PIXEL_RATIO,
      height: dimensions.height * DEVICE_PIXEL_RATIO
    };
    const comparator =
        new ImageComparator(candidateImage, goldenImage, imageDimensions);

    const {analysis} = comparator.analyze();
    const {rmsDistanceRatio} = analysis;
    console.log(
        `\n  📊 Decibels of root mean square color distance (without threshold): ${
            (10 * Math.log10(rmsDistanceRatio)).toFixed(2)}`);

    return analysis;
  }

  /*
    protected async analyze(
        screenshot: Buffer, goldens: Array<GoldenConfig>,
        scenario: ScenarioConfig,
        dimensions: Dimensions): Promise<AnalysisResults> {
      const analysisResults: AnalysisResults = [];
      const {rootDirectory, outputDirectory} = this;
      const {name: scenarioName, exclude} = scenario;

      for (const goldenConfig of goldens) {
        const {name: rendererName} = goldenConfig;

        if (exclude != null && exclude.includes(rendererName)) {
          continue;
        }

        console.log(
            `\n🔍 Comparing <model-viewer> to ${goldenConfig.description}`);

        const goldenPath =
            join(rootDirectory, 'goldens', scenarioName, goldenConfig.file)

        let golden;
        try {
          golden = await fs.readFile(goldenPath);
        } catch (error) {
          throw new Error(`❌ Failed to read ${rendererName}'s ${
              scenarioName} golden! Error message: ${error.message}`);
        }

        const screenshotImage = pngjs.PNG.sync.read(screenshot).data;
        const goldenImage = pngjs.PNG.sync.read(golden).data;

        const imageDimensions = {
          width: dimensions.width * DEVICE_PIXEL_RATIO,
          height: dimensions.height * DEVICE_PIXEL_RATIO
        };
        const comparator =
            new ImageComparator(screenshotImage, goldenImage, imageDimensions);

        await fs.writeFile(
            join(outputDirectory, scenarioName, goldenConfig.file), golden);

        const {analysis} = comparator.analyze();
        const {rmsDistanceRatio} = analysis;
        console.log(
            `\n  📊 Decibels of root mean square color distance (without
    threshold): ${ (10 * Math.log10(rmsDistanceRatio)).toFixed(2)}`);

        analysisResults.push(analysis);
      }

      return analysisResults;
    }
    */

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
      const modelBecomesReady = new Promise((resolve, reject) => {
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
