/*
 * Copyright 2018 Google Inc. All Rights Reserved.
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
import {assetPath, timePasses, waitForEvent} from '../helpers.js';
import {BasicSpecTemplate} from '../templates.js';

const expect = chai.expect;
const NON_ANIMATED_GLB_PATH = assetPath('Astronaut.glb');
const ANIMATED_GLB_PATH = assetPath('RobotExpressive.glb');

const animationIsPlaying = (element: any, animationName = null): boolean => {
  const {currentAnimationAction} = element[$scene].model;

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
      document.body.appendChild(element);

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

      test('animations can be paused', async () => {
        const animationsPause = waitForEvent(element, 'pause');
        element.pause();
        await animationsPause;
        expect(animationIsPlaying(element)).to.be.false;
      });
    });
  });

  suite('when configured to autoplay', () => {
    setup(() => {
      element = new ModelViewerElement();
      element.autoplay = true;
      document.body.appendChild(element);
    });

    teardown(() => {
      document.body.removeChild(element);
    });

    suite('a model with animations', () => {
      setup(async () => {
        element.src = ANIMATED_GLB_PATH;
        await waitForEvent(element, 'load');
      });

      test('plays an animation', () => {
        expect(animationIsPlaying(element)).to.be.true;
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
    });

    suite('a model without animations', () => {
      setup(async () => {
        element.src = NON_ANIMATED_GLB_PATH;
        await waitForEvent(element, 'load');
      });

      test('does not play an animation', () => {
        expect(animationIsPlaying(element)).to.be.false;
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
