
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

import {property} from 'lit-element';

import ModelViewerElementBase, {$needsRender, $scene, $tick} from '../model-viewer-base.js';
import {Constructor} from '../utilities.js';
import {Timer} from '../utilities/timer.js';

import {CameraChangeDetails} from './controls.js';

// How much the model will rotate per
// second in radians:
const ROTATION_SPEED = Math.PI / 32;
export const AUTO_ROTATE_DELAY_DEFAULT = 3000;

const $autoRotateTimer = Symbol('autoRotateTimer');
const $cameraChangeHandler = Symbol('cameraChangeHandler');
const $onCameraChange = Symbol('onCameraChange');

export declare interface StagingInterface {
  autoRotate: boolean;
  autoRotateDelay: number;
  readonly turntableRotation: number;
  resetTurntableRotation(): void;
}

export const StagingMixin = <T extends Constructor<ModelViewerElementBase>>(
    ModelViewerElement: T): Constructor<StagingInterface>&T => {
  class StagingModelViewerElement extends ModelViewerElement {
    @property({type: Boolean, attribute: 'auto-rotate'})
    autoRotate: boolean = false;

    @property({type: Number, attribute: 'auto-rotate-delay'})
    autoRotateDelay: number = AUTO_ROTATE_DELAY_DEFAULT;

    private[$autoRotateTimer]: Timer = new Timer(this.autoRotateDelay);
    private[$cameraChangeHandler] = (event: CustomEvent<CameraChangeDetails>) =>
        this[$onCameraChange](event);

    connectedCallback() {
      super.connectedCallback();
      this.addEventListener(
          'camera-change', this[$cameraChangeHandler] as EventListener);
      this[$autoRotateTimer].stop();
    }

    disconnectedCallback() {
      super.disconnectedCallback();
      this.removeEventListener(
          'camera-change', this[$cameraChangeHandler] as EventListener);
      this[$autoRotateTimer].stop();
    }

    updated(changedProperties: Map<string, any>) {
      super.updated(changedProperties);

      if (changedProperties.has('autoRotate')) {
        this[$needsRender]();
      }

      if (changedProperties.has('autoRotateDelay')) {
        const timer = new Timer(this.autoRotateDelay);
        timer.tick(this[$autoRotateTimer].time);
        if (timer.hasStopped) {
          timer.reset();
        }
        this[$autoRotateTimer] = timer;
      }
    }

    [$tick](time: number, delta: number) {
      super[$tick](time, delta);

      if (!this.autoRotate || !this.modelIsVisible) {
        return;
      }

      this[$autoRotateTimer].tick(delta);

      if (this[$autoRotateTimer].hasStopped) {
        this[$scene].setPivotRotation(
            this[$scene].getPivotRotation() + ROTATION_SPEED * delta * 0.001);
        this[$needsRender]();
      }
    }

    [$onCameraChange](event: CustomEvent<CameraChangeDetails>) {
      if (!this.autoRotate) {
        return;
      }

      if (event.detail.source === 'user-interaction') {
        this[$autoRotateTimer].reset();
      }
    }

    get turntableRotation(): number {
      return this[$scene].getPivotRotation();
    }

    resetTurntableRotation() {
      this[$scene].setPivotRotation(0);
      this[$needsRender]();
    }
  }

  return StagingModelViewerElement;
};
