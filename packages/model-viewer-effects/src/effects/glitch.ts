import { property } from 'lit/decorators.js';
import { ChromaticAberrationEffect, GlitchEffect, GlitchMode as Mode } from 'postprocessing';
import { Vector2 } from 'three';
import { clamp } from '../utilities.js';
import { $updateProperties, $effectOptions, MVEffectBase } from './mixins/effect-base.js';

export type GlitchMode = 'sporadic' | 'constant';

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

  disconnectedCallback() {
    super.disconnectedCallback();
  }

  updated(changedProperties: Map<string | number | symbol, any>) {
    super.updated(changedProperties);
    if (changedProperties.has('mode') || changedProperties.has('strength')) {
      this[$updateProperties]();
    }
  }

  [$updateProperties](): void {
    this.strength = clamp(this.strength, 0, 1);
    if (this.strength == 0) {
      (this.effects[0] as GlitchEffect).columns = 0;
      (this.effects[0] as GlitchEffect).mode = this.mode === 'sporadic' ? Mode.SPORADIC : Mode.CONSTANT_MILD;
    } else {
      (this.effects[0] as GlitchEffect).columns = 0.06;
      (this.effects[0] as GlitchEffect).mode = this.mode === 'sporadic' ? Mode.SPORADIC : Mode.CONSTANT_WILD;
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
