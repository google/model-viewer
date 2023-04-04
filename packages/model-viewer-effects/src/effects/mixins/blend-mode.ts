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

import { ReactiveElement } from 'lit';
import { property } from 'lit/decorators.js';
import { BlendFunction } from 'postprocessing';
import { Constructor, clampNormal } from '../../utilities.js';
import { IEffectBaseMixin } from './effect-base.js';

export const $setDefaultProperties = Symbol('setDefaultProperties');

export interface IBlendModeMixin {
  opacity: number;
  blendMode: string;
  [$setDefaultProperties](): void;
}

export const BlendModeMixin = <T extends Constructor<IEffectBaseMixin & ReactiveElement>>(
  EffectClass: T
): Constructor<IBlendModeMixin> & T => {
  class BlendEffectElement extends EffectClass {
    @property({ type: String, attribute: 'blend-mode', reflect: true })
    blendMode: string = 'default';

    @property({ type: Number, attribute: 'opacity', reflect: true })
    opacity: number = 1;

    connectedCallback() {
      super.connectedCallback && super.connectedCallback();
      this[$setDefaultProperties]();
    }

    updated(changedProperties: Map<string | number | symbol, any>) {
      super.updated(changedProperties);
      if (changedProperties.has('blendMode') || changedProperties.has('opacity')) {
        this.opacity = clampNormal(this.opacity);
        this.effects.forEach((effect) => {
          if (this.blendMode.toLowerCase() === 'default' && effect.blendMode.defaultBlendFunction !== undefined) {
            effect.blendMode.blendFunction = effect.blendMode.defaultBlendFunction;
          } else if (this.blendMode.toLowerCase() === 'skip') {
            effect.blendMode.blendFunction = BlendFunction.SKIP;
          } else {
            // @ts-ignore
            effect.blendMode.blendFunction = BlendFunction[this.blendMode.toUpperCase()] ?? effect.blendMode.defaultBlendFunction;
          }
          effect.disabled = this.blendMode.toLowerCase() === 'skip';
          effect.blendMode.setOpacity(this.opacity);
        });
        // Recreate EffectPasses if the new or old value was 'skip'
        if (this.blendMode.toLowerCase() === 'skip' || changedProperties.get('blendMode') === 'skip') {
          this.effectComposer?.updateEffects();
        }
        this.effectComposer?.queueRender();
      }
    }

    protected [$setDefaultProperties]() {
      this.effects.forEach((effect) => {
        effect.blendMode.defaultBlendFunction = effect.blendMode.blendFunction;
      });
    }
  }
  return BlendEffectElement as Constructor<IBlendModeMixin> & T;
};
