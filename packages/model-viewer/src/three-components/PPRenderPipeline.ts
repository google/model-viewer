import { EffectComposer, RenderPass, EffectPass, BloomEffect, BlendFunction, KernelSize, FXAAEffect, SSAOEffect, ToneMappingEffect, ToneMappingMode } from 'postprocessing';
import { WebGLRenderer } from 'three';

export const RENDER_PASS = new RenderPass(null, null);

export const FXAA_EFFECT = new FXAAEffect();

export const SSAO_EFFECT = new SSAOEffect();

export const BLOOM_EFFECT = new BloomEffect({
    blendFunction: BlendFunction.ADD,
    mipmapBlur: true,
    luminanceThreshold: 0.85,
    luminanceSmoothing: 0.025,
    intensity: 3,
    kernelSize: KernelSize.LARGE
});

export const TONEMAPPING_EFFECT = new ToneMappingEffect({mode: ToneMappingMode.OPTIMIZED_CINEON});

export const POST_PROCESSING_PIPELINE = new EffectPass(null, FXAA_EFFECT, SSAO_EFFECT, BLOOM_EFFECT, TONEMAPPING_EFFECT);
POST_PROCESSING_PIPELINE.name = "postProcessing";
POST_PROCESSING_PIPELINE.enabled = false;

export const CreateEffectComposer = (threeRenderer: WebGLRenderer) => {
    const effectComposer = new EffectComposer(threeRenderer);

    effectComposer.addPass(RENDER_PASS);
    effectComposer.addPass(POST_PROCESSING_PIPELINE);
};