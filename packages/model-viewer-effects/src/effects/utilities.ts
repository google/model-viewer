import { KernelSize } from "postprocessing";
import { clamp } from "../utilities";

export function getKernelSize(n: number): number {
  return Math.round(clamp(n + 1, KernelSize.VERY_SMALL, KernelSize.HUGE + 1)) - 1;
}

