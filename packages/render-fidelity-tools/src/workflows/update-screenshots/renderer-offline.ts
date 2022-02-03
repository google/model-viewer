/* @license
 * Copyright 2022 Google LLC. All Rights Reserved.
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

import { ScenarioConfig } from '../../common.js';
import { spawnSync } from 'child_process';

export const rendererOffline = async (
  scenario: ScenarioConfig | null,
  rendererCommand: string,
  rendererArgs: string[],
  outputFile: string): Promise<void> => {

  if (scenario == null) {
    throw new Error(' Scenario not specified!');
  }

  if (outputFile == null) {
    throw new Error(' Output file not specified!');
  }

  let renderConfig = {
    scenario: scenario,
    outputFile: outputFile
  }

  const args = rendererArgs.concat([JSON.stringify(renderConfig)])
  const result = spawnSync(rendererCommand, args);
  
  if(result.error) { // handle issues with the external process 
    console.error(result.error);
    throw new Error();
  } 
  else if(result.status != 0) { // handle renderer issues
    throw new Error(result.stderr.toString());
  } else { // succceed!
    console.log("done!\n")
    console.log(result.stdout.toString());
  }
};
