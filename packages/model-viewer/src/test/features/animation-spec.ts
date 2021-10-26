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

import {AnimationMixin} from '../../features/animation.js';
import ModelViewerElementBase, {$scene} from '../../model-viewer-base.js';
import {timePasses, waitForEvent} from '../../utilities.js';
import {assetPath} from '../helpers.js';
import {BasicSpecTemplate} from '../templates.js';

const expect = chai.expect;
const NON_ANIMATED_GLB_PATH = assetPath('models/Astronaut.glb');
const ANIMATED_GLB_PATH = assetPath('models/RobotExpressive.glb');

const animationIsPlaying = (element: any, animationName = null): boolean => {
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

suite('ModelViewerElementBase with AnimationMixin', () => {
  let nextId = 0;
  let tagName: string;
  let ModelViewerElement: any;
  let element: any;

  setup(() => {
    tagName = `model-viewer-animation-${nextId++}`;
    ModelViewerElement = class extends AnimationMixin
    (ModelViewerElementBase) {
      static get is() {
        return tagName;
      }
    };
    customElements.define(tagName, ModelViewerElement);
  });

  BasicSpecTemplate(() => ModelViewerElement, () => tagName);

  suite('a model with animations', () => {
    setup(async () => {
      element = new ModelViewerElement();
      element.src = ANIMATED_GLB_PATH;
      document.body.insertBefore(element, document.body.firstChild);

      await waitForEvent(element, 'load');
    });

    teardown(() => {
      document.body.removeChild(element);
    });

    test('remains in a paused state', () => {
      expect(element.paused).to.be.true;
    });

    suite('when play is invoked', () => {
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

      suite('when pause is invoked', () => {
        setup(async () => {
          const animationsPause = waitForEvent(element, 'pause');
          element.pause();
          await animationsPause;
        });

        test('animations pause', () => {
          expect(animationIsPlaying(element)).to.be.false;
        });

        test('changing currentTime triggers render', () => {
          element.currentTime = 5;
          expect(element[$scene].shouldRender()).to.be.true;
        });
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
      });
    });
  });
});
