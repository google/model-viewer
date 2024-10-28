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

import {expect} from 'chai';

import {waitForEvent} from '../../utilities.js';
import {Activity, ProgressDetails, ProgressTracker} from '../../utilities/progress-tracker.js';

suite('ProgressTracker', () => {
  const progressReason = 'progress-test';

  let progressTracker: ProgressTracker;
  setup(() => {
    progressTracker = new ProgressTracker();
  });

  test('starts out with zero ongoing activities', () => {
    expect(progressTracker.ongoingActivityCount).to.be.equal(0);
  });

  test('event includes the reason for the progress', async () => {
    const activity = progressTracker.beginActivity(progressReason);

    const progressEventDispatches =
        waitForEvent<CustomEvent<ProgressDetails>>(progressTracker, 'progress');
    activity(0.5);
    const event = await progressEventDispatches;

    expect(event.detail.reason).to.be.equal(progressReason);
  });

  suite('an activity', () => {
    let firstActivity: Activity;

    setup(() => {
      firstActivity = progressTracker.beginActivity(progressReason);
    });

    test('increases the ongoing activities count', () => {
      expect(progressTracker.ongoingActivityCount).to.be.equal(1);
    });

    suite('with partial progress', () => {
      test(
          'causes the ProgressTracker to dispatch a progress event',
          async () => {
            const progressEventDispatches =
                waitForEvent<CustomEvent<ProgressDetails>>(
                    progressTracker, 'progress');
            firstActivity(0.5);
            const event = await progressEventDispatches;

            expect(event.detail.totalProgress).to.be.equal(0.5);

            const progressEventDispatches2 =
                waitForEvent<CustomEvent<ProgressDetails>>(
                    progressTracker, 'progress');
            firstActivity(0.75);
            const event2 = await progressEventDispatches2;

            expect(event2.detail.totalProgress).to.be.equal(0.75);
          });

      test('only allows progress to advance', () => {
        const initialProgress = firstActivity(0.5);
        const nextProgress = firstActivity(0.2);

        expect(nextProgress).to.be.equal(initialProgress);
      });

      suite('a late-added activity', () => {
        setup(() => {
          firstActivity(0.5);
        });

        test('is added to the current stack of activities', () => {
          progressTracker.beginActivity(progressReason);
          expect(progressTracker.ongoingActivityCount).to.be.equal(2);
        });

        test('defers marking all activities completed', () => {
          progressTracker.beginActivity(progressReason);
          firstActivity(1.0);
          expect(progressTracker.ongoingActivityCount).to.be.equal(2);
        });
      });
    });

    suite('completed', () => {
      test('ProgressTracker dispatches a final progress event', async () => {
        const progressEventDispatches =
            waitForEvent<CustomEvent<ProgressDetails>>(
                progressTracker, 'progress');
        firstActivity(1.0);
        const event: CustomEvent<ProgressDetails> =
            await progressEventDispatches;

        expect(event.detail.totalProgress).to.be.equal(1);
      });

      test('ProgressTracker resets ongoing activity count', () => {
        firstActivity(1.0);
        expect(progressTracker.ongoingActivityCount).to.be.equal(0);
      });
    });

    suite('with another activity', () => {
      let secondActivity: Activity;

      setup(() => {
        secondActivity = progressTracker.beginActivity(progressReason);
      });

      test('increases the ongoing activity count', () => {
        expect(progressTracker.ongoingActivityCount).to.be.equal(2);
      });

      test('each activity progresses independently', () => {
        let firstProgress = firstActivity(0.2);
        let secondProgress = secondActivity(0.1);

        expect(firstProgress).to.be.equal(0.2);
        expect(secondProgress).to.be.equal(0.1);

        secondProgress = secondActivity(1.0);
        firstProgress = firstActivity(0.3);

        expect(firstProgress).to.be.equal(0.3);
        expect(secondProgress).to.be.equal(1.0);
      });

      suite('all activities completed', () => {
        test('ProgressTracker resets ongoing activity count', () => {
          firstActivity(1.0);
          secondActivity(1.0);
          expect(progressTracker.ongoingActivityCount).to.be.equal(0);
        });

        test(
            'ProgressTracker dispatches a final progress event after the last activity is completed',
            async () => {
              secondActivity(1.0);
              const progressEventDispatches =
                  waitForEvent<CustomEvent<ProgressDetails>>(
                      progressTracker, 'progress');
              firstActivity(1.0);
              const event: CustomEvent<ProgressDetails> =
                  await progressEventDispatches;

              expect(event.detail.totalProgress).to.be.equal(1);
            });
      });
    });
  });
});
