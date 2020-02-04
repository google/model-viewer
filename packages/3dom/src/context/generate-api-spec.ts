/* @license
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
 */

import {generateAPI} from './generate-api.js'

suite('context/generate-api', () => {
  suite('generateAPI', () => {
    test('yields a string of JS that can be evaluated', () => {
      const implementationString = generateAPI();
      expect(implementationString.length).to.be.greaterThan(0);
      const fn = new Function(implementationString);
      expect(fn).to.be.ok;
    });

    test('yields a string that defines 3DOM classes', () => {
      const implementationString = generateAPI();
      expect(implementationString).to.match(/class Model/);
      expect(implementationString).to.match(/class Material/);
      expect(implementationString).to.match(/class PBRMetallicRoughness/);
      expect(implementationString).to.match(/class ThreeDOMElement/);
    });
  });
});