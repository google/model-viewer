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

import { property } from 'lit/decorators.js';
import { BlendFunction, SelectiveBloomEffect } from 'postprocessing';
import { $updateProperties, $effectOptions, MVEffectBase } from './mixins/effect-base.js';
import { SelectiveMixin } from './mixins/selective.js';
import { TEMP_CAMERA } from './utilities.js';

export class MVSelectiveBloomEffect extends SelectiveMixin(MVEffectBase) {
  static get is() {
    return 'selective-bloom-effect';
  }

  /**
   * The strength of the bloom effect.
   */
  @property({ type: Number, attribute: 'strength', reflect: true })
  strength = 1;

  /**
   * Value in the range of (0, 1). Pixels with a brightness above this will bloom.
   */
  @property({ type: Number, attribute: 'threshold', reflect: true })
  threshold = 0.85;

  /**
   * Value in the range of (0, 1).
   */
  @property({ type: Number, attribute: 'smoothing', reflect: true })
  smoothing = 0.025;

  /**
   * Value in the range of (0, 1).
   */
  @property({ type: Number, attribute: 'radius', reflect: true })
  radius = 0.85;

  constructor() {
    super();

    this.effects = [new SelectiveBloomEffect(undefined, TEMP_CAMERA, this[$effectOptions])];
  }

  connectedCallback(): void {
    super.connectedCallback && super.connectedCallback();
    this[$updateProperties]();
  }

  updated(changedProperties: Map<string | number | symbol, any>) {
    super.updated(changedProperties);
    if (
      changedProperties.has('strength') ||
      changedProperties.has('threshold') ||
      changedProperties.has('smoothing') ||
      changedProperties.has('radius')
    ) {
      this[$updateProperties]();
    }
  }

  [$updateProperties](): void {
    (this.effects[0] as SelectiveBloomEffect).luminanceMaterial.threshold = this.threshold;
    (this.effects[0] as SelectiveBloomEffect).luminanceMaterial.smoothing = this.smoothing;
    (this.effects[0] as SelectiveBloomEffect).intensity = this.strength;
    (this.effects[0] as any).mipmapBlurPass.radius = this.radius;
    this.effectComposer.queueRender();
  }

  get [$effectOptions]() {
    return {
      blendFunction: BlendFunction.ADD,
      mipmapBlur: true,
      radius: this.radius,
      luminanceThreshold: this.threshold,
      luminanceSmoothing: this.smoothing,
      intensity: this.strength,
    } as ConstructorParameters<typeof SelectiveBloomEffect>[2];
  }
}
