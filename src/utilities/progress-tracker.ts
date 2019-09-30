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

import {clamp} from '../utilities.js';

interface OngoingActivity {
  progress: number;
}
const $ongoingActivities = Symbol('ongoingActivities');
const $announceTotalProgress = Symbol('announceTotalProgress');
const $eventDelegate = Symbol('eventDelegate');

const ACTIVITY_PROGRESS_WEIGHT = 0.5;

/**
 * An Activity is represented by a callback that accepts values from 0 to 1,
 * where 1 represents the completion of the activity. The callback returns the
 * actual progress as it is stored by the ProgressTracker (which may be clamped,
 * and can never be lower than its previous value).
 */
export type Activity = (progress: number) => number;

/**
 * A progress event contains the total progress of all ongoing activities in the
 * ProgressTracker. The progress is a heuristic, should not be considered an
 * absolute representation of progress across any or all events.
 */
export interface ProgressDetails {
  totalProgress: number;
}

/**
 * ProgressTracker is an event emitter that helps to track the ongoing progress
 * of many simultaneous actions.
 *
 * ProgressTracker reports progress activity in the form of a progress event.
 * The event.detail.totalProgress value indicates the elapsed progress of all
 * activities being tracked by the ProgressTracker.
 *
 * The value of totalProgress is a number that progresses from 0 to 1. The
 * ProgressTracker allows for the lazy accumulation of tracked actions, so the
 * total progress represents a abstract, non-absolute progress towards the
 * completion of all currently tracked events.
 *
 * When all currently tracked activities are finished, the ProgressTracker
 * emits one final progress event and then resets the list of its currently
 * tracked activities. This means that from an observer's perspective,
 * ongoing activities will accumulate and collectively contribute to the notion
 * of total progress until all currently tracked ongoing activities have
 * completed.
 */
export class ProgressTracker implements EventTarget {
  // NOTE(cdata): This eventDelegate hack is a quick trick to let us get the
  // EventTarget interface without implementing or requiring a full polyfill. We
  // should remove this once EventTarget is inheritable everywhere.
  protected[$eventDelegate]: DocumentFragment =
      document.createDocumentFragment();

  // NOTE(cdata): We declare each of these methods independently here so that we
  // can inherit the correct types from EventTarget's interface. Maybe there is
  // a better way to do this dynamically so that we don't repeat ourselves?
  public addEventListener: typeof EventTarget.prototype.addEventListener =
      (...args) => this[$eventDelegate].addEventListener(...args);
  public removeEventListener: typeof EventTarget.prototype.removeEventListener =
      (...args) => this[$eventDelegate].removeEventListener(...args);
  public dispatchEvent: typeof EventTarget.prototype.dispatchEvent =
      (...args) => this[$eventDelegate].dispatchEvent(...args);


  protected[$ongoingActivities]: Set<OngoingActivity> = new Set();

  /**
   * The total number of activities currently being tracked.
   */
  get ongoingActivityCount(): number {
    return this[$ongoingActivities].size;
  }

  /**
   * Registers a new activity to be tracked by the progress tracker. The method
   * returns a special callback that should be invoked whenever new progress is
   * ready to be reported. The progress should be reported as a value between 0
   * and 1, where 0 would represent the beginning of the action and 1 would
   * represent its completion.
   *
   * There is no built-in notion of a time-out for ongoing activities, so once
   * an ongoing activity is begun, it is up to the consumer of this API to
   * update the progress until that activity is no longer ongoing.
   *
   * Progress is only allowed to move forward for any given activity. If a lower
   * progress is reported than the previously reported progress, it will be
   * ignored.
   */
  beginActivity(): Activity {
    const activity: OngoingActivity = {progress: 0};

    this[$ongoingActivities].add(activity);

    if (this.ongoingActivityCount === 1) {
      // Announce the first progress event (which should always be 0 / 1
      // total progress):
      this[$announceTotalProgress]();
    }

    return (progress: number): number => {
      let nextProgress: number;

      nextProgress = Math.max(clamp(progress, 0, 1), activity.progress);

      if (nextProgress !== activity.progress) {
        activity.progress = nextProgress;
        this[$announceTotalProgress]();
      }

      return activity.progress;
    };
  }

  [$announceTotalProgress]() {
    let totalProgress = 0;
    let statusCount = 0;
    let completedActivities = 0;

    for (const activity of this[$ongoingActivities]) {
      const {progress} = activity;
      const compoundWeight =
          ACTIVITY_PROGRESS_WEIGHT / Math.pow(2, statusCount++);

      totalProgress += progress * compoundWeight;

      if (progress === 1.0) {
        completedActivities++;
      }
    }

    if (completedActivities === this.ongoingActivityCount) {
      totalProgress = 1.0;
      this[$ongoingActivities].clear();
    }

    this.dispatchEvent(new CustomEvent<ProgressDetails>(
        'progress', {detail: {totalProgress}}));
  }
}
