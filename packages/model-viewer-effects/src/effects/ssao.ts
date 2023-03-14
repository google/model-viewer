import {BlendFunction, SSAOEffect} from 'postprocessing';
import {$effects, $effectOptions} from '../model-effect-composer.js';
import {$mvEffectComposer, $requireNormals, MVEffectBase} from './effect-base.js';

export class MVSSAOEffect extends MVEffectBase {
  static get is() {
    return 'mv-ssao-effect';
  }

  readonly [$requireNormals] = true;

  constructor() {
    super();
    // @ts-expect-error scene and camera are optional as of `postprocessing@6.30.2`
    this[$effects] = [new SSAOEffect(undefined, this[$mvEffectComposer].normalBuffer, this[$effectOptions])];
  }

  get [$effectOptions]() {
    return {
      blendFunction: BlendFunction.SET,
      depthAwareUpsampling: true,
      samples: 9,
      rings: 7,
      luminanceInfluence: 0.7,
      minRadiusScale: 0.33,
      radius: 0.05,
      intensity: 10,
      bias: 0.025,
      fade: 0.01,
      resolutionScale: 0.5,
    } as ConstructorParameters<typeof SSAOEffect>[2];
  }
}
