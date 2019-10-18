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

const $time = Symbol('time');
const $duration = Symbol('duration');

/**
 * The Timer class can be used power delays and animations
 */
export class Timer {
  /**
   * total time incremented by the tick method. time is initialized to 0
   */
  get time(): number {
    return this[$time];
  }

  /**
   * a calculation of `time / duration` which can be used for animations
   */
  get timeScale(): number {
    return this[$time] / this[$duration];
  }

  /**
   * duration of the timer
   */
  get duration(): number {
    return this[$duration];
  }

  /**
   * whether the timer has run fully or stop has been called
   */
  get hasStopped(): boolean {
    return this[$time] >= this[$duration];
  }

  private[$time]: number;
  private[$duration]: number;

  /**
   * Creates a new timer
   *
   * @param duration the total duration for the timer
   */
  constructor(duration: number) {
    this[$duration] = duration;
    this[$time] = 0;
  }

  /**
   * reset the time back to 0
   */
  reset(): void {
    this[$time] = 0;
  }

  /**
   * sets time to duration meaning the timer has completed and hasStopped will
   * return true
   */
  stop(): void {
    this[$time] = this[$duration];
  }

  /**
   * pass deltaTime to the tick method to tick/increment the timer forward
   *
   * @param deltaTime delta time since last tick was called
   */
  tick(deltaTime: number) {
    this[$time] += deltaTime;

    if (this.time >= this[$duration]) {
      this[$time] = this[$duration];
    }
  }
}
