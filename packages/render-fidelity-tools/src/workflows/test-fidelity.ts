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

import HTTPServer from 'http-server';
import module from 'module';
import {dirname, join, resolve} from 'path';
import rimraf from 'rimraf';

const require = module.createRequire(import.meta.url);
// actions/core can only be imported using commonJS's require here
const core = require('@actions/core');

import {ArtifactCreator} from '../artifact-creator.js';
import {FIDELITY_TEST_THRESHOLD} from '../common.js';

const configPath = resolve(process.argv[2]);
const rootDirectory = resolve(dirname(configPath));
const config = require(configPath);

const outputDirectory = join(rootDirectory, 'results');
const port = 9030;
const screenshotCreator = new ArtifactCreator(
    config,
    rootDirectory,
    `http://localhost:${port}/test/renderers/model-viewer/`);
const server = HTTPServer.createServer({root: './', cache: -1});
server.listen(port);


try {
  rimraf.sync(outputDirectory);
} catch (error) {
  console.warn(error);
}

let scenarioWhitelist: Set<string>|null = null;

// default update screenshots command takes 3 arguments. If there's more than 3,
// user has specified scenarios to test
if (process.argv.length > 3) {
  scenarioWhitelist = new Set();

  for (let i = 3; i < process.argv.length; i++) {
    scenarioWhitelist.add(process.argv[i]);
  }
}

screenshotCreator.captureAndAnalyzeScreenshots(scenarioWhitelist)
    .then(() => {
      console.log(`✅ Results recorded to ${outputDirectory}`);
      server.close();

      const modelViewerErrorPath =
          join(outputDirectory, 'modelViewerFidelityErrors.json');
      const modelViewerFidelityErrors = require(modelViewerErrorPath);

      // config contains all scenarios, testConfig contains only scenarios that
      // the test run on.
      const testConfigPath = join(outputDirectory, 'config.json');
      const testConfig = require(testConfigPath);
      const failCount = modelViewerFidelityErrors.length;
      const passCount = testConfig.scenarios.length;
      const scenarioCount = failCount + passCount;

      console.log(`Fidelity test on ${
          scenarioCount} scenarios finished. Model-Viewer passed ${
          passCount} scenarios ✅, failed ${failCount} scenarios ❌. (Uses ${
          FIDELITY_TEST_THRESHOLD} dB as threshold)`);

      if (failCount > 0) {
        console.log('🔍 Logging failed scenarios: ');
        for (const error of modelViewerFidelityErrors) {
          console.log(error);
        }

        throw new Error(
            'Model Viewer failed the fidelity test! Please fix the fidelity error before merging to master!');
      }
    })
    .catch((error: any) => core.setFailed(error.message));
