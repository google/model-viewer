import {AnimationAction, AnimationClip, LoopPingPong, Object3D} from 'three';

import {$renderer} from '../model-viewer-base.js';
import {ModelViewerElement} from '../model-viewer.js';

import {ModelViewerGLTFInstance} from './gltf-instance/ModelViewerGLTFInstance.js';

/**
 * A THREE.Scene object that takes a Model and CanvasHTMLElement and
 * constructs a framed scene based off of the canvas dimensions.
 * Provides lights and cameras to be used in a renderer.
 */
export class ModelData extends Object3D {
  // ModelScene is going to have child of this types
  public url: string|null = null;

  public currentGLTF: ModelViewerGLTFInstance|null = null;

  private cancelPendingSourceChange: (() => void)|null = null;


  // Animations
  public animationNames: Array<string> = [];
  public animationsByName: Map<string, AnimationClip> = new Map();
  public currentAnimationAction: AnimationAction|null = null;


  constructor() {
    super();
  }

  async loadModel(
      url: string, element: ModelViewerElement,
      progressCallback: (progress: number) => void):
      Promise<ModelViewerGLTFInstance> {
    // If we have pending work due to a previous source change in progress,
    // cancel it so that we do not incur a race condition:
    if (this.cancelPendingSourceChange != null) {
      this.cancelPendingSourceChange!();
      this.cancelPendingSourceChange = null;
    }

    let gltf: ModelViewerGLTFInstance;

    try {
      gltf = await new Promise<ModelViewerGLTFInstance>(
          async (resolve, reject) => {
            this.cancelPendingSourceChange = () => reject();
            try {
              const result = await element[$renderer].loader.load(
                  url, element, progressCallback);
              resolve(result);
            } catch (error) {
              reject(error);
            }
          });
    } finally {
      this.cancelPendingSourceChange = null;
    }

    return gltf;
  }

  setUpAnimations() {
    const {animations} = this.currentGLTF!;
    console.log('Samaneh:animation', animations);
    const animationsByName = new Map();
    const animationNames = [];

    for (const animation of animations) {
      animationsByName.set(animation.name, animation);
      animationNames.push(animation.name);
    }

    this.animations = animations;
    this.animationsByName = animationsByName;
    this.animationNames = animationNames;
  }


  get animationTime(): number {
    if (this.currentAnimationAction != null) {
      const loopCount =
          Math.max((this.currentAnimationAction as any)._loopCount, 0);
      if (this.currentAnimationAction.loop === LoopPingPong &&
          (loopCount & 1) === 1) {
        return this.duration - this.currentAnimationAction.time
      } else {
        return this.currentAnimationAction.time;
      }
    }

    return 0;
  }

  get duration(): number {
    if (this.currentAnimationAction != null &&
        this.currentAnimationAction.getClip()) {
      return this.currentAnimationAction.getClip().duration;
    }

    return 0;
  }

  get hasActiveAnimation(): boolean {
    return this.currentAnimationAction != null;
  }
}