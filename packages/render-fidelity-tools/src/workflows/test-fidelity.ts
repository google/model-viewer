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

import {ArtifactCreator} from '../artifact-creator.js';

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
    .catch((error: any) => console.error(error));
