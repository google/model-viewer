const $element = Symbol('element');

export class Component {
  get element() {
    return this[$element];
  }

  constructor(element) {
    this[$element] = element;
    this.value = null;
  }

  /**
   * Called when the components of the model element are updated, usually
   * after an attribute or property has changed.
   * @abstract
   */
  update() {
  }
}

export class BooleanComponent extends Component {
  get enabled() {
    return this.value !== null;
  }
}

export class UrlComponent extends Component {
  get fullUrl() {
    return new URL(this.value, window.location.toString()).toString();
  }
}
