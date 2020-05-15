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

export const SETTLING_TIME = 10000;  // plenty long enough
const DECAY_MILLISECONDS = 50;
const NATURAL_FREQUENCY = 1 / DECAY_MILLISECONDS;
const NIL_SPEED = 0.0002 * NATURAL_FREQUENCY;

const $velocity = Symbol('velocity');

/**
 * The Damper class is a generic second-order critically damped system that does
 * one linear step of the desired length of time. The only parameter is
 * DECAY_MILLISECONDS, which should be adjustable: TODO(#580). This common
 * parameter makes all states converge at the same rate regardless of scale.
 * xNormalization is a number to provide the rough scale of x, such that
 * NIL_SPEED clamping also happens at roughly the same convergence for all
 * states.
 */
export class Damper {
  private[$velocity]: number = 0;

  update(
      x: number, xGoal: number, timeStepMilliseconds: number,
      xNormalization: number): number {
    if (x == null || xNormalization === 0) {
      return xGoal;
    }
    if (x === xGoal && this[$velocity] === 0) {
      return xGoal;
    }
    if (timeStepMilliseconds < 0) {
      return x;
    }
    // Exact solution to a critically damped second-order system, where:
    // acceleration = NATURAL_FREQUENCY * NATURAL_FREQUENCY * (xGoal - x) -
    // 2 * NATURAL_FREQUENCY * this[$velocity];
    const deltaX = (x - xGoal);
    const intermediateVelocity = this[$velocity] + NATURAL_FREQUENCY * deltaX;
    const intermediateX = deltaX + timeStepMilliseconds * intermediateVelocity;
    const decay = Math.exp(-NATURAL_FREQUENCY * timeStepMilliseconds);
    const newVelocity =
        (intermediateVelocity - NATURAL_FREQUENCY * intermediateX) * decay;
    const acceleration =
        -NATURAL_FREQUENCY * (newVelocity + intermediateVelocity * decay);
    if (Math.abs(newVelocity) < NIL_SPEED * Math.abs(xNormalization) &&
        acceleration * deltaX >= 0) {
      // This ensures the controls settle and stop calling this function instead
      // of asymptotically approaching their goal.
      this[$velocity] = 0;
      return xGoal;
    } else {
      this[$velocity] = newVelocity;
      return xGoal + intermediateX * decay;
    }
  }
}
