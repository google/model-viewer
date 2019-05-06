
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

import {property} from 'lit-element';

import ModelViewerElementBase, {$needsRender, $scene, $tick, $onUserModelOrbit} from '../model-viewer-base.js';
import {Constructor, Timer} from '../utilities.js';

const Alignment = {
  CENTER: 'center',
  ORIGIN: 'origin'
};

// How much the model will rotate per
// second in radians:
const ROTATION_SPEED = Math.PI / 32;
const AUTO_ROTATE_DELAY_AFTER_USER_INTERACTION = 3000;

const UNBOUNDED_WHITESPACE_RE = /\s+/;

const alignmentToMaskValues = (alignmentString: string) => {
  const alignments = alignmentString.split(UNBOUNDED_WHITESPACE_RE);
  const maskValues = [];
  let firstAlignment;

  for (let i = 0; i < 3; ++i) {
    const alignment = alignments[i];

    if (alignment != null && firstAlignment == null) {
      firstAlignment = alignment;
    }

    switch (alignment || firstAlignment) {
      default:
      case Alignment.CENTER:
        maskValues.push(1.0);
        break;
      case Alignment.ORIGIN:
        maskValues.push(0.0);
        break;
    }
  }

  return maskValues;
};

const $autoRotateTimer = Symbol('autoRotateTimer');
const $updateAlignment = Symbol('updateAlignment');

export {
  AUTO_ROTATE_DELAY_AFTER_USER_INTERACTION
};

export const StagingMixin = (ModelViewerElement:
                                 Constructor<ModelViewerElementBase>):
    Constructor<ModelViewerElementBase> => {
      class StagingModelViewerElement extends ModelViewerElement {
        @property({type: Boolean, attribute: 'auto-rotate'})
        autoRotate: boolean = false;

        @property({type: String, attribute: 'align-model'})
        alignModel: string = 'center';

        private [$autoRotateTimer]: Timer;

        constructor() {
          super();

          this[$autoRotateTimer] = new Timer(AUTO_ROTATE_DELAY_AFTER_USER_INTERACTION);
        }

        connectedCallback() {
          super.connectedCallback();
          this[$autoRotateTimer].stop();
        }

        disconnectedCallback() {
          super.disconnectedCallback();
          this[$autoRotateTimer].stop();
        }

        updated(changedProperties: Map<string, any>) {
          super.updated(changedProperties);

          if (changedProperties.has('alignModel')) {
            this[$updateAlignment]();
          }

          if (changedProperties.has('autoRotate')) {
            (this as any)[$scene].pivot.rotation.set(0, 0, 0);
            this[$needsRender]();
          }
        }

        [$tick](time: number, delta: number) {
          super[$tick](time, delta);

          if (!this.autoRotate || !this.modelIsVisible) {
            return;
          }

          this[$autoRotateTimer].tick(delta);

          if (this[$autoRotateTimer].hasStopped) {
            (this as any)[$scene].pivot.rotation.y += ROTATION_SPEED * delta * 0.001;
            this[$needsRender]();
          }
        }

        [$onUserModelOrbit]() {
          super[$onUserModelOrbit]();

          if (!this.autoRotate) {
            return;
          }

          this[$autoRotateTimer].reset();
        }

        [$updateAlignment]() {
          const {alignModel} = this;
          const alignmentMaskValues = alignmentToMaskValues(alignModel);

          (this as any)[$scene].setModelAlignmentMask(...alignmentMaskValues);
        }

        get turntableRotation(): number {
          return (this as any)[$scene].pivot.rotation.y;
        }
      }

      return StagingModelViewerElement;
    };
