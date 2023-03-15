import {property} from 'lit/decorators.js';
import {BlendFunction, BloomEffect} from 'postprocessing';
import {$effects, $effectOptions} from '../model-effect-composer.js';
import {$mvEffectComposer, $updateProperties, MVEffectBase} from './mixins/effect-base.js';

export class MVBloomEffect extends MVEffectBase {
  static get is() {
    return 'mv-bloom-effect';
  }

  @property({type: Number, attribute: 'intensity', reflect: true})
  intensity = 3;

  @property({type: Number, attribute: 'threshold', reflect: true})
  threshold = 0.85;

  @property({type: Number, attribute: 'smoothing', reflect: true})
  smoothing = 0.025;

  constructor() {
    super();

    this[$effects] = [new BloomEffect(this[$effectOptions])];
  }

  connectedCallback(): void {
    super.connectedCallback && super.connectedCallback();
    this[$updateProperties]();
  }

  updated(changedProperties: Map<string|number|symbol, any>) {
    super.updated(changedProperties);
    if (changedProperties.has('intensity') || changedProperties.has('threshold') || changedProperties.has('smoothing')) {
      this[$updateProperties]();
    }
  }

  [$updateProperties]() {
    (this[$effects][0] as BloomEffect).luminanceMaterial.threshold = this.threshold;
    (this[$effects][0] as BloomEffect).luminanceMaterial.smoothing = this.smoothing;
    (this[$effects][0] as BloomEffect).intensity = this.intensity;
    this[$mvEffectComposer].queueRender();
  }

  get[$effectOptions]() {
    return {
      blendFunction: BlendFunction.ADD,
      mipmapBlur: true,
      luminanceThreshold: this.threshold,
      luminanceSmoothing: this.smoothing,
      intensity: this.intensity,
    };
  }
}
