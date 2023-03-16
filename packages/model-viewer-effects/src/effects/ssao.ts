import {SSAOEffect} from 'postprocessing';
import {$effects, $effectOptions} from '../model-effect-composer.js';
import {PerspectiveCamera} from 'three';
import {$mvEffectComposer, $requireNormals, $updateProperties, IMVEffect, MVEffectBase} from './mixins/effect-base.js';
import { property } from 'lit/decorators.js';
import { $setDefaultProperties } from './mixins/blend-mode.js';

export class MVSSAOEffect extends MVEffectBase {
  static get is() {
    return 'ssao-effect';
  }

  @property({type: Number, attribute: 'strength', reflect: true})
  strength: number = 2;

  constructor() {
    super();
    const tempCamera = new PerspectiveCamera();
    Object.setPrototypeOf(tempCamera, PerspectiveCamera.prototype);
    // @ts-expect-error scene and camera are optional as of `postprocessing@6.30.2`
    const effect = new SSAOEffect(tempCamera, undefined, this[$effectOptions]);
    (effect as IMVEffect)[$requireNormals] = true;
    this[$effects] = [effect];
  }

  connectedCallback(): void {
    super.connectedCallback && super.connectedCallback();
    this[$setDefaultProperties]();
    this[$updateProperties]();
  }
  
  update(changedProperties: Map<string|number|symbol, any>): void {
    super.update && super.update(changedProperties);
    if (changedProperties.has('strength')) {
      this[$updateProperties]();
    }
  }

  [$updateProperties](): void {
    (this[$effects][0] as SSAOEffect).intensity = this.strength;
    this[$mvEffectComposer].queueRender();
  }

  [$setDefaultProperties]() {
    (this[$effects][0] as SSAOEffect).ssaoMaterial.normalBuffer = this[$mvEffectComposer].normalBuffer;
    (this[$effects][0] as any).depthDownsamplingPass.fullscreenMaterial.normalBuffer = this[$mvEffectComposer].normalBuffer;
  }

  get [$effectOptions]() {
    return {
      worldDistanceThreshold: 1000,
      worldDistanceFalloff: 1000,
      worldProximityThreshold: 1000,
      worldProximityFalloff: 1000,
      // worldDistanceThreshold: 100,
      // worldDistanceFalloff: 5,
      // worldProximityThreshold: 0.4,
      // worldProximityFalloff: 0.1,
      luminanceInfluence: 0.7,
      samples: 16,
      fade: 0.05,
      radius: 0.05,
      intensity: this.strength,
    } as ConstructorParameters<typeof SSAOEffect>[2];
  }
}
