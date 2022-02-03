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

import {spawn} from 'child_process';
import {promises as fs} from 'fs';
import module from 'module';
import {dirname, join, resolve} from 'path';

import {ImageComparisonConfig} from '../common.js';
import {ConfigReader} from '../config-reader.js';

import {rendererScreenshot} from './update-screenshots/renderer-screenshot.js';
import {rendererOffline} from './update-screenshots/renderer-offline.js';

const require = module.createRequire(import.meta.url);

const warn = (message: string) => console.warn(`🚨 ${message}`);
const exit = (code = 0) => {
  console.log(`📋 Screenshot updates concluded`);
  process.exit(code);
};

const configPath = resolve(process.argv[2]);
const rootDirectory = resolve(dirname(configPath));
const config = require(configPath);

const {renderers} = config;
const goldensDirectory = join(rootDirectory, 'goldens');
const renderersDirectory = join(rootDirectory, 'renderers');

let scenarioWhitelist: Set<string>|null = null;
let rendererWhitelist: Set<string>|null = null;
const rendererList = new Set(config.renderers.map((renderer: any) => {
  return renderer.name;
}));

// default update screenshots command takes 3 arguments. If there's more than 3,
// user has specify either scenarios or renderers
if (process.argv.length > 3) {
  for (let i = 3; i < process.argv.length; i++) {
    const argName = process.argv[i];

    if (rendererList.has(argName)) {
      if (rendererWhitelist === null) {
        rendererWhitelist = new Set();
      }
      rendererWhitelist.add(argName);
    } else {
      if (scenarioWhitelist === null) {
        scenarioWhitelist = new Set();
      }
      scenarioWhitelist.add(argName);
    }
  }
}

const run = async (
    command: string,
    args: Array<string>,
    environmentVariables = {},
    workingDirectory = process.cwd()) =>
    new Promise<void>((resolve, reject) => {
      const childProcess = spawn(command, args, {
        cwd: workingDirectory,
        env: {...process.env, ...environmentVariables},
        stdio: ['ignore', 'inherit', 'inherit']
      });

      childProcess.once('error', (error: any) => {
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

const updateScreenshots = async (config: ImageComparisonConfig) => {
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
    const {model, lighting, dimensions, exclude} = scenario!;
    const scenarioGoldensDirectory = join(goldensDirectory, scenarioName);
    const {width, height} = dimensions;

    try {
      await fs.mkdir(scenarioGoldensDirectory);
    } catch (error) {
      // Ignored...
    }

    for (const renderer of renderers) {
      const {name: rendererName, description: rendererDescription, scripts: scripts, command: rendererCommand} = renderer;
   
      if (exclude != null && exclude.includes(rendererName) ||
          rendererWhitelist != null && !rendererWhitelist.has(rendererName)) {
        continue;
      }

      const goldenFilename = `${rendererName}-golden.png`;
      const rendererDirectory = join(renderersDirectory, rendererName);
      const goldenPath = join(scenarioGoldensDirectory, goldenFilename);

      if (scenarioWhitelist != null && !scenarioWhitelist.has(scenarioName)) {
        console.log(`⏭  Skipping ${scenarioName}...`);
        continue;
      }

      if (scripts != null && scripts.setup != null &&
          !lighting.includes('spot1Lux')) {
        const setup = join(rendererDirectory, scripts.setup);
        console.log(`🚧 Running setup script: ${scripts.setup}`);
        await run(
            setup,
            [],
            {
              SCENARIO_NAME: scenarioName,
              MODEL: resolve(rendererDirectory, model),
              LIGHTING: resolve(rendererDirectory, lighting),
              RENDER_WIDTH: width,
              RENDER_HEIGHT: height
            },
            rendererDirectory);
      }

      if(rendererCommand) {
        if(rendererCommand.executable) {
          try {
            process.stdout.write(rendererName + `: Rendering ` + scenarioName + "...");
            await rendererOffline(
              scenario,
              rendererCommand.executable,
              rendererCommand.args,
              goldenPath);
          }
          catch (error) {
            throw new Error(`Offline rendering process for ${rendererDescription} failed: ${
                error.message}`);
          }
        }
      } else {
        try {
          await rendererScreenshot(
              config,
              resolve(dirname(configPath)),
              rendererName,
              scenarioName,
              goldenPath,
              width,
              height);
        }
        catch (error) {
            throw new Error(`Failed to update ${rendererDescription} screenshot: ${
                error.message}`);
        }
      }
    }
  }
};

updateScreenshots(config).then(() => exit(0)).catch((error) => {
  console.error(error);
  exit(1);
});
