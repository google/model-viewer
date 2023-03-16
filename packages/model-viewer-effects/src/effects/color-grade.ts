import {property} from 'lit/decorators.js';
import {BlendFunction, BrightnessContrastEffect, HueSaturationEffect} from 'postprocessing';
import {$effects} from '../model-effect-composer.js';
import {clamp} from '../utilities.js';
import {$mvEffectComposer, $updateProperties, MVEffectBase} from './mixins/effect-base.js';

const TWO_PI = Math.PI * 2;

export class MVColorGradeEffect extends MVEffectBase {
  static get is() {
    return 'color-grade-effect';
  }

  @property({type: String || Number, attribute: 'brightness', reflect: true})
  brightness = 0;

  @property({type: Number, attribute: 'contrast', reflect: true})
  contrast = 0;

  @property({type: Number, attribute: 'saturation', reflect: true})
  saturation = 0;

  @property({type: Number, attribute: 'hue', reflect: true})
  hue = 0;

  constructor() {
    super();
    this[$effects] = [
      new HueSaturationEffect({
        hue: clamp(this.hue, 0, TWO_PI),
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

  connectedCallback(): void {
    super.connectedCallback && super.connectedCallback();
    this[$updateProperties]();
  }
  
  updated(changedProperties: Map<string|number|symbol, any>) {
    super.updated(changedProperties);
    if (changedProperties.has('brightness') || changedProperties.has('contrast') || changedProperties.has('hue') || changedProperties.has('saturation')) {
      this[$updateProperties]();
    }
  }
  
  [$updateProperties]() {
    (this[$effects][0] as HueSaturationEffect).saturation = clamp(this.saturation, -1, 1);
    if (this.hue >= TWO_PI) this.hue = 0;
    (this[$effects][0] as HueSaturationEffect).hue = clamp(this.hue, 0, TWO_PI);
    (this[$effects][1] as BrightnessContrastEffect).brightness = clamp(this.brightness, -1, 1);
    (this[$effects][1] as BrightnessContrastEffect).contrast = clamp(this.contrast, -1, 1);
    this[$mvEffectComposer].queueRender();
  }
}
