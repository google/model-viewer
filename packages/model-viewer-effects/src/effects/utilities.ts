/* @license
 * Copyright 2023 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { KernelSize } from 'postprocessing';
import { PerspectiveCamera } from 'three';
import { clamp } from '../utilities';
import { MVEffectBase } from './mixins/effect-base.js';

/**
 * Helper function for calculating the Kernel Size
 * @param n Range(0, 6)
 * @returns The relative Kernel Size
 */
export function getKernelSize(n: number): number {
  return Math.round(clamp(n + 1, KernelSize.VERY_SMALL, KernelSize.HUGE + 1)) - 1;
}

export function getComponentName(obj: MVEffectBase): string {
  return '<' + obj.constructor.name.replace('MV', '').split(/(?=[A-Z])/).join('-').toLowerCase() + '>';
}

// Used for effects which require a valid Camera for shader instance
export const TEMP_CAMERA = new PerspectiveCamera();
