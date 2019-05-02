/*
 * Copyright 2019 Google Inc. All Rights Reserved.
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

import Timer from '../../utilities/timer';

const expect = chai.expect;

export default () => {
  suite('Timer', () => {
    test('has not ended by default', () => {
      const timer = new Timer(20);

      expect(timer.hasStopped).to.be.false;
    });

    test('can tick', () => {
      const timer = new Timer(20);

      expect(timer.hasStopped).to.be.false;

      timer.tick(30);
  
      expect(timer.hasStopped).to.be.true;
    });
  
    test('can reset', () => {
      const timer = new Timer(20);

      expect(timer.hasStopped).to.be.false;

      timer.tick(30);
  
      expect(timer.hasStopped).to.be.true;
  
      timer.reset();
  
      expect(timer.hasStopped).to.be.false;
    });

    test('can stop', () => {
      const timer = new Timer(20);

      expect(timer.hasStopped).to.be.false;

      timer.stop();

      expect(timer.hasStopped).to.be.true;
      expect(timer.time).to.equal(20);
      expect(timer.timeScale).to.equal(1);

      timer.reset();

      expect(timer.hasStopped).to.be.false;
    });

    test('can get time', () => {
      const timer = new Timer(20);

      expect(timer.time).to.equal(0);
      expect(timer.timeScale).to.equal(0);

      timer.tick(10);

      expect(timer.time).to.equal(10);
      expect(timer.timeScale).to.equal(0.5);

      timer.tick(10);

      expect(timer.time).to.equal(20);
      expect(timer.timeScale).to.equal(1);

      timer.tick(10);

      expect(timer.time).to.equal(20);
      expect(timer.timeScale).to.equal(1);
    });
  });
};
