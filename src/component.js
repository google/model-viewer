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

const $element = Symbol('element');

/**
 * A basic component holds a value
 */
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

/**
 * A boolean component has the notion of being
 * enabled
 */
export class BooleanComponent extends Component {
  get enabled() {
    return this.value !== null;
  }
}

/**
 * A URL component yields full versions of partial URLs
 */
export class UrlComponent extends Component {
  get fullUrl() {
    return new URL(this.value, window.location.toString()).toString();
  }
}
