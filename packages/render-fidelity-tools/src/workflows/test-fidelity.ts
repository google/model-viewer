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


import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

 type CommandLineArgs = {
   config: string;
   renderer: string;
   scenario: string[];
   port: number;
   dryRun: boolean;
   quiet: boolean;
 }
 

const require = module.createRequire(import.meta.url);
// actions/core can only be imported using commonJS's require here
const core = require('@actions/core');

import {ArtifactCreator} from '../artifact-creator.js';
import {FIDELITY_TEST_THRESHOLD, toDecibel} from '../common.js';

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
        type: 'string',
        alias: 'r',
        description: 'Name of web-based renderer to test',
        default: 'model-viewer',
        choices: ['filament', 'babylon', 'gltf-sample-viewer', 'three-gpu-renderer', 'model-viewer']
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
        default: 9030,
      },
      'dry-run': {
        type: 'boolean',
        alias: 'd',
        description: 'Checks that all comparison images exist',
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
    renderer: argv.renderer as string,
    scenario: ( argv.scenario  || [] ) as string[],
    port: argv.port as number,
    dryRun: argv['dry-run'],
    quiet: argv.quiet,
  };

  const configPath = resolve(args.config);
  const rootDirectory = resolve(dirname(configPath));
  const config = require(configPath);

  const outputDirectory = join(rootDirectory, 'results');
  const screenshotCreator = new ArtifactCreator(
      config,
      rootDirectory,
      `http://localhost:${
        args.port}/packages/render-fidelity-tools/test/renderers/${args.renderer}/`);
  const server = HTTPServer.createServer({root: '../../', cache: -1});
  server.listen(args.port);

  try {
    rimraf.sync(outputDirectory);
  } catch (error) {
    console.warn(error);
  }

  let scenarioWhitelist: Set<string>|null = null;

  // user has specified scenarios to test
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
        console.warn(`Requested scenario "${scenarioName}" does not match any names found in config`);
      }
    });
  }

  try {
    await screenshotCreator.fidelityTest(scenarioWhitelist, args.renderer, args.dryRun, args.quiet);

    console.log(`✅ Results recorded to ${outputDirectory}`);
  
    const fidelityRegressionPath =
        join(outputDirectory, 'fidelityRegressionResults.json');
    const {
      results: fidelityRegressionResults,
      errors: fidelityRegressionErrors,
      warnings: fidelityRegressionWarnings
    } = require(fidelityRegressionPath);

    const fidelityRegressionPassedCount = fidelityRegressionResults.length;
    const fidelityRegressionErrorCount = fidelityRegressionErrors.length;
    const fidelityRegressionWarningCount = fidelityRegressionWarnings.length;
    const scenarioCount = fidelityRegressionPassedCount +
        fidelityRegressionErrorCount + fidelityRegressionWarningCount

    console.log(`\nFidelity regression test on ${
        scenarioCount} scenarios finished. (Uses ${
        FIDELITY_TEST_THRESHOLD} dB as threshold)`);
    console.log(`Passed ${fidelityRegressionPassedCount} scenarios ✅`);
    if (fidelityRegressionErrorCount > 0) {
      console.log(`Failed ${fidelityRegressionErrorCount} scenarios ❌`);
    } else {
      let maxError = -Infinity;
      for (const result of fidelityRegressionResults) {
        maxError = Math.max(maxError, toDecibel(result.rmsDistanceRatio));
      }
      console.log('Worst scenario RMS:', maxError, 'dB');
    }

    if (fidelityRegressionWarningCount > 0) {
      console.log(`Warnings on ${fidelityRegressionWarningCount} scenarios❗️`);
      console.log('\n🔍 Logging warning scenarios: ');
      for (const warning of fidelityRegressionWarnings) {
        console.log(warning);
      }

      core.warning(
          '❗️Fidelity test detected some warnings! Please try to fix them');
    }

    if (fidelityRegressionErrorCount > 0) {
      console.log('\n🔍 Logging failed scenarios: ');
      for (const error of fidelityRegressionErrors) {
        console.log(error);
      }
    }

    const compareRendererResultPath = join(outputDirectory, 'config.json');
    const {scenarios: comparedRenderResult, errors: compareRendererErrors} =
        require(compareRendererResultPath);
    const compareRendererPassCount = comparedRenderResult.length;
    const compareRendererErrorCount = compareRendererErrors.length;

    if (compareRendererErrorCount > 0) {
      console.log(
          `\nCompare Renderers on ${scenarioCount} scenarios finished. ${
              compareRendererPassCount} scenarios passed ✅, ${
              compareRendererErrorCount} scenarios failed ❌`);
      console.log('\n🔍 Logging failed scenarios: ');
      for (const error of compareRendererErrors) {
        console.log(error);
      }
    }

    if (fidelityRegressionErrorCount > 0 || compareRendererErrorCount > 0) {
      throw new Error(
          ' ❌ Fidelity test failed! Please fix the errors listed above before merging this pr!');
    }
  }
  catch(error: any) {
    core.setFailed(error.message);
  }
  finally {
    server.close();
    screenshotCreator.close();
  }
}

main();