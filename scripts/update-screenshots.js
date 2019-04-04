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

let rendererWhitelist = null;

if (process.argv.length > 2) {
  rendererWhitelist = new Set();

  for (let i = 2; i < process.argv.length; i++) {
    rendererWhitelist.add(process.argv[i]);
  }
}

const run = async (command, args) => new Promise((resolve, reject) => {
  const childProcess = spawn(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: ['ignore', 'inherit', 'inherit']
  });

  childProcess.once('error', (error) => {
    warn(error);
  });

  childProcess.once('exit', (code) => {
    if (code === 0) {
      resolve();
    } else {
      reject(new Error('Command failed'));
    }
  });
});

const updateScreenshots = async (config) => {
  const {scenarios} = config;

  console.log(`🆙 Updating screenshots`);

  for (const scenario of scenarios) {
    const {goldens, slug} = scenario;
    const scenarioDirectory = path.join(fidelityTestDirectory, slug);

    for (const golden of goldens) {
      const {name, file} = golden;
      const filePath = path.resolve(scenarioDirectory, file);

      if (rendererWhitelist != null && !rendererWhitelist.has(name)) {
        console.log(`⏭  Skipping ${name}...`);
        continue;
      }

      switch (name) {
        default:
          console.log(
              `✋ Cannot automatically update ${name} screenshots (yet)`);
          break;
        case '<model-viewer> (master)':
          console.log(`💡 Rendering ${name} screenshot for ${slug}...`);

          try {
            await run(
                'node',
                ['./scripts/model-viewer-screenshot.js', slug, filePath]);
          } catch (error) {
            throw new Error(`Failed to capture <model-viewer> screenshot: ${
                error.message}`);
          }

          break;
        case 'Filament':
          await screenshotFromScript(scenario, scenarioDirectory, filePath, name, filamentScreenshotScript);
          break;
      }
    }
  }
};

const screenshotFromScript = async (scenario, scenarioDirectory, filePath, name, script) => {
  const testHtmlPath = path.join(scenarioDirectory, 'index.html');

  const html = (await fs.readFile(testHtmlPath)).toString();

  const backgroundImageMatch = html.match(backgroundImageRe);
  const backgroundImage =
      backgroundImageMatch != null ? backgroundImageMatch[1] : null;

  const modelSourceMatch = html.match(modelSourceRe);
  const modelSource = modelSourceMatch != null ? modelSourceMatch[1] : null;

  const {width, height} = scenario.dimensions;

  if (modelSource == null) {
    warn(`Could not determine model source for ${
        scenario.slug}; skipping...`);
    return;
  }

  if (backgroundImage == null) {
    warn(`Could not determine IBL for ${scenario.slug}; skipping...`);
    return;
  }

  const backgroundImagePath =
      path.resolve(path.dirname(testHtmlPath), backgroundImage);

  const modelSourcePath =
      path.resolve(path.dirname(testHtmlPath), modelSource);

  await new Promise((resolve, reject) => {
    console.log(`🖌️  Rendering ${name} screenshot for ${scenario.slug}...`);

    const childProcess = spawn(
        script,
        [
          '-w',
          `${width}`,
          '-h',
          `${height}`,
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
            `✅ Successfully captured screenshot for ${name} ${scenario.slug}`);
        resolve();
      } else {
        reject(new Error(`Failed to capture ${name} screenshot`));
      }
    });
  });


}

updateScreenshots(require(path.join(fidelityTestDirectory, 'config.json')))
    .then(() => exit(0))
    .catch((error) => {
      console.error(error);
      exit(1);
    });
