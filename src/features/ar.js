import {BooleanComponent} from '../component.js';
import {getiOSSource, openIOSARQuickLook} from '../utils.js';
import {$updateFeatures} from '../xr-model-element.js';

const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

const $enterARElement = Symbol('enterARElement');

export const ARMixin = (XRModelElement) => {
  return class extends XRModelElement {
    static get components() {
      return {...super.components, 'ar': BooleanComponent};
    }

    constructor() {
      super();

      // TODO: Add this to the shadow root as part of this mixin's
      // implementation:
      this[$enterARElement] = this.shadowRoot.querySelector('.enter-ar');

      this[$enterARElement].addEventListener('click', e => {
        e.preventDefault();
        this.enterAR();
      });
    }

    /**
     * Enables the AR
     */
    enterAR() {
      if (IS_IOS || this.__modelView.hasAR()) {
        const usdzSource = getiOSSource(this);
        if (IS_IOS && usdzSource) {
          openIOSARQuickLook(usdzSource.src);
        } else {
          this.__modelView.enterAR();
        }
      }
    }

    [$updateFeatures](modelView, components) {
      super[$updateFeatures](modelView, components);

      const buttonIsVisible = components.get('ar').enabled;

      // On iOS, always enable the AR button. On non-iOS,
      // see if AR is supported, and if so, display the button after
      // an XRDevice has been initialized
      if (!buttonIsVisible) {
        this[$enterARElement].style.display = 'none';
      } else {
        if (IS_IOS && getiOSSource(this)) {
          this[$enterARElement].style.display = 'block';
        } else if (this.__modelView.hasAR()) {
          this.__modelView.whenARReady().then(
              () => this[$enterARElement].style.display = 'block');
        }
      }
    }
  };
}
