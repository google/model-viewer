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

import {Damper} from '../../three-components/Damper.js';

const expect = chai.expect;

const ONE_FRAME_DELTA = 1000.0 / 60.0;
const FIFTY_FRAME_DELTA = 50 * ONE_FRAME_DELTA;

suite('Damper', () => {
  let damper: Damper;
  const initial = 5;
  const goal = 2;

  setup(() => {
    damper = new Damper();
  });

  test('converges to goal with large time step without overshoot', () => {
    const moving = damper.update(initial, goal, ONE_FRAME_DELTA, initial);
    const final = damper.update(moving, goal, FIFTY_FRAME_DELTA, initial);
    expect(final).to.be.eql(goal);
  });

  test('stays at initial value for negative time step', () => {
    const final = damper.update(initial, goal, -1 * FIFTY_FRAME_DELTA, initial);
    expect(final).to.be.eql(initial);
  });

  test('converges to goal when normalization is zero', () => {
    const final = damper.update(initial, goal, FIFTY_FRAME_DELTA, 0);
    expect(final).to.be.eql(goal);
  });

  test('negative normalization is the same as positive', () => {
    const final = damper.update(initial, goal, FIFTY_FRAME_DELTA, -initial);
    expect(final).to.be.eql(goal);
  });
});
