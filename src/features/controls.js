/*
 * Copyright 2018 Google Inc. All Rights Reserved.
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

import {PerspectiveCamera, Vector3} from 'three';

import OrbitControls from '../../third_party/three/OrbitControls.js';
import {BooleanComponent} from '../component.js';
import {$updateFeatures, $updateSize} from '../xr-model-element-base.js';

const $controls = Symbol('controls');
const $orbitCamera = Symbol('orbitCamera');
const $defaultCamera = Symbol('defaultCamera');

export const ControlsMixin = (XRModelElement) => {
  return class extends XRModelElement {
    static get components() {
      return {...super.components, 'controls': BooleanComponent};
    }

    constructor() {
      super();

      const {width, height} = this.getBoundingClientRect();

      this[$orbitCamera] = new PerspectiveCamera(45, width / height, 0.1, 100);
      this.__modelView.domView.pivot.add(this[$orbitCamera]);

      this[$controls] =
          new OrbitControls(this[$orbitCamera], this.__canvasElement);
      this[$controls].target = new Vector3(0, 5, 0);

      // Disable by default
      this[$controls].enabled = false;

      this[$defaultCamera] = this.__modelView.domView.camera;
    }

    [$updateFeatures](modelView, components) {
      super[$updateFeatures](modelView, components);

      const {enabled} = components.get('controls');

      this[$controls].enabled = enabled;

      if (enabled) {
        this[$orbitCamera].position.set(0, 5, 15);
        this[$orbitCamera].rotation.set(0, 0, 0);

        this.__modelView.domView.camera = this[$orbitCamera];
      } else {
        this.__modelView.domView.camera = this[$defaultCamera];
      }
    }

    [$updateSize](size, forceApply) {
      super[$updateSize](size, forceApply);

      const {width, height} = size;

      this[$orbitCamera].aspect = width / height;
      this[$orbitCamera].updateProjectionMatrix();
    }
  };
};
