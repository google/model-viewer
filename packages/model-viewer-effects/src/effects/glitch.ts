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
import { ChromaticAberrationEffect, GlitchEffect, GlitchMode as Mode } from 'postprocessing';
import { Vector2 } from 'three';
import { clamp, validateLiteralType } from '../utilities.js';
import { $updateProperties, $effectOptions, MVEffectBase } from './mixins/effect-base.js';


export const GLITCH_MODES = ['sporadic', 'constant'] as const;
export type GlitchMode = typeof GLITCH_MODES[number];

export class MVGlitchEffect extends MVEffectBase {
  static get is() {
    return 'glitch-effect';
  }

  /**
   * Value in the range of (0, 1).
   */
  @property({ type: Number, attribute: 'strength', reflect: true })
  strength: number = 0.5;

  /**
   * `sporadic` | `constant`
   * @default 'sporadic'
   */
  @property({ type: String, attribute: 'mode', reflect: true })
  mode: GlitchMode = 'sporadic';

  constructor() {
    super();
    const chromaticAberrationEffect = new ChromaticAberrationEffect();
    const glitchEffect = new GlitchEffect(this[$effectOptions](chromaticAberrationEffect));
    this.effects = [glitchEffect, chromaticAberrationEffect];
    this.effects[1].requireDirtyRender = true;
  }

  connectedCallback() {
    super.connectedCallback && super.connectedCallback();
    this[$updateProperties]();
  }

  updated(changedProperties: Map<string | number | symbol, any>) {
    super.updated(changedProperties);
    if (changedProperties.has('mode') || changedProperties.has('strength')) {
      this[$updateProperties]();
    }
  }

  [$updateProperties](): void {
    this.strength = clamp(this.strength, 0, 1);
    this.mode = this.mode.toLowerCase() as GlitchMode;
    try {
      validateLiteralType(GLITCH_MODES, this.mode);
    } catch(e) {
      console.error((e as Error).message +  + "\nmode defaulting to 'sporadic'")
    }
    if (this.strength == 0) {
      (this.effects[0] as GlitchEffect).columns = 0;
      (this.effects[0] as GlitchEffect).mode = this.mode === 'constant' ? Mode.CONSTANT_MILD : Mode.SPORADIC;
    } else {
      (this.effects[0] as GlitchEffect).columns = 0.06;
      (this.effects[0] as GlitchEffect).mode = this.mode === 'constant' ? Mode.CONSTANT_WILD : Mode.SPORADIC;
    }
    (this.effects[0] as GlitchEffect).maxStrength = this.strength;
    (this.effects[0] as GlitchEffect).ratio = 1 - this.strength;
  }

  [$effectOptions](chromaticAberrationEffect: ChromaticAberrationEffect) {
    this.strength = clamp(this.strength, 0, 1);
    return {
      chromaticAberrationOffset: chromaticAberrationEffect.offset,
      delay: new Vector2(1 * 1000, 3.5 * 1000),
      duration: new Vector2(0.5 * 1000, 1 * 1000),
      strength: new Vector2(0.075, this.strength),
      ratio: 1 - this.strength,
    } as ConstructorParameters<typeof GlitchEffect>[0];
  }
}
