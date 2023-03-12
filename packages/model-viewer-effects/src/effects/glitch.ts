import {ChromaticAberrationEffect, GlitchEffect} from 'postprocessing';
import {Vector2} from 'three';
import {$effectOptions, $effects} from '../model-effect-composer.js';
import {MVEffectBase} from './effect-base.js';

export class MVGlitchEffect extends MVEffectBase {
  static get is() {
    return 'mv-glitch-effect';
  }

  constructor() {
    super();
    const chromaticAberrationEffect = new ChromaticAberrationEffect();
    this[$effects] = [
      new GlitchEffect(this[$effectOptions](chromaticAberrationEffect)),
      chromaticAberrationEffect
    ];
  }

  [$effectOptions](chromaticAberrationEffect: ChromaticAberrationEffect) {
    return {
      chromaticAberrationOffset: chromaticAberrationEffect.offset,
			delay: new Vector2(2.5, 3.5),
			duration: new Vector2(0.2, 1),
			strength: new Vector2(0.2, 0.5),
			ratio: 0.80,
    };
  }
}
