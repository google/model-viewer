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

import '../renderer-gate.js';

import {expect} from 'chai';
import {LoopRepeat, Matrix4, Mesh, SphereGeometry, Vector3} from 'three';

import {$scene} from '../../model-viewer-base.js';
import {ModelViewerElement} from '../../model-viewer.js';
import {ModelScene} from '../../three-components/ModelScene.js';
import {assetPath} from '../helpers.js';

suite('ModelScene', () => {
  let element: ModelViewerElement;
  let scene: ModelScene;
  let dummyRadius: number;
  let dummyMesh: Mesh;

  setup(() => {
    // Set the radius of the sphere to 0.5 so that it's size is 1
    // for testing scaling.
    dummyRadius = 0.5;
    dummyMesh = new Mesh(new SphereGeometry(dummyRadius, 32, 32));
    element = new ModelViewerElement();
    scene = element[$scene];

    document.body.insertBefore(element, document.body.firstChild);
  });

  teardown(() => {
    document.body.removeChild(element);
  });

  suite('with a model', () => {
    setup(async () => {
      await scene.setSource(assetPath('models/soldier.glb'));
    });

    suite('setShadowIntensity', () => {
      test('can increase intensity and reset it to zero', () => {
        scene.setShadowIntensity(1);
        const shadow = scene.shadow!;
        expect(shadow).to.be.ok;
        expect(shadow.getIntensity()).to.be.equal(1);
        scene.setShadowIntensity(0);
        expect(shadow.getIntensity()).to.be.equal(0);
      });

      test('shadow is only created when intensity is greater than zero', () => {
        expect(scene.shadow).to.be.not.ok;
        scene.setShadowIntensity(1);
        expect(scene.shadow).to.be.ok;
      });
    });

    test('can append and play an animation', () => {
      expect(scene.animationNames.length).to.be.greaterThan(0);
      const animationName = scene.animationNames[0];
      scene.appendAnimation(animationName);
      expect(scene.appendedAnimations).to.include(animationName);
    });

    test('can detach an appended animation', () => {
      expect(scene.animationNames.length).to.be.greaterThan(0);
      const animationName = scene.animationNames[0];
      scene.appendAnimation(animationName);
      expect(scene.appendedAnimations).to.include(animationName);
      scene.detachAnimation(animationName, false);
      expect(scene.appendedAnimations).to.not.include(animationName);
    });

    test('forgets appended animations when the source changes', async () => {
      const animationName = scene.animationNames[0];
      scene.appendAnimation(animationName);
      // Re-appending an appended animation with needsToStop marks it
      scene.appendAnimation(
          animationName, LoopRepeat, 2, 1, 1, false, false, true, null, true);
      expect(scene.appendedAnimations).to.include(animationName);
      expect(scene.markedAnimations).to.not.be.empty;

      await scene.setSource(assetPath('models/Horse.glb'));

      expect(scene.appendedAnimations).to.be.empty;
      expect(scene.markedAnimations).to.be.empty;
    });

    suite('appending an animation again', () => {
      let animationName: string;
      let duration: number;

      // The action of the appended animation (on the only model).
      const getAction = () => {
        const clip = (scene as any).animationsByName.get(animationName);
        return (scene as any).mixers[0].existingAction(clip);
      };

      // Advances the animations by the given number of seconds, in frames.
      const advance = (seconds: number) => {
        const step = 1 / 60;
        for (let t = 0; t < seconds; t += step) {
          scene.updateAnimation(step);
        }
      };

      function append(
          repetitionCount: number,
          timeScale: number,
          time: number|null = null) {
        scene.appendAnimation(
            animationName,
            LoopRepeat,
            repetitionCount,
            1,
            timeScale,
            false,
            false,
            true,
            time);
      }

      setup(() => {
        animationName = scene.animationNames[0];
        duration = (scene as any).animationsByName.get(animationName).duration;
        scene.unpauseAnimation();
      });

      test('restarts a finished reverse animation from scratch', () => {
        append(2, -1);
        advance(duration * 3);
        expect(getAction().paused, 'reverse run has not finished').to.be.true;
        expect(getAction().time).to.be.equal(0);

        append(2, 1);
        advance(duration * 1.5);

        expect(getAction().paused, 'second repetition was cut short')
            .to.be.false;
        expect(getAction().time).to.be.closeTo(duration * 0.5, 0.1);
      });

      test('applies the time option to a finished animation', () => {
        append(1, 1);
        advance(duration * 1.5);
        expect(getAction().paused, 'forward run has not finished').to.be.true;
        expect(getAction().time).to.be.equal(duration);

        append(1, -1, duration);
        expect(getAction().time).to.be.equal(duration);

        advance(duration * 0.5);

        expect(getAction().paused, 'reverse run has finished').to.be.false;
        expect(getAction().time).to.be.closeTo(duration * 0.5, 0.1);
      });

      test('restarts a faded-out animation from scratch', () => {
        append(2, 1);
        advance(duration * 1.5);
        scene.detachAnimation(animationName, 0.1);
        advance(0.2);
        expect(getAction().enabled, 'fade-out has not finished').to.be.false;

        append(2, 1);
        expect(getAction().time).to.be.equal(0);

        advance(duration * 1.5);

        expect(getAction().paused, 'second repetition was cut short')
            .to.be.false;
        expect(getAction().time).to.be.closeTo(duration * 0.5, 0.1);
      });

      test('resumes an animation paused with a time scale of 0', () => {
        append(Infinity, 1);
        advance(duration * 0.5);
        append(Infinity, 0);
        advance(duration * 0.25);
        append(Infinity, 1);

        expect(getAction().time).to.be.closeTo(duration * 0.5, 0.1);
      });

      test('applies the new repetitions to a finished animation', () => {
        append(1, 1);
        advance(duration * 1.5);
        expect(getAction().paused, 'forward run has not finished').to.be.true;

        append(3, 1);
        advance(duration * 1.5);

        expect(getAction().paused, 'the previous repetitions were used')
            .to.be.false;
        expect(getAction().time).to.be.closeTo(duration * 0.5, 0.1);
      });

      test('resumes an animation halted by a warp to 0', () => {
        append(Infinity, 1);
        advance(duration * 0.5);
        // Warps from the current time scale (1) to 0 in 0.1s.
        scene.appendAnimation(
            animationName, LoopRepeat, Infinity, 1, 0, false, 0.1, true, null);
        advance(0.2);
        expect(getAction().paused, 'warp has not halted the action').to.be.true;
        const haltedTime = getAction().time;

        append(Infinity, 1);

        expect(getAction().time).to.be.equal(haltedTime);
        expect(getAction().paused).to.be.false;
      });
    });

    suite('appendAnimation repetitionCount validation', () => {
      // Returns the repetitionCount-related warnings emitted while appending the
      // first animation with the given repetitionCount.
      const repetitionWarnings = (repetitionCount: any): string[] => {
        const warnings: string[] = [];
        const originalWarn = console.warn;
        console.warn = (...args: any[]) => void warnings.push(args.join(' '));
        try {
          scene.appendAnimation(
              scene.animationNames[0], LoopRepeat, repetitionCount);
        } finally {
          console.warn = originalWarn;
        }
        return warnings.filter((w) => w.includes('repetitionCount'));
      };

      test('a valid numeric value does not warn', () => {
        expect(repetitionWarnings(1)).to.be.empty;
      });

      test('Infinity (the default) does not warn', () => {
        expect(repetitionWarnings(Infinity)).to.be.empty;
      });

      test('a numeric value < 1 warns', () => {
        expect(repetitionWarnings(0)).to.have.lengthOf(1);
      });

      test('NaN warns', () => {
        expect(repetitionWarnings(NaN)).to.have.lengthOf(1);
      });

      test('a numeric string >= 1 does not warn', () => {
        expect(repetitionWarnings('3')).to.be.empty;
      });

      test('a numeric string < 1 warns', () => {
        expect(repetitionWarnings('0')).to.have.lengthOf(1);
      });

      test('a non-numeric string warns', () => {
        expect(repetitionWarnings('abc')).to.have.lengthOf(1);
      });
    });
  });

  suite('setSize', () => {
    test('updates visual and buffer size', () => {
      scene.setSize(500, 200);
      expect(scene.width).to.be.equal(500);
      expect(scene.height).to.be.equal(200);
    });

    test('model is not scaled', async () => {
      dummyMesh.geometry.applyMatrix4(new Matrix4().makeScale(1, 3, 10));
      await scene.setObject(dummyMesh);

      scene.setSize(1000, 500);
      expect(scene.scale).to.be.eql(new Vector3(1, 1, 1));
    });

    test('idealCameraDistance is set correctly', async () => {
      await scene.setObject(dummyMesh);

      scene.framedFoVDeg = 25;
      const halfFov = (scene.framedFoVDeg / 2) * Math.PI / 180;
      const expectedDistance = dummyRadius / Math.sin(halfFov);
      expect(scene.idealCameraDistance())
          .to.be.closeTo(expectedDistance, 0.0001);
    });

    test('idealAspect is set correctly', async () => {
      scene.framedFoVDeg = 25;
      await scene.setObject(dummyMesh);

      expect(scene.idealAspect).to.be.closeTo(1, 0.001);
    });

    test('cannot set the canvas smaller than 1x1', () => {
      scene.setSize(0, 0);
      expect(scene.width).to.be.equal(1);
      expect(scene.height).to.be.equal(1);
    });
  });
});