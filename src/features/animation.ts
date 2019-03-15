/*
 * Copyright 2019 Google Inc. All Rights Reserved.
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

import {property} from 'lit-element';

import ModelViewerElementBase, {$needsRender, $onModelLoad, $scene, $tick, $updateSource} from '../model-viewer-base.js';
import {Constructor} from '../utils.js';

const MILLISECONDS_PER_SECOND = 1000.0

const $updateAnimation = Symbol('updateAnimation');

export const AnimationMixin =
    (ModelViewerElement: Constructor<ModelViewerElementBase>):
        Constructor<ModelViewerElementBase> => {
          class AnimationModelViewerElement extends ModelViewerElement {
            @property({type: Boolean}) animated: boolean = false;
            @property({type: Boolean, attribute: 'pause-animation'})
            pauseAnimation: boolean = false;
            @property({type: String, attribute: 'animation-name'})
            animationName: string|null = null;
            @property({type: Number, attribute: 'animation-crossfade-duration'})
            animationCrossfadeDuration: number = 300;

            /**
             * Returns an array
             */
            get availableAnimations(): Array<string> {
              if (this.loaded) {
                return (this as any)[$scene].model.animationNames;
              }

              return [];
            }

            [$onModelLoad]() {
              this[$updateAnimation]();
            }

            [$tick](_time: number, delta: number) {
              if (this.pauseAnimation || !this.animated) {
                return;
              }

              const {model} = (this as any)[$scene];
              model.updateAnimation(delta / MILLISECONDS_PER_SECOND);

              this[$needsRender]();
            }

            updated(changedProperties: Map<string, any>) {
              super.updated(changedProperties);

              if (changedProperties.has('animated') ||
                  changedProperties.has('animationName')) {
                this[$updateAnimation]();
              }
            }

            async[$updateSource]() {
              super[$updateSource]();

              // Reject a pending model load promise, effectively cancelling
              // any pending work to set the animation for a model that has
              // not fully loaded:
              (this as any)[$scene].model.stopAnimation();
            }

            async[$updateAnimation]() {
              const {model} = (this as any)[$scene];

              if (this.animated === true) {
                model.playAnimation(
                    this.animationName,
                    this.animationCrossfadeDuration / MILLISECONDS_PER_SECOND);
              } else {
                model.stopAnimation();
                // Tick steps are no longer invoked if animated is false, so we
                // need to invoke one last render or else the model will appear
                // to freeze on the last renderered animation frame:
                this[$needsRender]();
              }
            }
          }

          return AnimationModelViewerElement;
        };
