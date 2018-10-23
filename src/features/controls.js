import {PerspectiveCamera, Vector3} from 'three';

import OrbitControls from '../../third_party/three/OrbitControls.js';
import {BooleanComponent} from '../component.js';
import {$updateFeatures, $updateSize} from '../xr-model-element.js';

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
