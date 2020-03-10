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

const fs = require('fs').promises;
const {jsTransform} = require('polymer-build/lib/js-transform');

const bundlesToTransform = [
  './dist/model-viewer-umd.js',
  './dist/unit-tests-umd.js',
];

console.log('Generating legacy bundles for IE11 compatibility...');

const transformation = (async () => {
  for (const bundlePath of bundlesToTransform) {
    console.log(' 🚧', bundlePath);
    const file = await fs.readFile(bundlePath);
    const transformed = jsTransform(file.toString('utf8'), {compile: 'es5'});
    await fs.writeFile(
        bundlePath.replace('-umd.js', '-legacy.js'), transformed);
  }
  console.log(' ✅ Legacy bundles finished building successfully!');
})();

transformation.catch(error => {
  console.warn(' 🚨 Error while generating legacy bundles:');
  console.error(error);
});
