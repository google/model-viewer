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

require = require('esm')(module)

const fs = require('fs').promises;
const path = require('path');
const LocalWebServer = require('local-web-server')
const {ArtifactCreator} = require('../lib/test/fidelity/artifact-creator.js');
const {ConfigReader} = require('../lib/test/fidelity/config-reader.js');

const config = require('../test/fidelity/config.json');
const configReader = new ConfigReader(config);

const screenshotCreator =
    new ArtifactCreator(config, 'http://localhost:9040/test/fidelity/');
const localWebServer = new LocalWebServer()
const server = localWebServer.listen({port: 9040, directory: './'});
const slug = process.argv[2];
const outputFile = process.argv[3];

if (slug == null) {
  console.error(' Test slug not specified!');
  process.exit(1);
}

if (outputFile == null) {
  console.error(' Output file not specified!');
  process.exit(1);
}

(async () => {
  try {
    await screenshotCreator.captureScreenshot(
        slug, configReader.dimensionsForSlug(slug), outputFile);
  } catch (error) {
    console.error(error);
    code = 1;
  } finally {
    server.close();
  }
})();
