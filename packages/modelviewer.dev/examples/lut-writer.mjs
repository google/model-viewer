/* @license
 * Copyright 2024 Google Inc. All Rights Reserved.
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

import * as fs from 'fs';

const size = 57;

const text = [
  `TITLE "Commerce sRGB"`,
  `# Commerce sRGB LUT`,
  `DOMAIN_MIN 0 0 0`,
  `DOMAIN_MAX 1 1 1`,
  `LUT_3D_SIZE ${size}`,
];

function round(x) {
  return x.toFixed(7).replace(/\.?0*$/, '');
}

for (let b = 0; b < size; ++b) {
  for (let g = 0; g < size; ++g) {
    for (let r = 0; r < size; ++r) {
      text.push(`${round(r / (size - 1))} ${round(g / (size - 1))} ${
          round(b / (size - 1))}`);
    }
  }
}

fs.writeFileSync('commerce.cube', text.join('\n'));