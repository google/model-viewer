
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

import ModelViewerElementBase, {$needsRender, $scene, $tick} from '../model-viewer-base.js';
import {Constructor} from '../utils.js';

const Alignment = {
  CENTER: 'center',
  ORIGIN: 'origin'
};

// How much the model will rotate per
// second in radians:
const ROTATION_SPEED = Math.PI / 32;

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

const $updateAlignment = Symbol('updateAlignment');

export const StagingMixin = (ModelViewerElement:
                                 Constructor<ModelViewerElementBase>):
    Constructor<ModelViewerElementBase> => {
      class StagingModelViewerElement extends ModelViewerElement {
        @property({type: Boolean, attribute: 'auto-rotate'})
        autoRotate: boolean = false;

        @property({type: String, attribute: 'align-model'})
        alignModel: string = 'center';

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

          if (this.autoRotate && (this as any)[$scene].model.hasModel()) {
            (this as any)[$scene].pivot.rotation.y +=
                ROTATION_SPEED * delta * 0.001;
            this[$needsRender]();
          }
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
