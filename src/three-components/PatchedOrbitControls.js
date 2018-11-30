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

import OrbitControls from '../third_party/three/OrbitControls.js';

const $onKeyDown = Symbol('onKeyDown');

const KEYBOARD_ORBIT_INCREMENT = Math.PI / 10;

/**
 * This patched extension of OrbitControls adds automatic support for
 * controlling the orbit of the camera with the keyboard arrows when the
 * element is focused.
 */
export class PatchedOrbitControls extends OrbitControls {
  constructor(...args) {
    super(...args);

    this[$onKeyDown] = (event) => this.onKeyDown(event);
    this.domElement.addEventListener('keydown', this[$onKeyDown]);

    Object.assign(this.keys, {PAGE_UP: 33, PAGE_DOWN: 34});
  }

  dispose() {
    super.dispose();
    this.domElement.removeEventListener('keydown', this[$onKeyDown]);
  }

  onKeyDown(event) {
    let handled = false;

    switch (event.keyCode) {
      case this.keys.PAGE_UP:
        this.zoomIn();
        handled = true;
        break;
      case this.keys.PAGE_DOWN:
        this.zoomOut();
        handled = true;
        break;
      case this.keys.UP:
        this.orbitUp(KEYBOARD_ORBIT_INCREMENT);
        handled = true;
        break;
      case this.keys.BOTTOM:
        this.orbitDown(KEYBOARD_ORBIT_INCREMENT);
        handled = true;
        break;
      case this.keys.LEFT:
        this.orbitLeft(KEYBOARD_ORBIT_INCREMENT);
        handled = true;
        break;
      case this.keys.RIGHT:
        this.orbitRight(KEYBOARD_ORBIT_INCREMENT);
        handled = true;
        break;
    }

    if (handled) {
      event.preventDefault();
      this.update();
    }
  }

  zoomIn() {
    const event = new CustomEvent('wheel');
    event.deltaY = -1;
    this.domElement.dispatchEvent(event);
  }

  zoomOut() {
    const event = new CustomEvent('wheel');
    event.deltaY = 1;
    this.domElement.dispatchEvent(event);
  }

  orbitUp(increment) {
    this.getSphericalDelta().phi += increment;
  }

  orbitDown(increment) {
    this.getSphericalDelta().phi -= increment;
  }

  orbitLeft(increment) {
    this.getSphericalDelta().theta += increment;
  }

  orbitRight(increment) {
    this.getSphericalDelta().theta -= increment;
  }
}
