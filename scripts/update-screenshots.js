/*
 * Copyright 2019 Google Inc. All Rights Reserved.
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

const fs = require('fs').promises;
const {spawn} = require('child_process');
const path = require('path');

const warn = (message) => console.warn(`🚨 ${message}`);
const exit = (code = 0) => {
  console.log(`📋 Screenshot updates concluded`);
  process.exit(code);
};

const fidelityTestDirectory = path.resolve('./test/fidelity');
const filamentScreenshotScript =
    path.resolve('./scripts/filament-screenshot.sh');
const backgroundImageRe = /background-image\="([^"]+)"/;
const modelSourceRe = /src\="([^"]+)"/

const updateScreenshots = async (config) => {
  const {scenarios} = config;

  console.log(`💡 Updating screenshots

⏳ NOTE: The first time running this script can take a long time (5 - 10 minutes)
because we have to build Filament from scratch. If you hear your CPU fan spin
up, take a break and go make yourself a nice cup of tea!`);

  for (const scenario of scenarios) {
    const {goldens, slug} = scenario;
    const scenarioDirectory = path.join(fidelityTestDirectory, slug);
    const testHtmlPath = path.join(scenarioDirectory, 'index.html');

    const html = (await fs.readFile(testHtmlPath)).toString();

    const backgroundImageMatch = html.match(backgroundImageRe);
    const backgroundImage =
        backgroundImageMatch != null ? backgroundImageMatch[1] : null;

    if (backgroundImage == null) {
      warn(`Could not determine IBL for ${scenario.slug}; skipping...`);
      continue;
    }

    const modelSourceMatch = html.match(modelSourceRe);
    const modelSource = modelSourceMatch != null ? modelSourceMatch[1] : null;

    if (modelSource == null) {
      warn(
          `Could not determine model source for ${scenario.slug}; skipping...`);
      continue;
    }

    const backgroundImagePath =
        path.resolve(path.dirname(testHtmlPath), backgroundImage);

    const modelSourcePath =
        path.resolve(path.dirname(testHtmlPath), modelSource);

    for (const golden of goldens) {
      const {name, file} = golden;
      const filePath = path.resolve(scenarioDirectory, file);

      switch (name) {
        default:
          console.log(
              `✋ Cannot automatically update ${name} screenshots (yet)`);
          break;
        case 'Filament':
          const {width, height} = scenario.dimensions;
          // TODO(cdata): Figure out how to detect high-dpi here:
          const scaledWidth = width;
          const scaledHeight = height;

          await new Promise((resolve, reject) => {
            console.log(`🖼 Rendering ${name} screenshot for ${slug}...`);

            const childProcess = spawn(
                filamentScreenshotScript,
                [
                  '-w',
                  `${scaledWidth}`,
                  '-h',
                  `${scaledHeight}`,
                  '-i',
                  backgroundImagePath,
                  '-m',
                  modelSourcePath,
                  '-o',
                  filePath
                ],
                {
                  cwd: process.cwd(),
                  env: process.env,
                  stdio: ['ignore', 'inherit', 'inherit']
                });

            childProcess.once('error', (error) => {
              warn(error);
            });

            childProcess.once('exit', (code) => {
              if (code === 0) {
                console.log(
                    `✅ Successfully captured screenshot for ${name} ${slug}`);
                resolve();
              } else {
                reject(new Error('Failed to capture Filament screenshot'));
              }
            });
          });

          break;
      }
    }
  }
};

updateScreenshots(require(path.join(fidelityTestDirectory, 'config.json')))
    .then(() => exit(0))
    .catch((error) => {
      console.error(error);
      exit(1);
    });
