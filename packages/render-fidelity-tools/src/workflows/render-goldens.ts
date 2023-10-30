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

import {rendererScreenshot} from './render-goldens/renderer-screenshot.js';
import {rendererOffline} from './render-goldens/renderer-offline.js';

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

type CommandLineArgs = {
  config: string;
  renderer: string[];
  scenario: string[];
  port: number;
  missingOnly: boolean;
  dryRun: boolean;
  quiet: boolean;
}

async function main() {

  const argv = await yargs(hideBin(process.argv))
    .options({
      'config': {
        type: 'string',
        alias: 'c',
        description: 'Path to configuration json',
        demandOption: true, // Makes it mandatory. Adjust as per your needs.
      },
      'renderer': {
        type: 'array',
        alias: 'r',
        description: 'Limit to specific renderers',
        demandOption: false, // Makes it mandatory. Adjust as per your needs.
      },
      'scenario': {
        type: 'array',
        alias: 's',
        description: 'Limit to specific scenarios',
        demandOption: false, // Makes it mandatory. Adjust as per your needs.
      },
      'port': {
        type: 'number',
        alias: 'p',
        description: 'Port for web server',
        default: 9040,
      },
      'missing-only': {
        type: 'boolean',
        alias: 'm',
        description: 'Only render if an output image is missing',
        default: false,
      },
      'dry-run': {
        type: 'boolean',
        alias: 'd',
        description: 'Lists which images would be rendered but doesn\'t render',
        default: false,
      },
      'quiet': {
        type: 'boolean',
        alias: 'q',
        description: 'Hide the puppeteer controlled browser',
        default: false,
      },
    })
    .help()
    .alias('help', 'h')
    .argv;

  const args: CommandLineArgs = {
    config: argv.config as string,
    renderer: ( argv.renderer  || [] )as string[],
    scenario: ( argv.scenario  || [] ) as string[],
    port: argv.port as number,
    missingOnly: argv['missing-only'],
    dryRun: argv['dry-run'],
    quiet: argv.quiet,
  };

  const require = module.createRequire(import.meta.url);

  const warn = (message: string) => console.warn(`🚨 ${message}`);
  const exit = (code = 0) => {
    console.log(`📋 Screenshot updates concluded`);
    process.exit(code);
  };

  const configPath = resolve(args.config);
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

  // user has specify either scenarios or renderers
  if( args.renderer.length > 0 ) {
    rendererWhitelist = new Set();
    args.renderer.forEach( (rendererName: string) => {
      if (rendererList.has(rendererName)) {
        rendererWhitelist!.add(rendererName);
      }
      else {
        warn(`Requested renderer "${rendererName}" not found in config`);
      }
    });
  }

  if( args.scenario.length > 0 ) {
    scenarioWhitelist = new Set();
    args.scenario.forEach( (scenarioName: string) => {
      const scenarioNameLower = scenarioName.toLowerCase();
      let numMatches = 0;
      config.scenarios.forEach( (scenario: any) => {
        if( scenario.name.toLowerCase().indexOf( scenarioNameLower ) >= 0 ) {
          if( ! scenarioWhitelist!.has( scenario.name ) ) {
            scenarioWhitelist!.add(scenario.name);
          }
          numMatches++;
        }
      });
      if( numMatches) {
        warn(`Requested scenario "${scenarioName}" does not match any names found in config`);
      }
    });
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

        if( args.missingOnly ) {
          try {
            await fs.access(goldenPath);
            console.log(`⏭  Skipping ${scenarioName} as render exists...`);
            continue;
          }
          catch (error) {
            // ignored
          }
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

        if( args.dryRun ) {
          process.stdout.write(rendererName + `: Rendering ` + scenarioName + "... -- skipping, dry-run");
          continue;
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
              height,
              args.port,
              args.quiet);
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


}

main();