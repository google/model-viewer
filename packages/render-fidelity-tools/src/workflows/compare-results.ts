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

const ALERT_THRESHOLD = 0.1;

import {resolve, join} from 'path';
const [candidateResultsDirectory, goldenResultsDirectory] =
    process.argv.slice(2);

const warn = (message: string) => console.warn(`🚨 ${message}`);
const exit = () => {
  console.log(`📋 Fidelity result comparison concluded`);
  process.exit(0);
};

console.log(`🛂 Comparing fidelity to previously recorded results at ${
    goldenResultsDirectory}`);

const candidateConfig =
    require(resolve(join(candidateResultsDirectory, 'config.json')));
const goldenConfig =
    require(resolve(join(goldenResultsDirectory, 'config.json')));

const {scenarios: candidateScenarios, analysisThresholds: candidateThresholds} =
    candidateConfig;
const {scenarios: goldenScenarios, analysisThresholds: goldenThresholds} =
    goldenConfig;
const goldenScenarioMap = new Map();

const remainingGoldenThresholds = goldenThresholds.slice();

for (let i = 0; i < candidateThresholds.length; ++i) {
  const candidateThreshold = candidateThresholds[i];

  if (remainingGoldenThresholds.length === 0) {
    warn(`${goldenResultsDirectory} tests ${
        candidateThresholds.length -
        goldenThresholds.length} fewer thresholds than ${
        candidateResultsDirectory}`);
    exit();
  }

  const goldenThreshold = remainingGoldenThresholds.shift();

  if (candidateThreshold !== goldenThreshold) {
    warn(`Candidate uses threshold ${
        candidateThreshold} where golden uses threshold ${goldenThreshold}`);
    exit();
  }
}

for (const goldenScenario of goldenScenarios) {
  goldenScenarioMap.set(goldenScenario.name, goldenScenario);
}

for (const candidateScenario of candidateScenarios) {
  const {name} = candidateScenario;

  if (!goldenScenarioMap.has(name)) {
    warn(`${goldenResultsDirectory} does not include scenario "${
        name}" found in ${candidateResultsDirectory}`);
    continue;
  }

  const goldenScenario = goldenScenarioMap.get(name);
  const candidateAnalysis =
      require(resolve(join(candidateResultsDirectory, name, 'analysis.json')));
  const goldenAnalysis =
      require(resolve(join(goldenResultsDirectory, name, 'analysis.json')));

  const goldenGoldenMap = new Map();

  for (const goldenGolden of goldenScenario.goldens) {
    goldenGoldenMap.set(goldenGolden.name, goldenGolden);
  }

  for (let i = 0; i < candidateScenario.goldens.length; ++i) {
    const candidateGolden = candidateScenario.goldens[i];
    if (!goldenGoldenMap.has(candidateGolden.name)) {
      warn(`${goldenResultsDirectory} does not include an analysis of "${
          candidateGolden.name}" for scenario "${name}" found in ${
          candidateResultsDirectory}`);
      continue;
    }

    const candidateResults = candidateAnalysis.analysisResults[i];
    const goldenResults = goldenAnalysis.analysisResults[i];

    for (let j = 0; j < candidateThresholds.length; ++j) {
      const threshold = candidateThresholds[j];

      const candidateThresholdResult = candidateResults[j];
      const goldenThresholdResult = goldenResults[j];

      for (const key in candidateThresholdResult) {
        if (!(key in goldenThresholdResult)) {
          warn(`Golden analysis of "${candidateGolden.name}" in scenario "${
              name}" is missing metric "${key}"`);
          continue;
        }

        const delta =
            goldenThresholdResult[key] - candidateThresholdResult[key];

        const comparisonDescription =
            `<model-viewer> <-> ${candidateGolden.name}`;
        const comparisonConstraints =
            `"${name}/${key}" @ threshold ${threshold}`;
        const percentage = `${(delta * 100).toFixed(2)}%`;

        if (delta > ALERT_THRESHOLD) {
          warn(`${comparisonDescription} ${
              comparisonConstraints} decreased by ${percentage}!`);
        } else if (Math.abs(delta) > 0) {
          const changeDescription = delta > 0 ? 'decreased' : 'increased';

          console.log(`🔍 ${comparisonDescription} ${comparisonConstraints} ${
              changeDescription} by ${percentage}`);
        }
      }
    }

    goldenGoldenMap.delete(candidateGolden.name);
  }

  goldenScenarioMap.delete(name);
}

exit();
