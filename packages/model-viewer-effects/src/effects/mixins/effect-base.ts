import { ReactiveElement } from "lit";
import { BlendFunction, BlendMode, Effect } from "postprocessing";
import { $effects, MVEffectComposer } from "../../model-effect-composer";
import { Constructor } from "../../utilities";
import { BlendModeMixin } from "./blend-mode";

export const $mvEffectComposer = Symbol('mvEffectComposer');
export const $requireNormals = Symbol('requireNormals');
export const $requireSeparatePass = Symbol('requireSeparatePass');
export const $updateProperties = Symbol('updateProperties');

export interface IMVBlendMode extends BlendMode {
  defaultBlendFunction?: BlendFunction;
}

export interface IMVEffect extends Effect {
  readonly blendMode: IMVBlendMode
  disabled?: boolean;
  [$requireNormals]?: boolean;
  [$requireSeparatePass]?: boolean;
}

export interface IEffectBaseMixin {
  [$effects]: IMVEffect[];
  [$mvEffectComposer]: MVEffectComposer;
}

export const EffectBaseMixin = <T extends Constructor<ReactiveElement>>(EffectClass: T):
Constructor<IEffectBaseMixin> & T => {
  class BlendEffectElement extends EffectClass {
    protected [$effects]!: IMVEffect[];

    protected get[$mvEffectComposer](): MVEffectComposer {
      return this.parentNode as MVEffectComposer;
    }

    connectedCallback(): void {
      super.connectedCallback && super.connectedCallback();
      this[$mvEffectComposer].updateEffects();
    }

    disconnectedCallback() {
      super.disconnectedCallback && super.disconnectedCallback();
      this[$effects].forEach((effect) => effect.dispose());
      this[$mvEffectComposer].updateEffects();
    }
  }
  return BlendEffectElement as Constructor<IEffectBaseMixin> & T;
}

// @ts-ignore
export const MVEffectBase = BlendModeMixin(EffectBaseMixin(ReactiveElement));
export type MVEffectBase = InstanceType<typeof MVEffectBase>;