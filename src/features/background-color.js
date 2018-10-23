import {Color} from 'three';

import {Component} from '../component.js';
import {$updateFeatures} from '../xr-model-element.js';

const DEFAULT_BACKGROUND_COLOR = new Color(0xffffff);

export const BackgroundColorMixin = (XRModelElement) => {
  return class extends XRModelElement {
    static get components() {
      return {...super.components, 'background-color': Component};
    }

    [$updateFeatures](modelView, components) {
      super[$updateFeatures](modelView, components);

      const {renderer} = modelView;
      const color = components.get('background-color').value;

      if (color && typeof color === 'string') {
        renderer.setClearColor(new Color(color));
      } else {
        renderer.setClearColor(DEFAULT_BACKGROUND_COLOR);
      }
    }
  };
};
