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

require = require('esm')(module)

const rimraf = require('rimraf');
const path = require('path');
const LocalWebServer = require('local-web-server')
const {ArtifactCreator} =
    require('../../lib/test/fidelity/artifact-creator.js');

const configPath = path.resolve(process.argv[2]);
const rootDirectory = path.resolve(path.dirname(configPath));
const config = require(configPath);

const outputDirectory = path.join(rootDirectory, 'results');
const screenshotCreator = new ArtifactCreator(
    config,
    rootDirectory,
    `http://localhost:9030/test/fidelity/renderers/model-viewer/`);
const localWebServer = new LocalWebServer()
const server = localWebServer.listen({port: 9030, directory: './'});


try {
  rimraf.sync(outputDirectory);
} catch (error) {
  console.warn(error);
}

let scenarioWhitelist = null;

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
    })
    .catch(error => console.error(error));
