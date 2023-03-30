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

import { LitElement, ReactiveElement } from 'lit';
import { BlendFunction, BlendMode, Effect } from 'postprocessing';
import { MVEffectComposer } from '../../effect-composer';
import { Constructor } from '../../utilities';
import { BlendModeMixin } from './blend-mode';

export const $updateProperties = Symbol('updateProperties');
export const $effectOptions = Symbol('effectOptions');

export interface IMVBlendMode extends BlendMode {
  defaultBlendFunction?: BlendFunction;
}

export interface IntegrationOptions {
  /**
   * Enable this if effect uses the built-in {@link NormalPass}
   */
  requireNormals?: boolean;
  /**
   * Enable this if the effect requires a render frame every frame.
   * @warning Significant performance impact from enabling this
   */
  requireDirtyRender?: boolean;
}

export interface IMVEffect extends Effect, IntegrationOptions {
  readonly blendMode: IMVBlendMode;
  /**
   * Enable this if the effect doesn't play well when used with other effects.
   */
  requireSeparatePass?: boolean;
  disabled?: boolean;
}

export interface IEffectBaseMixin {
  effects: IMVEffect[];
  effectComposer: MVEffectComposer;
}

export const EffectBaseMixin = <T extends Constructor<ReactiveElement>>(EffectClass: T): Constructor<IEffectBaseMixin> & T => {
  class EffectBaseElement extends EffectClass {
    protected effects!: IMVEffect[];

    /**
     * The parent {@link MVEffectComposer} element.
     */
    protected get effectComposer(): MVEffectComposer {
      return this.parentNode as MVEffectComposer;
    }

    connectedCallback(): void {
      super.connectedCallback && super.connectedCallback();
      this.effectComposer.updateEffects();
    }

    disconnectedCallback() {
      super.disconnectedCallback && super.disconnectedCallback();
      this.effects.forEach((effect) => effect.dispose());
      this.effectComposer.updateEffects();
    }
  }
  return EffectBaseElement as Constructor<IEffectBaseMixin> & T;
};

export const MVEffectBase = BlendModeMixin(EffectBaseMixin(LitElement));
export type MVEffectBase = InstanceType<typeof MVEffectBase>;
