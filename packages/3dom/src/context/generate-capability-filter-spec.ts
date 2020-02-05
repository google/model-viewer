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

import {generateCapabilityFilter} from './generate-capability-filter.js';

suite('context/generate-capability-filter', () => {
  suite('generateCapabilityFilter', () => {
    test('yields a string of JS that can be evaluated', () => {
      const implementationString = generateCapabilityFilter([]);
      expect(implementationString.length).to.be.greaterThan(0);
      const fn = new Function(implementationString);
      expect(fn).to.be.ok;
    });

    suite('specifying capabilities', () => {
      test('explicitly disallows omitted capabilities', () => {
        const implementationString = generateCapabilityFilter([]);
        expect(implementationString).to.match(/function filterFetch/);
        expect(implementationString).to.match(/function filterMessaging/);
        expect(implementationString)
            .to.match(/function filterMaterialProperties/);
      });

      test('allows configured capabilities', () => {
        const implementationString = generateCapabilityFilter(['messaging']);
        expect(implementationString).to.match(/function filterFetch/);
        expect(implementationString).not.to.match(/function filterMessaging/);
        expect(implementationString)
            .to.match(/function filterMaterialProperties/);
      });
    });
  });
});
