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
 * @fileoverview Frequently used run-time checks that will throw upon failure.
 * These should ONLY be used to catch and help diagnose programmer errors - do
 * NOT use them for normal control flow. Unlike asserts, these ARE meant to run
 * in production, not get compiled out.
 */

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
