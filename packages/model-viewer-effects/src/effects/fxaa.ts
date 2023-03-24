import { FXAAEffect } from 'postprocessing';
import { MVEffectBase } from './mixins/effect-base.js';

export class MVFXAAEffect extends MVEffectBase {
  static get is() {
    return 'fxaa-effect';
  }

  constructor() {
    super();

    this.effects = [new FXAAEffect()];
  }
}
