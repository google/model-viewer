/* @license
 * Copyright 2026 Google LLC. All Rights Reserved.
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

import {expect} from 'chai';

import {IOS_THIRDPARTY_USER_AGENT} from '../constants.js';

const IOS_WEBKIT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) ' +
    'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7 Mobile/15E148 ' +
    'Safari/604.1';

suite('IOS_THIRDPARTY_USER_AGENT', () => {
  test('matches the current DuckDuckGo "Ddg/" brand token', () => {
    expect(IOS_THIRDPARTY_USER_AGENT.test(`${IOS_WEBKIT} Ddg/18.7`)).to.be.true;
  });

  test('matches the older "DuckDuckGo/" token', () => {
    expect(IOS_THIRDPARTY_USER_AGENT.test(`${IOS_WEBKIT} DuckDuckGo/7`))
        .to.be.true;
  });

  test('still matches Chrome, Edge, Firefox and Google App on iOS', () => {
    for (const token
             of ['CriOS/120.0', 'EdgiOS/120.0', 'FxiOS/120.0', 'GSA/300.0']) {
      expect(IOS_THIRDPARTY_USER_AGENT.test(`${IOS_WEBKIT} ${token}`))
          .to.be.true;
    }
  });

  test('does not match plain iOS Safari', () => {
    expect(IOS_THIRDPARTY_USER_AGENT.test(IOS_WEBKIT)).to.be.false;
  });
});
