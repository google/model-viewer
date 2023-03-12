import { Effect, KernelSize, Pass } from "postprocessing";
import { EffectRenderer } from "../model-effect-composer";
import { clamp } from "../utilities";

export function getKernelSize(n: number): number {
  return Math.round(clamp(n + 1, KernelSize.VERY_SMALL, KernelSize.HUGE + 1)) - 1;
}

export function setSceneCamera(effects: Array<Effect | Pass>, effectsRenderer: EffectRenderer) {
  effects.forEach((effect) => {
    effect.mainCamera = effectsRenderer.camera;
    effect.mainScene = effectsRenderer.scene;
  })
}