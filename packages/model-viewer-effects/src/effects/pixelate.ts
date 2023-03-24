import { property } from 'lit/decorators.js';
import { PixelationEffect } from 'postprocessing';
import { $updateProperties, MVEffectBase } from './mixins/effect-base.js';

export class MVPixelateEffect extends MVEffectBase {
  static get is() {
    return 'pixelate-effect';
  }

  /**
   * The pixel granularity. Higher value = lower resolution.
   * @default 10
   */
  @property({ type: Number, attribute: 'granularity', reflect: true })
  granularity = 10.0;

  constructor() {
    super();

    this.effects = [new PixelationEffect(this.granularity)];
  }

  connectedCallback(): void {
    super.connectedCallback && super.connectedCallback();
    this[$updateProperties]();
  }

  updated(changedProperties: Map<string | number | symbol, any>) {
    super.updated(changedProperties);
    if (changedProperties.has('granularity')) {
      this[$updateProperties]();
    }
  }

  [$updateProperties]() {
    (this.effects[0] as PixelationEffect).granularity = this.granularity;
    this.effectComposer.queueRender();
  }
}
