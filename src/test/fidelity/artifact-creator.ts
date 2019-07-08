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

const {promises: fs} = require('fs');
const puppeteer = require('puppeteer');
const path = require('path');
const {PNG} = require('pngjs');
const makeDir = require('make-dir');

import {ImageComparisonAnalysis, ImageComparator, ImageComparisonConfig, GoldenConfig, ScenarioConfig, Dimensions} from './common.js';
import ModelViewerElementBase from '../../model-viewer-base.js';

export type AnalysisResults = Array<Array<ImageComparisonAnalysis>>;

export interface ScenarioRecord extends ScenarioConfig {
  analysisResults: AnalysisResults;
}

export class ArtifactCreator {
  constructor(
      protected config: ImageComparisonConfig, protected baseUrl: string) {
    console.log('🌈 Preparing to capture screenshots for fidelity comparison');
  }

  async captureAndAnalyzeScreenshots(
      scenarioWhitelist: Set<string>|null = null) {
    const {outputDirectory, scenarios, analysisThresholds} = this.config
    const analyzedScenarios: Array<ScenarioConfig> = [];

    for (const scenario of scenarios) {
      const {slug, goldens, dimensions} = scenario;

      if (scenarioWhitelist != null && !scenarioWhitelist.has(slug)) {
        continue;
      }

      console.log(`\n🎨 Scenario: ${slug}`);

      await makeDir(path.join(outputDirectory, slug));

      const screenshot = await this.captureScreenshot(slug, dimensions);
      const analysisResults = await this.analyze(
          screenshot, goldens, slug, dimensions, analysisThresholds);

      const scenarioRecord = Object.assign({analysisResults}, scenario);

      console.log(`\n💾 Recording analysis`);

      await fs.writeFile(
          path.join(outputDirectory, slug, 'analysis.json'),
          JSON.stringify(scenarioRecord));

      analyzedScenarios.push(scenario);
    }

    console.log('💾 Recording configuration');

    const finalConfig: ImageComparisonConfig =
        Object.assign({}, this.config, {scenarios: analyzedScenarios});

    await fs.writeFile(
        path.join(outputDirectory, 'config.json'), JSON.stringify(finalConfig));

    return scenarios;
  }

  protected async analyze(
      screenshot: Buffer, goldens: Array<GoldenConfig>, slug: string,
      dimensions: Dimensions,
      analysisThresholds: Array<number>): Promise<AnalysisResults> {
    const analysisResults: AnalysisResults = [];

    for (const goldenConfig of goldens) {
      console.log(`\n🔍 Comparing <model-viewer> to ${goldenConfig.name}`);

      const thresholdResults: Array<ImageComparisonAnalysis> = [];
      const golden = await fs.readFile(
          path.join(this.config.scenarioDirectory, slug, goldenConfig.file));

      const screenshotImage = PNG.sync.read(screenshot).data;
      const goldenImage = PNG.sync.read(golden).data;

      const comparator =
          new ImageComparator(screenshotImage, goldenImage, dimensions);

      await fs.writeFile(
          path.join(this.config.outputDirectory, slug, goldenConfig.file),
          golden);

      for (const threshold of analysisThresholds) {
        console.log(`\n  📏 Using threshold ${threshold.toFixed(1)}`);
        const {analysis} = comparator.analyze(threshold);
        const {
          matchingRatio,
          averageDistanceRatio,
          mismatchingAverageDistanceRatio
        } = analysis;

        thresholdResults.push(analysis);

        console.log(
            `  📊 Matching pixels: ${(matchingRatio * 100).toFixed(2)}%`);
        console.log(`  📊 Mean color distance: ${
            (averageDistanceRatio * 100).toFixed(2)}%`);
        console.log(`  📊 Mean color distance (mismatching pixels only): ${
            (mismatchingAverageDistanceRatio * 100).toFixed(2)}%`);
      }

      analysisResults.push(thresholdResults);
    }

    return analysisResults;
  }


  async captureScreenshot(
      slug: string, dimensions: Dimensions,
      outputPath: string =
          path.join(this.config.outputDirectory, slug, 'model-viewer.png')) {
    const DEVICE_PIXEL_RATIO = slug.includes('Filament') ? 1 : 2;
    const scaledWidth = dimensions.width / DEVICE_PIXEL_RATIO;
    const scaledHeight = dimensions.height / DEVICE_PIXEL_RATIO;

    console.log(`🚀 Launching browser`);

    const headless = slug.includes('Filament') ? false : true;

    const browser = await puppeteer.launch({
      defaultViewport: {
        width: scaledWidth,
        height: scaledHeight,
        deviceScaleFactor: DEVICE_PIXEL_RATIO
      },
      headless: headless
    });

    const page = await browser.newPage();
    const url = `${this.baseUrl}${slug}`;

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

    const name = slug.includes('Filament') ? '<model-viewer>' : 'Filament';
    console.log(`🖌  Rendering ${slug} with ${name}`);

    await page.evaluate(async (slug: string) => {
      if (slug.includes('Filament')) {
        const filament = document.getElementsByTagName('canvas')[0];

        const modelLoads = new Promise((resolve, reject) => {
          const timeout = setTimeout(reject, 10000);

          filament.addEventListener('model-loaded', () => {
            clearTimeout(timeout);
            resolve();
          });
        });

        await modelLoads;
      } else {
        const modelViewer =
            document.querySelector('model-viewer') as ModelViewerElementBase;

        if (!modelViewer.loaded!) {
          const modelLoads = new Promise((resolve, reject) => {
            const timeout = setTimeout(reject, 10000);

            modelViewer.addEventListener('load', () => {
              clearTimeout(timeout);
              resolve();
            });
          });

          const modelVisible = new Promise((resolve, reject) => {
            const timeout = setTimeout(reject, 10000);

            modelViewer.addEventListener('model-visibility', (event) => {
              clearTimeout(timeout);
              if ((event as any).detail.visible) {
                resolve();
              } else {
                reject();
              }
            });
          });

          await Promise.all([modelLoads, modelVisible]);
        }
      }
    }, slug);

    console.log(`🖼  Capturing screenshot`);

    const screenshot = await page.screenshot({path: outputPath});

    await browser.close();

    return screenshot;
  }
}
