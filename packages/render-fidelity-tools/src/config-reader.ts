/* @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {Dimensions, ImageComparisonConfig, RendererConfig, ScenarioConfig} from './common.js';

const defaultScenario = {
  lighting: '../../../shared-assets/environments/lightroom_14b.hdr',
  dimensions: {width: 768, height: 768},
  target: {x: 0, y: 0, z: 0},
  orbit: {theta: 0, phi: 90, radius: 1},
  verticalFoV: 45,
  renderSkybox: false
};

export class ConfigReader {
  constructor(readonly config: ImageComparisonConfig) {
  }

  scenarioConfig(name: string): ScenarioConfig|null {
    const {scenarios} = this.config;

    for (const scenario of scenarios) {
      if (scenario.name === name) {
        const output = Object.assign({}, defaultScenario, scenario);

        // This is necessary because Object.assign is not deep
        output.dimensions =
            Object.assign({}, defaultScenario.dimensions, scenario.dimensions);
        output.target =
            Object.assign({}, defaultScenario.target, scenario.target);
        output.orbit = Object.assign({}, defaultScenario.orbit, scenario.orbit);
        return output;
      }
    }

    return null;
  }

  rendererConfig(name: string): RendererConfig|null {
    const {renderers} = this.config;

    for (const renderer of renderers) {
      if (renderer.name === name) {
        return renderer;
      }
    }

    return null;
  }

  dimensionsForScenario(name: string): Dimensions {
    const {scenarios} = this.config;

    for (const scenario of scenarios) {
      if (scenario.name === name) {
        return scenario.dimensions;
      }
    }

    return {width: 0, height: 0};
  }
}
