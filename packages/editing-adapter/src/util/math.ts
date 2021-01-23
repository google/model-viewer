/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
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
 *
 */

/** Convert degrees to radians */
export function degToRad(degrees: number): number {
  return degrees * Math.PI / 180.0;
}

/** Convert radians to degrees */
export function radToDeg(radians: number): number {
  return radians * 180.0 / Math.PI;
}

/** Clamps 'value' to be within [lowerLimit, upperLimit] */
export function clamp(value: number, lowerLimit: number, upperLimit: number) {
  return Math.min(Math.max(value, lowerLimit), upperLimit);
}

/** Round to the given number of significant figures (digits) */
export function roundToDigits(value: number, digits: number): number {
  if (value === 0) {
    return 0;
  }
  const x =
      10 ** (Math.floor(digits) - Math.floor(Math.log10(Math.abs(value))) - 1);
  return Math.round(value * x) / x;
}