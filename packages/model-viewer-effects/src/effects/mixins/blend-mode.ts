import { ReactiveElement} from 'lit';
import {property} from 'lit/decorators.js';
import {BlendFunction} from 'postprocessing';
import { Constructor, clampNormal } from '../../utilities.js';
import {$effects} from '../../effect-composer.js';
import { IEffectBaseMixin } from './effect-base.js';

export const $setDefaultProperties = Symbol('setDefaultProperties');

export interface IBlendModeMixin {
  opacity: number;
  disabled?: Boolean;
};

export const BlendModeMixin = <T extends Constructor<IEffectBaseMixin&ReactiveElement>>(EffectClass: T):
Constructor<IBlendModeMixin> & T => {
  class BlendEffectElement extends EffectClass {
    @property({type: String, attribute: 'blend-mode'})
    blendMode: string = 'default';

    @property({type: Number, attribute: 'opacity'})
    opacity: number = 1;

    connectedCallback() {
      super.connectedCallback && super.connectedCallback();
      this[$setDefaultProperties]();
    }

    updated(changedProperties: Map<string|number|symbol, any>) {
      super.updated(changedProperties);
      if (changedProperties.has('blend-mode') || changedProperties.has('opacity')) {
        this.opacity = clampNormal(this.opacity);
        this[$effects].forEach((effect) => {
          if (this.blendMode === 'default' && effect.blendMode.defaultBlendFunction !== undefined) {
            effect.blendMode.blendFunction = effect.blendMode.defaultBlendFunction
          } else if (this.blendMode === 'skip') {
            effect.blendMode.blendFunction = BlendFunction.SKIP;
            effect.disabled = true;
          } else {
            // @ts-ignore
            effect.blendMode.blendFunction = BlendFunction[this.blendMode.toUpperCase()] ?? effect.blendMode.defaultBlendFunction;
          }
          effect.blendMode.setOpacity(this.opacity);
        })
      }
    }

    private [$setDefaultProperties]() {
      this[$effects].forEach((effect) => {
        effect.blendMode.defaultBlendFunction = effect.blendMode.blendFunction;
      })
    }
  }
  return BlendEffectElement as Constructor<IBlendModeMixin> & T;
}
