import {property} from 'lit/decorators.js';
import {BlendFunction, BrightnessContrastEffect, HueSaturationEffect} from 'postprocessing';
import {$effects} from '../model-effect-composer.js';
import {clamp} from '../utilities.js';
import {$mvEffectComposer, MVEffectBase} from './effect-base.js';

export class MVColorGradeEffect extends MVEffectBase {
  static get is() {
    return 'mv-color-grade-effect';
  }

  @property({type: String || Number, attribute: 'brightness'})
  brightness = 0;

  @property({type: Number, attribute: 'contrast'})
  contrast = 0;

  @property({type: Number, attribute: 'saturation'})
  saturation = 0;

  @property({type: Number, attribute: 'hue'})
  hue = 0;

  constructor() {
    super();
    this[$effects] = [
      new HueSaturationEffect({
        hue: clamp(this.hue, 0, Math.PI * 2.0),
        saturation: clamp(this.saturation, -1, 1),
        blendFunction: BlendFunction.SRC,
      }),
      new BrightnessContrastEffect({
        brightness: clamp(this.brightness, -1, 1),
        contrast: clamp(this.contrast, -1, 1),
        blendFunction: BlendFunction.SRC,
      })
    ];
  }

  updated(changedProperties: Map<string|number|symbol, any>) {
    super.updated(changedProperties);
    if (changedProperties.has('brightness') || changedProperties.has('contrast') || changedProperties.has('hue') || changedProperties.has('saturation')) {
      (this[$effects][0] as HueSaturationEffect).saturation = clamp(this.saturation, -1, 1);
      (this[$effects][0] as HueSaturationEffect).hue = clamp(this.hue, 0, Math.PI * 2.0);
      (this[$effects][1] as BrightnessContrastEffect).brightness = clamp(this.brightness, -1, 1);
      (this[$effects][1] as BrightnessContrastEffect).contrast = clamp(this.contrast, -1, 1);
      this[$mvEffectComposer].queueRender();
    }
  }
}
