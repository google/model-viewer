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

// Running:
// node lut-writer.mjs
// produces: pbrNeutral.cube

import * as fs from 'fs';

const size = 57;
// must match the lg2 vars in config.ocio
const log2Min = -9;
const log2Max = 10;

const text = [
  `TITLE "PBR Neutral sRGB"`,
  `# PBR Neutral sRGB LUT`,
  `DOMAIN_MIN 0 0 0`,
  `DOMAIN_MAX 1 1 1`,
  `LUT_3D_SIZE ${size}`,
];

function clamp(x) {
  return Math.min(Math.max(x, 0), 1);
}

function round(x) {
  return clamp(x).toFixed(7).replace(/\.?0*$/, '');
}

function inverseLog(x) {
  const log2 = (x / (size - 1)) * (log2Max - log2Min) + log2Min;
  return Math.pow(2, log2);
}

function rgb2string(r, g, b) {
  return `${round(r)} ${round(g)} ${round(b)}`;
}

function pbrNeutral(r, g, b) {
  const startCompression = 0.8 - 0.04;
  const desaturation = 0.15;

  // invert the lg2 transform in the OCIO config - used to more evenly-space the
  // LUT points
  let R = inverseLog(r);
  let G = inverseLog(g);
  let B = inverseLog(b);

  const x = Math.min(R, G, B);
  const offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
  R -= offset;
  G -= offset;
  B -= offset;

  const peak = Math.max(R, G, B);
  if (peak < startCompression) {
    return rgb2string(R, G, B);
  }

  const d = 1 - startCompression;
  const newPeak = 1 - d * d / (peak + d - startCompression);
  const scale = newPeak / peak;
  R *= scale;
  G *= scale;
  B *= scale;

  const f = 1 - 1 / (desaturation * (peak - newPeak) + 1);
  R = (1 - f) * R + f;
  G = (1 - f) * G + f;
  B = (1 - f) * B + f;
  return rgb2string(R, G, B);
}

for (let b = 0; b < size; ++b) {
  for (let g = 0; g < size; ++g) {
    for (let r = 0; r < size; ++r) {
      text.push(pbrNeutral(r, g, b));
    }
  }
}
text.push('');

fs.writeFileSync('pbrNeutral.cube', text.join('\n'));