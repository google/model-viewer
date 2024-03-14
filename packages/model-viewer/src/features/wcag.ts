/* @license
 * Copyright 2024 Google LLC. All Rights Reserved.
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

import {property} from 'lit/decorators.js';

import ModelViewerElementBase, { $updateStatus, $scene, $userInputElement } from '../model-viewer-base.js';

import {Constructor} from '../utilities.js';
import { SmoothControls } from '../three-components/SmoothControls.js';
import { PerspectiveCamera, Spherical } from 'three';
import { $controls, CameraChangeDetails } from './controls.js';

export interface A11yTranslationsInterface {
  left: string;
  right: string;
  front: string;
  back: string;
  'upper-left': string;
  'upper-right': string;
  'upper-front': string;
  'upper-back': string;
  'lower-left': string;
  'lower-right': string;
  'lower-front': string;
  'lower-back': string;
}

export declare interface WcagInterface {
  a11y: A11yTranslationsInterface | string | null;
}

const HALF_PI = Math.PI / 2.0;
const THIRD_PI = Math.PI / 3.0;
const QUARTER_PI = HALF_PI / 2.0;
const TAU = 2.0 * Math.PI;

const AZIMUTHAL_QUADRANT_LABELS = ['front', 'right', 'back', 'left'];
const POLAR_TRIENT_LABELS = ['upper-', '', 'lower-'];

const $updateAria = Symbol('updateAria');
const $lastSpherical = Symbol('lastSpherical');
const $onCameraChange = Symbol('onCameraChange');
const $a11y = Symbol('a11y');

export const WcagMixin = <T extends Constructor<ModelViewerElementBase>>(
  ModelViewerElement:
      T): Constructor<WcagInterface>&T => {
class WcagModelViewerElement extends ModelViewerElement {
  @property({type: String}) a11y: A11yTranslationsInterface|string|null = null;

  protected[$controls] = new SmoothControls(
    this[$scene].camera as PerspectiveCamera, this[$userInputElement],
    this[$scene]);
  protected[$lastSpherical] = new Spherical();
  protected[$a11y] = {} as A11yTranslationsInterface;


  connectedCallback() {
    super.connectedCallback();
    this.addEventListener(
        'camera-change', this[$onCameraChange] as EventListener);

    this.loadA11y();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener(
        'camera-change', this[$onCameraChange] as EventListener);
  }

  [$onCameraChange] = (event: CustomEvent<CameraChangeDetails>) => {
    if (event.detail.source === 'user-interaction') {
      this[$updateAria]();
    }
  };

  [$updateAria]() {
    const {theta, phi} =
        this[$controls]!.getCameraSpherical(this[$lastSpherical]);

    const azimuthalQuadrant =
        (4 + Math.floor(((theta % TAU) + QUARTER_PI) / HALF_PI)) % 4;

    const polarTrient = Math.floor(phi / THIRD_PI);

    const azimuthalQuadrantLabel =
        AZIMUTHAL_QUADRANT_LABELS[azimuthalQuadrant];
    const polarTrientLabel = POLAR_TRIENT_LABELS[polarTrient];
    const position = `${polarTrientLabel}${azimuthalQuadrantLabel}`;

    const key = position as keyof A11yTranslationsInterface;
    if (key in this[$a11y]) {
      this[$updateStatus](this[$a11y][key]);
    } else {
      this[$updateStatus](
          `View from stage ${position}`);
    }
  }

  private async loadA11y() {
    if (typeof this.a11y === 'string') {
      try {
        this[$a11y] = await (await fetch(this.a11y)).json();;
      } catch (error) {
        console.warn('Error loading a11y JSON:', error);
      }
    } else if (this.a11y != null) {
      this[$a11y] = this.a11y;
    }
  }

}

return WcagModelViewerElement;
};