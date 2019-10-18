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

const path = require('path');
const LocalWebServer = require('local-web-server')
const {ArtifactCreator} = require('../lib/test/fidelity/artifact-creator.js');

const configPath = path.resolve('./test/fidelity/config.json');
const rootDirectory = path.resolve(path.dirname(configPath));
const config = require(configPath);

const localWebServer = new LocalWebServer();
const server = localWebServer.listen({port: 9040, directory: './'});
const renderer = process.argv[2];
const scenarioName = process.argv[3];
let dimensions = {};
dimensions.width = parseInt(process.argv[4], 10);
dimensions.height = parseInt(process.argv[5], 10);
const outputFile = process.argv[6];

const screenshotCreator = new ArtifactCreator(
    config,
    rootDirectory,
    `http://localhost:9040/test/fidelity/renderers/${renderer}/`);

if (scenarioName == null) {
  console.error(' Scenario name not specified!');
  process.exit(1);
}

if (outputFile == null) {
  console.error(' Output file not specified!');
  process.exit(1);
}

(async () => {
  try {
    await screenshotCreator.captureScreenshot(
        renderer, scenarioName, dimensions, outputFile);
  } catch (error) {
    console.error(error);
  } finally {
    server.close();
  }
})();
