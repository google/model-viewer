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
const $paused = Symbol('paused');

interface PlayAnimationOptions {
  repetitions: number, pingpong: boolean,
}

const DEFAULT_PLAY_OPTIONS: PlayAnimationOptions = {
  repetitions: Infinity,
  pingpong: false
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
        this.dispatchEvent(new CustomEvent('loop', {detail: {count}}));
      });
      this[$scene].subscribeMixerEvent('finished', () => {
        this[$paused] = true;
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
  }

  return AnimationModelViewerElement;
};
