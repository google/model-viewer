import {BlendFunction, SSAOEffect} from 'postprocessing';
import {$effects, $effectOptions} from '../model-effect-composer.js';
import {$mvEffectComposer, $requireNormals, $updateProperties, IMVEffect, MVEffectBase} from './mixins/effect-base.js';

export class MVSSAOEffect extends MVEffectBase {
  static get is() {
    return 'mv-ssao-effect';
  }

  constructor() {
    super();
    // @ts-expect-error scene and camera are optional as of `postprocessing@6.30.2`
    const effect = new SSAOEffect(undefined, undefined, this[$effectOptions]);
    (effect as IMVEffect)[$requireNormals] = true;
    this[$effects] = [effect];
  }

  connectedCallback(): void {
    super.connectedCallback && super.connectedCallback();
    this[$updateProperties]();
  }

  [$updateProperties](): void {
    (this[$effects][0] as SSAOEffect).ssaoMaterial.normalBuffer = this[$mvEffectComposer].normalBuffer;
  }

  get [$effectOptions]() {
    return {
      blendFunction: BlendFunction.SET,
      distanceScaling: false,
      depthAwareUpsampling: false,
      samples: 31,
      rings: 7,
      luminanceInfluence: 0.1,
      minRadiusScale: 0.01,
      radius: 0.1,
      intensity: 30,
      bias: 0.025,
      fade: 0.01,
      resolutionScale: 0.5,
      worldDistanceThreshold: 5000,
      worldDistanceFalloff: 0.5,
      worldProximityThreshold: 5000,
      worldProximityFalloff: 0.5,
    } as ConstructorParameters<typeof SSAOEffect>[2];
  }
}
