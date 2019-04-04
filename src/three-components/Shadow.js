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

import {Mesh, PlaneGeometry, ShadowMaterial,} from 'three';

/**
 * Creates a mesh that can receive and render shadows.
 */
export default class Shadow extends Mesh {
  /**
   * Create a shadow mesh.
   */
  constructor() {
    const geometry = new PlaneGeometry(2000, 2000);
    geometry.rotateX(-Math.PI / 2);

    const material = new ShadowMaterial({
      color: 0x111111,
      opacity: 0.2,
    });

    super(geometry, material);
    this.receiveShadow = true;
    this.name = 'ShadowMesh';
  }
}
