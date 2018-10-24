import {UrlComponent} from '../component.js';
import {$updateFeatures} from '../xr-model-element.js';

const $posterElement = Symbol('posterElement');
const $clickToViewElement = Symbol('clickToViewElement');

export const PosterMixin = (XRModelElement) => {
  return class extends XRModelElement {
    static get components() {
      return {...super.components, 'poster': UrlComponent};
    }

    constructor() {
      super();

      // TODO: Add this to the shadow root as part of this mixin's
      // implementation:
      this[$posterElement] = this.shadowRoot.querySelector('.poster');
      this[$clickToViewElement] =
          this.shadowRoot.querySelector('.click-to-view');
      this.addEventListener('click', () => this.hidePoster());
      this.__modelView.addEventListener('model-load', () => this.hidePoster());
    }

    hidePoster() {
      this[$posterElement].classList.remove('show');
      this[$clickToViewElement].classList.remove('show');
    }

    [$updateFeatures](modelView, components) {
      super[$updateFeatures](modelView, components);

      const {fullUrl: src} = components.get('poster');

      if (src) {
        if (!this.__loaded && !this.__userInput) {
          this[$posterElement].classList.add('show');
          this[$clickToViewElement].classList.add('show');
        }
        this[$posterElement].style.backgroundImage = `url("${src}")`;
      } else {
        this[$posterElement].style.backgroundImage = '';
        this.hidePoster();
      }
    }
  };
}
