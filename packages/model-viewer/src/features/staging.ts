
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

import {property} from 'lit/decorators.js';

import {style} from '../decorators.js';
import ModelViewerElementBase, {$getModelIsVisible, $renderer, $scene, $tick} from '../model-viewer-base.js';
import {degreesToRadians} from '../styles/conversions.js';
import {EvaluatedStyle, Intrinsics} from '../styles/evaluators.js';
import {numberNode, NumberNode} from '../styles/parsers.js';
import {Constructor} from '../utilities.js';

import {CameraChangeDetails} from './controls.js';


// How much the model will rotate per
// second in radians:
const DEFAULT_ROTATION_SPEED = Math.PI / 32;
export const AUTO_ROTATE_DELAY_DEFAULT = 3000;

const rotationRateIntrinsics = {
  basis:
      [degreesToRadians(numberNode(DEFAULT_ROTATION_SPEED, 'rad')) as
       NumberNode<'rad'>],
  keywords: {auto: [null]}
};

const $autoRotateStartTime = Symbol('autoRotateStartTime');
const $radiansPerSecond = Symbol('radiansPerSecond');
const $syncRotationRate = Symbol('syncRotationRate');
const $onCameraChange = Symbol('onCameraChange');

export declare interface StagingInterface {
  autoRotate: boolean;
  autoRotateDelay: number;
  readonly turntableRotation: number;
  resetTurntableRotation(theta?: number): void;
}

export const StagingMixin = <T extends Constructor<ModelViewerElementBase>>(
    ModelViewerElement: T): Constructor<StagingInterface>&T => {
  class StagingModelViewerElement extends ModelViewerElement {
    @property({type: Boolean, attribute: 'auto-rotate'})
    autoRotate: boolean = false;

    @property({type: Number, attribute: 'auto-rotate-delay'})
    autoRotateDelay: number = AUTO_ROTATE_DELAY_DEFAULT;

    @style(
        {intrinsics: rotationRateIntrinsics, updateHandler: $syncRotationRate})
    @property({type: String, attribute: 'rotation-per-second'})
    rotationPerSecond: string = 'auto';

    private[$autoRotateStartTime] = performance.now();
    private[$radiansPerSecond] = 0;

    connectedCallback() {
      super.connectedCallback();
      this.addEventListener(
          'camera-change', this[$onCameraChange] as EventListener);
      this[$autoRotateStartTime] = performance.now();
    }

    disconnectedCallback() {
      super.disconnectedCallback();
      this.removeEventListener(
          'camera-change', this[$onCameraChange] as EventListener);
      this[$autoRotateStartTime] = performance.now();
    }

    updated(changedProperties: Map<string, any>) {
      super.updated(changedProperties);

      if (changedProperties.has('autoRotate')) {
        this[$autoRotateStartTime] = performance.now();
      }
    }

    [$syncRotationRate](style: EvaluatedStyle<Intrinsics<['rad']>>) {
      this[$radiansPerSecond] = style[0];
    }

    [$tick](time: number, delta: number) {
      super[$tick](time, delta);

      if (!this.autoRotate || !this[$getModelIsVisible]() ||
          this[$renderer].isPresenting) {
        return;
      }

      const rotationDelta = Math.min(
          delta, time - this[$autoRotateStartTime] - this.autoRotateDelay);

      if (rotationDelta > 0) {
        this[$scene].yaw = this.turntableRotation +
            this[$radiansPerSecond] * rotationDelta * 0.001;
      }
    }

    [$onCameraChange] = (event: CustomEvent<CameraChangeDetails>) => {
      if (!this.autoRotate) {
        return;
      }

      if (event.detail.source === 'user-interaction') {
        this[$autoRotateStartTime] = performance.now();
      }
    };

    get turntableRotation(): number {
      return this[$scene].yaw;
    }

    resetTurntableRotation(theta = 0) {
      this[$scene].yaw = theta;
    }
  }

  return StagingModelViewerElement;
};
