import { ReactiveElement } from 'lit';
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

// @ts-ignore
export const MVEffectBase = BlendModeMixin(EffectBaseMixin(ReactiveElement));
export type MVEffectBase = InstanceType<typeof MVEffectBase>;
