import { KernelSize } from 'postprocessing';
import { PerspectiveCamera } from 'three';
import { clamp } from '../utilities';

/**
 * Helper function for calculating the Kernel Size
 * @param n Range(0, 6)
 * @returns The relative Kernel Size
 */
export function getKernelSize(n: number): number {
  return Math.round(clamp(n + 1, KernelSize.VERY_SMALL, KernelSize.HUGE + 1)) - 1;
}

// Used for effects which require a valid Camera for shader instance
export const TEMP_CAMERA = new PerspectiveCamera();
