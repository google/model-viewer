import { property } from 'lit/decorators.js';
import { BlendFunction, BloomEffect } from 'postprocessing';
import { $updateProperties, $effectOptions, MVEffectBase } from './mixins/effect-base.js';

export class MVBloomEffect extends MVEffectBase {
  static get is() {
    return 'bloom-effect';
  }

  /**
   *
   */
  @property({ type: Number, attribute: 'strength', reflect: true })
  strength = 3;

  /**
   * Value in the range of (0, 1). Pixels with a brightness above this will bloom.
   */
  @property({ type: Number, attribute: 'threshold', reflect: true })
  threshold = 0.85;

  /**
   * Value in the range of (0, 1)
   */
  @property({ type: Number, attribute: 'smoothing', reflect: true })
  smoothing = 0.025;

  /**
   * Value in the range of (0, 1)
   */
  @property({ type: Number, attribute: 'radius', reflect: true })
  radius = 0.85;

  constructor() {
    super();

    this.effects = [new BloomEffect(this[$effectOptions])];
  }

  connectedCallback(): void {
    super.connectedCallback && super.connectedCallback();
    this[$updateProperties]();
  }

  updated(changedProperties: Map<string | number | symbol, any>) {
    super.updated(changedProperties);
    if (
      changedProperties.has('strength') ||
      changedProperties.has('threshold') ||
      changedProperties.has('smoothing') ||
      changedProperties.has('radius')
    ) {
      this[$updateProperties]();
    }
  }

  [$updateProperties](): void {
    (this.effects[0] as BloomEffect).luminanceMaterial.threshold = this.threshold;
    (this.effects[0] as BloomEffect).luminanceMaterial.smoothing = this.smoothing;
    (this.effects[0] as BloomEffect).intensity = this.strength;
    (this.effects[0] as any).mipmapBlurPass.radius = this.radius;
    this.effectComposer.queueRender();
  }

  get [$effectOptions]() {
    return {
      blendFunction: BlendFunction.ADD,
      mipmapBlur: true,
      radius: this.radius,
      luminanceThreshold: this.threshold,
      luminanceSmoothing: this.smoothing,
      intensity: this.strength,
    } as ConstructorParameters<typeof BloomEffect>[0];
  }
}
