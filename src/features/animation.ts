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

import ModelViewerElementBase, {$needsRender, $scene, $tick, $updateSource} from '../model-viewer-base.js';
import {Constructor} from '../utils.js';

const MILLISECONDS_PER_SECOND = 1000.0

const $updateAnimation = Symbol('updateAnimation');
const $updateModelLoadsPromise = Symbol('updateModelLoadsPromise');
const $modelLoads = Symbol('modelLoads');
const $rejectModelLoads = Symbol('rejectModelLoads');

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

            protected[$rejectModelLoads]: (...args: Array<any>) => void;
            protected[$modelLoads]: Promise<void>;

            constructor() {
              super();
              this[$updateModelLoadsPromise]();
            }

            /**
             * Returns an array
             */
            get availableAnimations(): Array<string> {
              if (this.loaded) {
                return (this as any)[$scene].model.animationNames;
              }

              return [];
            }

            /**
             * Creates a promise that resolves when a model is loaded. The
             * promise resolves immediately if there is currently a loaded
             * model. The promise rejects if the currently loaded model is
             * changed to something new due to the src attribute changing.
             */
            [$updateModelLoadsPromise]() {
              if (this[$rejectModelLoads] != null) {
                this[$rejectModelLoads]();
              }

              this[$modelLoads] = new Promise<void>((resolve, reject) => {
                if (this.loaded) {
                  // If the model is already loaded, we are g2g
                  resolve();
                } else {
                  // Rejecting this promise implies that the load is cancelled,
                  // so we shouldn't listen for load events anymore:
                  this[$rejectModelLoads] = () => {
                    this.removeEventListener('load', onModelLoaded);
                    reject();
                  };

                  // Register a listener that will resolve the promise when a
                  // model with the appropriate URL has been loaded:
                  const {src} = (this as any);
                  const onModelLoaded = (event: any) => {
                    if (event.detail.url !== src) {
                      return;
                    }
                    resolve();
                    this.removeEventListener('load', onModelLoaded);
                  };
                  this.addEventListener('load', onModelLoaded);
                }
              });

              // Suppress potentially unhandled rejections for this particular
              // promise. An undefined error conventionally implies that the
              // promise was merely cancelled:
              this[$modelLoads].catch((error) => {
                if (error == null) {
                  return;
                }

                throw error;
              });
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
              this[$updateModelLoadsPromise]();
              this[$updateAnimation]();
            }

            async[$updateAnimation]() {
              const src = (this as any).src;
              if (src != null) {
                try {
                  // Don't attempt to play any animation until the model is
                  // fully loaded (we won't have animations to play anyway in
                  // the first-load case, and subsequent changes of src could
                  // lead to race conditions):
                  await this[$modelLoads];
                } catch (error) {
                  // The model load was "cancelled" by rejection
                  return;
                }
              }

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
