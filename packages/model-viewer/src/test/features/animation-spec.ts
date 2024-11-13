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

import {expect} from 'chai';

import {$scene} from '../../model-viewer-base.js';
import {ModelViewerElement} from '../../model-viewer.js';
import {timePasses, waitForEvent} from '../../utilities.js';
import {assetPath} from '../helpers.js';

const TOLERANCE_SEC = 0.1;
const NON_ANIMATED_GLB_PATH = assetPath('models/Astronaut.glb');
const ANIMATED_GLB_PATH = assetPath('models/RobotExpressive.glb');
const ANIMATED_GLB_DUPLICATE_ANIMATION_NAMES_PATH =
    assetPath('models/DuplicateAnimationNames.glb');

const animationIsPlaying = (element: any, animationName?: string): boolean => {
  const {currentAnimationAction} = element[$scene];

  if (currentAnimationAction != null &&
      (animationName == null ||
       currentAnimationAction.getClip().name === animationName)) {
    return element.paused === false &&
        currentAnimationAction.enabled === true &&
        !currentAnimationAction.paused;
  }

  return false;
};

const animationWithIndexIsPlaying = (element: any, animationIndex = 0):
    boolean => {
      const {currentAnimationAction} = element[$scene];
      const {_currentGLTF} = element[$scene];

      if (currentAnimationAction != null && animationIndex >= 0 &&
          animationIndex < _currentGLTF.animations.length &&
          currentAnimationAction.getClip() ==
              _currentGLTF.animations[animationIndex]) {
        return element.paused === false &&
            currentAnimationAction.enabled === true &&
            !currentAnimationAction.paused;
      }

      return false;
    }

