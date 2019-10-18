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

require = require('esm')(module);
const {ConfigReader} = require('../lib/test/fidelity/config-reader.js');

const fs = require('fs').promises;
const {spawn} = require('child_process');
const path = require('path');

const warn = (message) => console.warn(`🚨 ${message}`);
const exit = (code = 0) => {
  console.log(`📋 Screenshot updates concluded`);
  process.exit(code);
};

const configPath = path.resolve(process.argv[2]);
const rootDirectory = path.resolve(path.dirname(configPath));
const config = require(configPath);

const {renderers} = config;
const goldensDirectory = path.join(rootDirectory, 'goldens');
const renderersDirectory = path.join(rootDirectory, 'renderers')

let scenarioWhitelist = null;

if (process.argv.length > 3) {
  scenarioWhitelist = new Set();

  for (let i = 3; i < process.argv.length; i++) {
    scenarioWhitelist.add(process.argv[i]);
  }
}

const run = async (
    command,
    args,
    environmentVariables = {},
    workingDirectory = process.cwd()) => new Promise((resolve, reject) => {
  const childProcess = spawn(command, args, {
    cwd: workingDirectory,
    env: {...process.env, ...environmentVariables},
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

  try {
    await fs.mkdir(goldensDirectory);
  } catch (error) {
    // Ignored...
  }

  const configReader = new ConfigReader(config);

  for (const scenarioBase of scenarios) {
    const scenarioName = scenarioBase.name;
    const scenario = configReader.scenarioConfig(scenarioName);
    const {model, lighting, dimensions, exclude} = scenario;
    const scenarioGoldensDirectory = path.join(goldensDirectory, scenarioName);
    const {width, height} = dimensions;

    try {
      await fs.mkdir(scenarioGoldensDirectory);
    } catch (error) {
      // Ignored...
    }

    for (const renderer of renderers) {
      const {name: rendererName, description: rendererDescription, scripts} =
          renderer;

      if (exclude != null && exclude.includes(rendererName)) {
        continue;
      }

      const goldenFilename = `${rendererName}-golden.png`;
      const rendererDirectory = path.join(renderersDirectory, rendererName);
      const goldenPath = path.join(scenarioGoldensDirectory, goldenFilename);

      if (scenarioWhitelist != null && !scenarioWhitelist.has(scenarioName)) {
        console.log(`⏭  Skipping ${scenarioName}...`);
        continue;
      }

      if (scripts != null && scripts.setup != null) {
        const setup = path.join(rendererDirectory, scripts.setup);
        console.log(`🚧 Running setup script: ${scripts.setup}`);
        await run(
            setup,
            [],
            {
              SCENARIO_NAME: scenarioName,
              MODEL: path.resolve(rendererDirectory, model),
              LIGHTING: path.resolve(rendererDirectory, lighting),
              RENDER_WIDTH: width,
              RENDER_HEIGHT: height
            },
            rendererDirectory);
      }

      try {
        await run('node', [
          './scripts/renderer-screenshot.js',
          rendererName,
          scenarioName,
          width,
          height,
          goldenPath
        ]);
      } catch (error) {
        throw new Error(`Failed to update ${rendererDescription} screenshot: ${
            error.message}`);
      }
    }
  }
};

updateScreenshots(config).then(() => exit(0)).catch((error) => {
  console.error(error);
  exit(1);
});
