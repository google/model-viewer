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


/**
 * Helper function for updating a single entry in an array.
 */
export function immutableArrayUpdate<T>(array: T[], index: number, value: T) {
  const clone = [...array];
  if (value === clone[index]) {
    throw new Error(
        'Tried to update array with the same object - do not update in place!');
  }
  clone[index] = value;
  return clone;
}

/**
 * Helper function to update a map entry in an array.
 */
export function immutableMapUpdate<K, V>(map: Map<K, V>, key: K, value: V) {
  const clone = new Map(map);
  clone.set(key, value);
  return clone;
}

/**
 * Throws if the given number is not finite. Returns the value otherwise. You
 * should only use this to catch programmer errors, so do NOT use this to
 * validate user input. Just use isFinite directly in those cases.
 */
export function checkFinite(value: number) {
  if (!isFinite(value)) {
    throw new Error('Number was not finite');
  }
  return value;
}

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