suite('Animation', () => {
  suite('a model with animations', () => {
    let element: ModelViewerElement;

    setup(async () => {
      element = new ModelViewerElement();
      element.src = ANIMATED_GLB_PATH;
      document.body.insertBefore(element, document.body.firstChild);

      await waitForEvent(element, 'poster-dismissed');
    });

    teardown(() => {
      document.body.removeChild(element);
    });

    test('remains in a paused state', () => {
      expect(element.paused).to.be.true;
    });

    suite('when play is invoked with no options', () => {
      setup(async () => {
        const animationsPlay = waitForEvent(element, 'play');
        element.play();
        await animationsPlay;
      });

      test('animations play', async () => {
        expect(animationIsPlaying(element)).to.be.true;
      });

      test('has a duration greater than 0', () => {
        expect(element.duration).to.be.greaterThan(0);
      });

      suite('when pause is invoked after a delay', () => {
        const delaySeconds = 0.2;
        setup(async () => {
          await timePasses(1000 * delaySeconds);
          const animationsPause = waitForEvent(element, 'pause');
          element.pause();
          await animationsPause;
        });

        test('animations pause', () => {
          expect(animationIsPlaying(element)).to.be.false;
        });

        test.skip('has a current time close to the delay', () => {
          expect(element.currentTime)
              .to.be.closeTo(delaySeconds, TOLERANCE_SEC);
        });

        test('changing currentTime triggers render', () => {
          element.currentTime = 5;
          expect(element[$scene].shouldRender()).to.be.true;
        });

        suite('when play is invoked again', () => {
          setup(async () => {
            const animationsPlay = waitForEvent(element, 'play');
            element.play();
            await animationsPlay;
          });

          test('animations play', () => {
            expect(animationIsPlaying(element)).to.be.true;
          });

          test('has a duration greater than 0', () => {
            expect(element.duration).to.be.greaterThan(0);
          });

          test.skip('has a current time close to the delay', () => {
            expect(element.currentTime)
                .to.be.closeTo(delaySeconds, TOLERANCE_SEC);
          });
        })
      });
    });

    suite('when play is invoked with options', () => {
      setup(async () => {
        element.animationName = 'Punch';
        await element.updateComplete;
        const animationsPlay = waitForEvent(element, 'play');
        element.play({repetitions: 2, pingpong: true});
        await animationsPlay;
      });

      test.skip('plays forward, backward, and stops', async () => {
        await timePasses(element.duration * 0.8 * 1000);
        expect(animationIsPlaying(element), 'failed to start playing!')
            .to.be.true;
        const t = element.currentTime;

        await timePasses(element.duration * 1.0 * 1000);
        expect(animationIsPlaying(element), 'not playing after 1.8 * duration!')
            .to.be.true;
        expect(element.currentTime, 'not playing backwards!').to.be.lessThan(t);

        await timePasses(element.duration * 0.4 * 1000);
        expect(animationIsPlaying(element), 'failed to stop playing!')
            .to.be.false;
        expect(element.currentTime, 'did not return to beginning of animation!')
            .to.be.equal(0);
      });
    });

    suite('when configured to autoplay', () => {
      setup(async () => {
        element.autoplay = true;
        await timePasses();
      });

      test('plays an animation', () => {
        expect(animationIsPlaying(element)).to.be.true;
      });

      test('has a duration greater than 0', () => {
        expect(element.duration).to.be.greaterThan(0);
      });

      test('plays the first animation by default', () => {
        expect(animationIsPlaying(element, element.availableAnimations[0]))
            .to.be.true;
      });

      suite('with a specified animation-name', () => {
        setup(async () => {
          element.animationName = element.availableAnimations[1];
          await timePasses();
        });

        test('plays the specified animation', () => {
          expect(animationIsPlaying(element, element.availableAnimations[1]))
              .to.be.true;
        });
      });

      suite('with an invalid animation-name', () => {
        setup(async () => {
          element.animationName = 'invalid-animation-name';
          await timePasses();
        });

        test('plays the first animation', () => {
          expect(animationIsPlaying(element, element.availableAnimations[0]))
              .to.be.true;
        });
      });

      suite('with a specified index as animation-name', () => {
        setup(async () => {
          element.animationName = '1';
          await timePasses();
        });

        test('plays the specified animation', () => {
          expect(animationWithIndexIsPlaying(element, 1)).to.be.true;
        });
      });

      suite('with an invalid index as animation-name', () => {
        setup(async () => {
          element.animationName = '-1';
          await timePasses();
        });

        test('plays the first animation', () => {
          expect(animationWithIndexIsPlaying(element, 0)).to.be.true;
        });
      });

      suite('a model with duplicate animation names', () => {
        setup(async () => {
          element.src = ANIMATED_GLB_DUPLICATE_ANIMATION_NAMES_PATH;
          await waitForEvent(element, 'load');
          element.animationName = '1';
          await timePasses();
        });

        test('plays the specified animation', () => {
          expect(animationWithIndexIsPlaying(element, 1)).to.be.true;
        });

        suite('when playing a duplicate animation by name', () => {
          setup(async () => {
            element.animationName = element.availableAnimations[1];
            await timePasses();
          });

          test(
              'fails to play the specified animation and plays the last animation with that name instead',
              () => {
                expect(animationWithIndexIsPlaying(element, 3)).to.be.true;
              });
        });
      });

      suite('a model without animations', () => {
        setup(async () => {
          element.src = NON_ANIMATED_GLB_PATH;
          await waitForEvent(element, 'load');
        });

        test('does not play an animation', () => {
          expect(animationIsPlaying(element)).to.be.false;
        });

        test('has a duration of 0', () => {
          expect(element.duration).to.be.equal(0);
        });

        suite('with a specified animation-name', () => {
          setup(async () => {
            element.animationName = element.availableAnimations[1];
            await timePasses();
          });

          test('does not play an animation', () => {
            expect(animationIsPlaying(element)).to.be.false;
          });
        });

        suite('with a specified animation by index', () => {
          setup(async () => {
            element.animationName = '1';
            await timePasses();
          });

          test('does not play an animation', () => {
            expect(animationIsPlaying(element)).to.be.false;
          });
        });
      });
    });
  });
});
