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
import {ArtifactCreator} from '../../artifact-creator.js';
import {ImageComparisonConfig} from '../../common.js';

const port = 9040;

export const rendererScreenshot = async(
    config: ImageComparisonConfig,
    rootDirectory: string,

    renderer: string,
    scenarioName: string,
    outputFile: string,
    width: number = 10,
    height: number = 10): Promise<void> => {
  const dimensions = {width, height};
  const server = HTTPServer.createServer({root: './', cache: -1});

  server.listen(port);

  const screenshotCreator = new ArtifactCreator(
      config,
      rootDirectory,
      `http://localhost:${port}/test/renderers/${renderer}/`);

  if (scenarioName == null) {
    throw new Error(' Scenario name not specified!');
  }

  if (outputFile == null) {
    throw new Error(' Output file not specified!');
  }

  try {
    await screenshotCreator.captureScreenshot(
        renderer, scenarioName, dimensions, outputFile);
  } finally {
    server.close();
  }
};
