/* @license
 * Copyright 2026 Google LLC. All Rights Reserved.
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

import {ReactiveElement} from 'lit';
import {property} from 'lit/decorators.js';

/**
 * Declarative child element for adding multiple models to <model-viewer>.
 */
export class ExtraModelElement extends ReactiveElement {
  static get is() {
    return 'extra-model';
  }

  @property({type: String}) src: string|null = null;

  /**
   * Reference to the underlying scene graph Model wrapper.
   */
  public model?: import('./scene-graph/model.js').Model;

  /**
   * Position offset relative to global origin.
   * Format: "x y z" in meters (e.g., "1 0 -0.5")
   */
  @property({type: String}) offset: string|null = null;

  /**
   * Rotation orientation.
   * Format: "x y z" in degrees or radians (mirroring orientation format).
   */
  @property({type: String}) orientation: string|null = null;

  /**
   * Scale multiplier.
   * Format: "x y z" or single number multiplier.
   */
  @property({type: String}) scale: string|null = null;

  /**
   * Transparently excludes model from AR and casting shadows.
   */
  @property({type: Boolean}) background: boolean = false;

  updated(changedProperties: Map<string|number|symbol, unknown>) {
    super.updated(changedProperties);

    // Whenever attributes change, dispatch a customized event up to
    // <model-viewer>
    if (changedProperties.has('src') || changedProperties.has('offset') ||
        changedProperties.has('orientation') ||
        changedProperties.has('scale') || changedProperties.has('background')) {
      const srcChanged = changedProperties.has('src');

      this.dispatchEvent(new CustomEvent('extra-model-changed', {
        bubbles: true,
        composed: true,
        detail: {
          srcChanged,
          src: this.src,
          offset: this.offset,
          orientation: this.orientation,
          scale: this.scale,
          background: this.background
        }
      }));
    }
  }
}

customElements.define('extra-model', ExtraModelElement);
