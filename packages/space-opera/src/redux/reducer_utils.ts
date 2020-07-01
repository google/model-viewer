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
 * istributed under the License is distributed on an 'AS IS' BASIS,
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
