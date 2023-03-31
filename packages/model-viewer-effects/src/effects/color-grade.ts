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
import { BlendFunction, BrightnessContrastEffect, HueSaturationEffect } from 'postprocessing';
import { clamp, wrapClamp } from '../utilities.js';
import { $updateProperties, MVEffectBase } from './mixins/effect-base.js';

const TWO_PI = Math.PI * 2;

export class MVColorGradeEffect extends MVEffectBase {
  static get is() {
    return 'color-grade-effect';
  }

  /**
   * Value in the range of (-1, 1).
   */
  @property({ type: String || Number, attribute: 'brightness', reflect: true })
  brightness = 0;

  /**
   * Value in the range of (-1, 1).
   */
  @property({ type: Number, attribute: 'contrast', reflect: true })
  contrast = 0;

  /**
   * Value in the range of (-1, 1).
   */
  @property({ type: Number, attribute: 'saturation', reflect: true })
  saturation = 0;

  /**
   * Value in the range of (0, 2 * PI).
   *
   * This property is wrapping, meaning that if you set it above the max it resets to the minimum and vice-versa.
   */
  @property({ type: Number, attribute: 'hue', reflect: true })
  hue = 0;

  constructor() {
    super();
    this.effects = [
      new HueSaturationEffect({
        hue: clamp(this.hue, 0, TWO_PI),
        saturation: clamp(this.saturation, -1, 1),
        blendFunction: BlendFunction.SRC,
      }),
      new BrightnessContrastEffect({
        brightness: clamp(this.brightness, -1, 1),
        contrast: clamp(this.contrast, -1, 1),
        blendFunction: BlendFunction.SRC,
      }),
    ];
  }

  connectedCallback(): void {
    super.connectedCallback && super.connectedCallback();
    this[$updateProperties]();
  }

  updated(changedProperties: Map<string | number | symbol, any>) {
    super.updated(changedProperties);
    if (
      changedProperties.has('brightness') ||
      changedProperties.has('contrast') ||
      changedProperties.has('hue') ||
      changedProperties.has('saturation')
    ) {
      this[$updateProperties]();
    }
  }

  [$updateProperties]() {
    this.hue = wrapClamp(this.hue, 0, TWO_PI);
    this.saturation = clamp(this.saturation, -1, 1);
    this.brightness = clamp(this.brightness, -1, 1);
    this.contrast = clamp(this.contrast, -1, 1);
    (this.effects[0] as HueSaturationEffect).saturation = this.saturation;
    (this.effects[0] as HueSaturationEffect).hue = this.hue;
    (this.effects[1] as BrightnessContrastEffect).brightness = this.brightness;
    (this.effects[1] as BrightnessContrastEffect).contrast = this.contrast;
    this.effectComposer?.queueRender();
  }
}
