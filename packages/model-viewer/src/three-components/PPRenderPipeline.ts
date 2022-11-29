import { EffectComposer, RenderPass, EffectPass, BloomEffect, BlendFunction, KernelSize, FXAAEffect, SSAOEffect, PixelationEffect, OutlineEffect, ToneMappingEffect, ToneMappingMode } from 'postprocessing';
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

export const PIXELATE_EFFECt = new PixelationEffect(6);

export const OUTLINE_EFFECT = new OutlineEffect();
// export const TONEMAPPING_EFFECT = new ToneMappingEffect({mode: ToneMappingMode.OPTIMIZED_CINEON});

export const FXAA_PASS = new EffectPass(null, FXAA_EFFECT);
export const SSAO_PASS = new EffectPass(null, SSAO_EFFECT);
export const BLOOM_PASS = new EffectPass(null, BLOOM_EFFECT);
export const OUTLINE_PASS = new EffectPass(null, OUTLINE_EFFECT);
export const PIXELATE_PASS = new EffectPass(null, PIXELATE_EFFECt);

FXAA_PASS.enabled = false;
SSAO_PASS.enabled = false;
BLOOM_PASS.enabled = false;
OUTLINE_PASS.enabled = false;
PIXELATE_PASS.enabled = false;

export const CreateEffectComposer = (threeRenderer: WebGLRenderer) => {
    const effectComposer = new EffectComposer(threeRenderer);

    effectComposer.addPass(RENDER_PASS);
    effectComposer.addPass(FXAA_PASS);
    effectComposer.addPass(SSAO_PASS);
    effectComposer.addPass(BLOOM_PASS);
    effectComposer.addPass(OUTLINE_PASS);
    effectComposer.addPass(PIXELATE_PASS);
    // effectComposer.addPass(POST_PROCESSING_PIPELINE);
};