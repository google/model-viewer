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

import { SSAOEffect } from 'postprocessing';
import { $updateProperties, $effectOptions, MVEffectBase } from './mixins/effect-base.js';
import { property } from 'lit/decorators.js';
import { TEMP_CAMERA } from './utilities.js';
import { $setDefaultProperties } from './mixins/blend-mode.js';

export class MVSSAOEffect extends MVEffectBase {
  static get is() {
    return 'ssao-effect';
  }

  /**
   * The strength of the shadow occlusions. Higher value means darker shadows.
   */
  @property({ type: Number, attribute: 'strength', reflect: true })
  strength: number = 2;

  constructor() {
    super();
    this.effects = [new SSAOEffect(TEMP_CAMERA, undefined, this[$effectOptions])];
    this.effects[0].requireNormals = true;
  }

  connectedCallback(): void {
    super.connectedCallback && super.connectedCallback();
    this[$setDefaultProperties]();
    this[$updateProperties]();
  }

  update(changedProperties: Map<string | number | symbol, any>): void {
    super.update && super.update(changedProperties);
    if (changedProperties.has('strength')) {
      this[$updateProperties]();
    }
  }

  [$updateProperties](): void {
    (this.effects[0] as SSAOEffect).intensity = this.strength;
    this.effectComposer.queueRender();
  }

  [$setDefaultProperties]() {
    super[$setDefaultProperties]();
    (this.effects[0] as SSAOEffect).normalBuffer = this.effectComposer.normalBuffer;
  }

  get [$effectOptions]() {
    return {
      worldDistanceThreshold: 1000,
      worldDistanceFalloff: 1000,
      worldProximityThreshold: 1000,
      worldProximityFalloff: 1000,
      luminanceInfluence: 0.7,
      samples: 16,
      fade: 0.05,
      radius: 0.05,
      intensity: this.strength,
    } as ConstructorParameters<typeof SSAOEffect>[2];
  }
}
