import {property} from 'lit/decorators.js';
import {BlendFunction, BloomEffect} from 'postprocessing';
import {$effects, $effectOptions} from '../model-effect-composer.js';
import {$mvEffectComposer, MVEffectBase} from './effect-base.js';

export class MVBloomEffect extends MVEffectBase {
  static get is() {
    return 'mv-bloom-effect';
  }

  @property({type: Number, attribute: 'granularity'})
  intensity = 3;

  @property({type: Number, attribute: 'threshold'})
  threshold = 0.85;

  @property({type: Number, attribute: 'smoothing'})
  smoothing = 0.025;

  /**
   * 0-6
   */
  @property({type: Number, attribute: 'blur-strength'})
  blurStrength = 5;

  constructor() {
    super();

    this[$effects] = [new BloomEffect(this[$effectOptions])];
  }

  updated(changedProperties: Map<string|number|symbol, any>) {
    super.updated(changedProperties);
    if (changedProperties.has('intensity') || changedProperties.has('threshold') || changedProperties.has('smoothing')) {
      (this[$effects][0] as BloomEffect).luminanceMaterial.threshold = this.threshold;
      (this[$effects][0] as BloomEffect).luminanceMaterial.smoothing = this.smoothing;
      (this[$effects][0] as BloomEffect).intensity = this.intensity;
      // (this[$effects][0] as BloomEffect).mipmapBlur
      // (this[$effects][0] as BloomEffect).blurPass.kernelSize = getKernelSize(this.blurStrength);
      this[$mvEffectComposer].queueRender();
    }
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
