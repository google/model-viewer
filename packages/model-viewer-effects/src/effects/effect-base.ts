import {ReactiveElement} from 'lit';
import {property} from 'lit/decorators.js';
import {Effect} from 'postprocessing';
import {$effects, MVEffectComposer} from '../model-effect-composer.js';

export const $mvEffectComposer = Symbol('mvEffectComposer');
export const $requireNormals = Symbol('requireNormals');
export const $requireSeparatePass = Symbol('requireSeparatePass');

export interface IMVEffect {
  [$effects]: Effect[];
  readonly [$requireNormals]?: boolean;
  readonly [$requireSeparatePass]?: boolean;
}

export class MVEffectBase extends ReactiveElement implements IMVEffect {
  @property({type: Boolean, attribute: 'enabled'})
  enabled = true;
  
  [$effects]!: Effect[];
  readonly [$requireNormals]: boolean = false;;
  readonly [$requireSeparatePass]: boolean = false;

  constructor() {
    super();
  }

  disconnectedCallback() {
    super.disconnectedCallback && super.disconnectedCallback();
    this[$effects].forEach((effect) => effect.dispose());
    this[$mvEffectComposer].updateEffects();
  }

  updated(changedProperties: Map<string|number|symbol, any>) {
    super.updated(changedProperties);
    if (changedProperties.has('enabled')) {
      this[$mvEffectComposer].updateEffects();
    }
  }

  get[$mvEffectComposer]() {
    return this.parentNode as MVEffectComposer;
  }
}
