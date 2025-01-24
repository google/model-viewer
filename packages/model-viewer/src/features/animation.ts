/* @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {property} from 'lit/decorators.js';
import {LoopOnce, LoopPingPong, LoopRepeat} from 'three';

import ModelViewerElementBase, {$getModelIsVisible, $needsRender, $onModelLoad, $renderer, $scene, $tick} from '../model-viewer-base.js';
import {Constructor} from '../utilities.js';

const MILLISECONDS_PER_SECOND = 1000.0

const $changeAnimation = Symbol('changeAnimation');
const $appendAnimation = Symbol('appendAnimation');
const $detachAnimation = Symbol('detachAnimation');
const $paused = Symbol('paused');

interface PlayAnimationOptions {
  repetitions: number, pingpong: boolean,
}

interface AppendAnimationOptions {
  pingpong: boolean, repetitions: number|null, weight: number,
      timeScale: number, fade: boolean|number, warp: boolean|number,
      relativeWarp: boolean, time: number|null
}

interface DetachAnimationOptions {
  fade: boolean|number
}

const DEFAULT_PLAY_OPTIONS: PlayAnimationOptions = {
  repetitions: Infinity,
  pingpong: false
};

const DEFAULT_APPEND_OPTIONS: AppendAnimationOptions = {
  pingpong: false,
  repetitions: null,
  weight: 1,
  timeScale: 1,
  fade: false,
  warp: false,
  relativeWarp: true,
  time: null
};

const DEFAULT_DETACH_OPTIONS: DetachAnimationOptions = {
  fade: true
};

export declare interface AnimationInterface {
  autoplay: boolean;
  animationName: string|void;
  animationCrossfadeDuration: number;
  readonly availableAnimations: Array<string>;
  readonly paused: boolean;
  readonly duration: number;
  currentTime: number;
  timeScale: number;
  pause(): void;
  play(options?: PlayAnimationOptions): void;
  appendAnimation(animationName: string, options?: AppendAnimationOptions):
      void;
  detachAnimation(animationName: string, options?: DetachAnimationOptions):
      void;
}

export const AnimationMixin = <T extends Constructor<ModelViewerElementBase>>(
    ModelViewerElement: T): Constructor<AnimationInterface>&T => {
  class AnimationModelViewerElement extends ModelViewerElement {
    @property({type: Boolean}) autoplay: boolean = false;
    @property({type: String, attribute: 'animation-name'})
    animationName: string|undefined = undefined;
    @property({type: Number, attribute: 'animation-crossfade-duration'})
    animationCrossfadeDuration: number = 300;

    protected[$paused]: boolean = true;

    constructor(...args: any[]) {
      super(args);

      this[$scene].subscribeMixerEvent('loop', (e) => {
        const count = e.action._loopCount;
        const name = e.action._clip.name;
        const uuid = e.action._clip.uuid;
        const targetAnimation =
            this[$scene].markedAnimations.find(e => e.name === name);

        if (targetAnimation) {
          this[$scene].updateAnimationLoop(
              targetAnimation.name,
              targetAnimation.loopMode,
              targetAnimation.repetitionCount);
          const filtredArr =
              this[$scene].markedAnimations.filter(e => e.name !== name);
          this[$scene].markedAnimations = filtredArr;
        }

        this.dispatchEvent(
            new CustomEvent('loop', {detail: {count, name, uuid}}));
      });
      this[$scene].subscribeMixerEvent('finished', (e) => {
        if (!this[$scene].appendedAnimations.includes(e.action._clip.name)) {
          this[$paused] = true;
        } else {
          const filterdList = this[$scene].appendedAnimations.filter(
              i => i !== e.action._clip.name);
          this[$scene].appendedAnimations = filterdList;
        }
        this.dispatchEvent(new CustomEvent('finished'));
      });
    }

    /**
     * Returns an array
     */
    get availableAnimations(): Array<string> {
      if (this.loaded) {
        return this[$scene].animationNames;
      }

      return [];
    }

    get duration(): number {
      return this[$scene].duration;
    }

    get paused(): boolean {
      return this[$paused];
    }

    get currentTime(): number {
      return this[$scene].animationTime;
    }

    get appendedAnimations(): string[] {
      return this[$scene].appendedAnimations;
    }

    set currentTime(value: number) {
      this[$scene].animationTime = value;
      this[$needsRender]();
    }

    get timeScale(): number {
      return this[$scene].animationTimeScale;
    }

    set timeScale(value: number) {
      this[$scene].animationTimeScale = value;
    }

    pause() {
      if (this[$paused]) {
        return;
      }

      this[$paused] = true;
      this.dispatchEvent(new CustomEvent('pause'));
    }

    play(options?: PlayAnimationOptions) {
      if (this.availableAnimations.length > 0) {
        this[$paused] = false;

        this[$changeAnimation](options);

        this.dispatchEvent(new CustomEvent('play'));
      }
    }

    appendAnimation(animationName: string, options?: AppendAnimationOptions) {
      if (this.availableAnimations.length > 0) {
        this[$paused] = false;

        this[$appendAnimation](animationName, options);

        this.dispatchEvent(new CustomEvent('append-animation'));
      }
    }

    detachAnimation(animationName: string, options?: DetachAnimationOptions) {
      if (this.availableAnimations.length > 0) {
        this[$paused] = false;

        this[$detachAnimation](animationName, options);

        this.dispatchEvent(new CustomEvent('detach-animation'));
      }
    }

    [$onModelLoad]() {
      super[$onModelLoad]();

      this[$paused] = true;

      if (this.animationName != null) {
        this[$changeAnimation]();
      }

      if (this.autoplay) {
        this.play();
      }
    }

    [$tick](_time: number, delta: number) {
      super[$tick](_time, delta);

      if (this[$paused] ||
          (!this[$getModelIsVisible]() && !this[$renderer].isPresenting)) {
        return;
      }

      this[$scene].updateAnimation(delta / MILLISECONDS_PER_SECOND);

      this[$needsRender]();
    }

    updated(changedProperties: Map<string, any>) {
      super.updated(changedProperties);

      if (changedProperties.has('autoplay') && this.autoplay) {
        this.play();
      }

      if (changedProperties.has('animationName')) {
        this[$changeAnimation]();
      }
    }

    [$changeAnimation](options: PlayAnimationOptions = DEFAULT_PLAY_OPTIONS) {
      const repetitions = options.repetitions ?? Infinity;
      const mode = options.pingpong ?
          LoopPingPong :
          (repetitions === 1 ? LoopOnce : LoopRepeat);
      this[$scene].playAnimation(
          this.animationName,
          this.animationCrossfadeDuration / MILLISECONDS_PER_SECOND,
          mode,
          repetitions);

      // If we are currently paused, we need to force a render so that
      // the scene updates to the first frame of the new animation
      if (this[$paused]) {
        this[$scene].updateAnimation(0);
        this[$needsRender]();
      }
    }

    [$appendAnimation](
        animationName: string = '',
        options: AppendAnimationOptions = DEFAULT_APPEND_OPTIONS) {
      const repetitions = options.repetitions ?? Infinity;
      const mode = options.pingpong ?
          LoopPingPong :
          (repetitions === 1 ? LoopOnce : LoopRepeat);

      const needsToStop = !!options.repetitions || 'pingpong' in options;

      this[$scene].appendAnimation(
          animationName ? animationName : this.animationName,
          mode,
          repetitions,
          options.weight,
          options.timeScale,
          options.fade,
          options.warp,
          options.relativeWarp,
          options.time,
          needsToStop);

      // If we are currently paused, we need to force a render so that
      // the scene updates to the first frame of the new animation
      if (this[$paused]) {
        this[$scene].updateAnimation(0);
        this[$needsRender]();
      }
    }

    [$detachAnimation](
        animationName: string = '',
        options: DetachAnimationOptions = DEFAULT_DETACH_OPTIONS) {
      this[$scene].detachAnimation(
          animationName ? animationName : this.animationName, options.fade);

      // If we are currently paused, we need to force a render so that
      // the scene updates to the first frame of the new animation
      if (this[$paused]) {
        this[$scene].updateAnimation(0);
        this[$needsRender]();
      }
    }
  }

  return AnimationModelViewerElement;
};
