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
import { BlendFunction, BrightnessContrastEffect, HueSaturationEffect, ToneMappingEffect } from 'postprocessing';
import { clamp, validateLiteralType, wrapClamp } from '../utilities.js';
import { $updateProperties, MVEffectBase } from './mixins/effect-base.js';
import { ToneMappingMode as PPToneMappingMode } from 'postprocessing';
import { $effectComposer, $tonemapping } from '../effect-composer.js';
import { ACESFilmicToneMapping, NoToneMapping } from 'three';

const TWO_PI = Math.PI * 2;

export type ToneMappingMode = keyof typeof PPToneMappingMode;;
export const TONEMAPPING_MODES = Object.keys(PPToneMappingMode) as ToneMappingMode[];

export class MVColorGradeEffect extends MVEffectBase {
  static get is() {
    return 'color-grade-effect';
  }

  /**
   * `reinhard | reinhard2 | reinhard_adaptive | optimized_cineon | aces_filmic | linear`
   * @default 'aces_filmic'
   */
  @property({ type: String, attribute: 'tonemapping', reflect: true})
  tonemapping: ToneMappingMode = 'ACES_FILMIC'

  /**
   * Value in the range of (-1, 1).
   */
  @property({ type: Number, attribute: 'brightness', reflect: true })
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
      new ToneMappingEffect({
        mode: PPToneMappingMode.ACES_FILMIC,
      }),
      new HueSaturationEffect({
        hue: wrapClamp(this.hue, 0, TWO_PI),
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
      changedProperties.has('tonemapping') ||
      changedProperties.has('brightness') ||
      changedProperties.has('contrast') ||
      changedProperties.has('hue') ||
      changedProperties.has('saturation') ||
      changedProperties.has('blendMode')
    ) {
      this[$updateProperties]();
    }
  }

  [$updateProperties]() {
    if (this.blendMode === 'SKIP') {
      this.effectComposer[$effectComposer][$tonemapping] = ACESFilmicToneMapping;
    } else {
      this.effectComposer[$effectComposer][$tonemapping] = NoToneMapping;
    }
    this.saturation = clamp(this.saturation, -1, 1);
    this.hue = wrapClamp(this.hue, 0, TWO_PI);
    this.brightness = clamp(this.brightness, -1, 1);
    this.contrast = clamp(this.contrast, -1, 1);
    (this.effects[1] as HueSaturationEffect).saturation = this.saturation;
    (this.effects[1] as HueSaturationEffect).hue = this.hue;
    (this.effects[2] as BrightnessContrastEffect).brightness = this.brightness;
    (this.effects[2] as BrightnessContrastEffect).contrast = this.contrast;
    try {
      this.tonemapping = this.tonemapping.toUpperCase() as ToneMappingMode;
      validateLiteralType(TONEMAPPING_MODES, this.tonemapping);
      (this.effects[0] as ToneMappingEffect).mode = PPToneMappingMode[this.tonemapping];
    } finally {
      this.effectComposer.queueRender();
    }
  }
}
