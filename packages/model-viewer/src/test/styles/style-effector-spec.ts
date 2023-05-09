/* @license
 * Copyright 2019 Google LLC. All Rights Reserved.
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

import {expect} from '@esm-bundle/chai';

import {parseExpressions} from '../../styles/parsers.js';
import {EnvironmentState, StyleEffector} from '../../styles/style-effector.js';
import {dispatchSyntheticEvent} from '../helpers.js';

const triggerEnvironmentEffect = (type: EnvironmentState) => {
  switch (type) {
    case 'window-scroll':
      dispatchSyntheticEvent(window, 'scroll');
      break;
  }
};

suite('StyleEffector', () => {
  test('never invokes its callback for constant styles', () => {
    let callbackInvoked = false;
    const styleEffector = new StyleEffector(() => {
      callbackInvoked = true;
    });

    styleEffector.observeEffectsFor(parseExpressions('123px calc(4 * 5%)'));

    triggerEnvironmentEffect('window-scroll');

    expect(callbackInvoked).to.be.false;

    styleEffector.dispose();
  });

  test('invokes its callback for styles that depend on scroll', () => {
    let callbackCount = 0;
    const styleEffector = new StyleEffector(() => {
      callbackCount++;
    });

    styleEffector.observeEffectsFor(
        parseExpressions('123px calc(env(window-scroll-y) * 5%)'));

    triggerEnvironmentEffect('window-scroll');

    expect(callbackCount).to.be.equal(1);

    styleEffector.dispose();
  });
});