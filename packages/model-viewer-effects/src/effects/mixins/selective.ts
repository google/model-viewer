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
import { Selection } from 'postprocessing';
import { $selection, $scene } from '../../effect-composer.js';
import { Constructor } from '../../utilities.js';
import { IEffectBaseMixin, IMVEffect } from './effect-base.js';
import { Object3D } from 'three';

export const $setSelection = Symbol('setSelection');

export interface ISelectionEffect extends IMVEffect {
  selection?: Selection;
}

export interface ISelectiveMixin {
  selection: Array<string | Object3D>;
}

export const SelectiveMixin = <T extends Constructor<IEffectBaseMixin & ReactiveElement>>(
  EffectClass: T
): Constructor<ISelectiveMixin> & T => {
  class SelectiveEffectElement extends EffectClass {
    /**
     * The objects to attemp to place into the effect selection. Can be either the 'name' or the actual objects themselves.
     *
     * Note that since this is an array property, it must be set using the '=' operator in order to properly update.
     */
    @property({ type: Array })
    selection: Array<string | Object3D> = [];

    connectedCallback() {
      super.connectedCallback && super.connectedCallback();
      this[$setSelection]();
      this.effectComposer.addEventListener('updated-selection', this[$setSelection]);
    }

    disconnectedCallback(): void {
      super.disconnectedCallback && super.disconnectedCallback();
      this.effectComposer.removeEventListener('updated-selection', this[$setSelection]);
    }

    updated(changedProperties: Map<string | number | symbol, any>) {
      super.updated(changedProperties);
      if (changedProperties.has('selection')) {
        this[$setSelection]();
        this.effectComposer.queueRender();
      }
    }

    [$setSelection] = () => {
      const { effectComposer } = this;
      if (!effectComposer) return;

      if (this.selection?.length > 0) {
        const selection: Object3D[] = [];
        const scene = effectComposer[$scene];
        scene?.traverse((obj) => (this.selection.includes(obj.name) || this.selection.includes(obj)) && selection.push(obj));
        this.effects.forEach((effect: ISelectionEffect) => effect.selection?.set(selection));
      } else {
        this.effects.forEach((effect: ISelectionEffect) => effect.selection?.set(effectComposer[$selection].values()));
      }
    };
  }
  return SelectiveEffectElement as Constructor<ISelectiveMixin> & T;
};
