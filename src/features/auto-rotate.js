import {BooleanComponent} from '../component.js';
import {$tick, $updateFeatures} from '../xr-model-element.js';

const $rotateEnabled = Symbol('rotate-enabled');

export const AutoRotateMixin = (XRModelElement) => {
  return class extends XRModelElement {
    static get components() {
      return {...super.components, 'auto-rotate': BooleanComponent};
    }

    [$updateFeatures](modelView, components) {
      super[$updateFeatures](modelView, components);

      const {enabled} = components.get('auto-rotate');

      if (!enabled) {
        this.__modelView.domView.pivot.rotation.set(0, 0, 0);
      }

      this[$rotateEnabled] = enabled;
    }

    [$tick]() {
      super[$tick]();

      if (this[$rotateEnabled]) {
        this.__modelView.domView.pivot.rotation.y += 0.001;
      }
    }
  };
};
