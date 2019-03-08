import {property} from 'lit-element';
import ModelViewerElementBase, {$needsRender, $onModelLoad, $scene, $tick} from '../model-viewer-base.js';
import {Constructor} from '../utils.js';

const MILLISECONDS_PER_SECOND = 1000.0

const $updateAnimation = Symbol('updateAnimation');
const $updateModelLoadsPromise = Symbol('updateModelLoadsPromise');
const $modelLoads = Symbol('modelLoads');
const $resolveModelLoads = Symbol('resolveModelLoads');
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

            protected[$resolveModelLoads]: (...args: Array<any>) => void;
            protected[$rejectModelLoads]: (...args: Array<any>) => void;
            protected[$modelLoads]: Promise<void>;

            constructor() {
              super();
              this[$updateModelLoadsPromise]();
            }

            /**
             * Creates a promise that resolves when a model is loaded. The
             * promise resolves immediately if there is currently a loaded
             * model. The promise rejects if the currently loaded model is
             * changed to something new due to the src attribute changing.
             */
            [$updateModelLoadsPromise]() {
              this[$modelLoads] = new Promise<void>((resolve, reject) => {
                this[$resolveModelLoads] = resolve;
                this[$rejectModelLoads] = reject;

                if (this.loaded) {
                  resolve();
                }
              });
              // Suppress potentially uncaught exceptions for this particular
              // promise:
              this[$modelLoads].catch(() => {});
            }

            [$onModelLoad]() {
              super[$onModelLoad]();
              this[$resolveModelLoads]();
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

              if (changedProperties.has('src')) {
                // Reject a pending model load promise, effectively cancelling
                // any pending work to set the animation for a model that has
                // not fully loaded:
                this[$rejectModelLoads]();
                (this[$scene] as any).model.stopAnimation();

                if ((this as any).src != null) {
                  this[$updateModelLoadsPromise]();
                }
              }

              if (changedProperties.has('src') ||
                  changedProperties.has('animated') ||
                  changedProperties.has('animationName')) {
                this[$updateAnimation]();
              }
            }

            async[$updateAnimation]() {
              try {
                // Don't attempt to play any animation until the model is
                // fully loaded (we won't have animations to play anyway in
                // the first-load case, and subsequent changes of src could
                // lead to race conditions):
                await this[$modelLoads];
              } catch (_error) {
                // The model load was "cancelled" by rejection
                return;
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
