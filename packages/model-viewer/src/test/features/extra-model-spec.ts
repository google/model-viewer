/* @license
 * Copyright 2026 Google LLC. All Rights Reserved.
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

import {$scene} from '../../model-viewer-base.js';
import {ModelViewerElement} from '../../model-viewer.js';
import {CachingGLTFLoader} from '../../three-components/CachingGLTFLoader.js';
import {timePasses, waitForEvent} from '../../utilities.js';
import {assetPath} from '../helpers.js';

const CUBE_GLB_PATH = assetPath('models/cube.gltf');

suite('ExtraModel', () => {
  let element: ModelViewerElement;

  setup(async () => {
    element = new ModelViewerElement();
    document.body.appendChild(element);
    await timePasses();
  });

  teardown(() => {
    CachingGLTFLoader.clearCache();
    if (element.parentNode != null) {
      element.parentNode.removeChild(element);
    }
  });

  suite('declarative transforms', () => {
    test('appends extra-model and loads multiple mesh components', async () => {
      element.loading = 'eager';
      element.src = CUBE_GLB_PATH;

      const extra = document.createElement('extra-model');
      extra.setAttribute('src', CUBE_GLB_PATH);
      element.appendChild(extra);

      await waitForEvent(element, 'load');

      const scene = (element as any)[$scene];
      expect(scene).to.be.ok;
      expect(scene._models.length).to.equal(2);
    });

    test('updates position dynamically when offset changes', async () => {
      element.loading = 'eager';
      element.src = CUBE_GLB_PATH;

      const extra = document.createElement('extra-model');
      extra.setAttribute('src', CUBE_GLB_PATH);
      extra.setAttribute('offset', '1 0 0');
      element.appendChild(extra);

      await waitForEvent(element, 'load');

      const scene = (element as any)[$scene];
      expect(scene._models[1].position.x).to.equal(1);

      // Update dynamically
      extra.setAttribute('offset', '5 0 0');
      await timePasses();  // coordinates sync internally

      expect(scene._models[1].position.x).to.equal(5);
    });

    test(
        'does not calculate bounding box synchronously when offset changes',
        async () => {
          element.loading = 'eager';
          element.src = CUBE_GLB_PATH;

          const extra = document.createElement('extra-model');
          extra.setAttribute('src', CUBE_GLB_PATH);
          extra.setAttribute('offset', '1 0 0');
          element.appendChild(extra);

          await waitForEvent(element, 'load');
          const scene = (element as any)[$scene];

          // Ensure bounds are clean initially
          scene.updateBoundingBoxAndShadowIfDirty();
          const oldMaxX = scene.boundingBox.max.x;

          // Change offset
          extra.setAttribute('offset', '10 0 0');
          await timePasses();  // allow MutationObserver to trigger
                               // updateModelTransforms

          // The bounds should be dirty, but the actual boundingBox value hasn't
          // mathematically updated yet!
          expect(scene.boundsAndShadowDirty).to.be.true;
          expect(scene.boundingBox.max.x).to.equal(oldMaxX);

          // However, reading via getDimensions flushes it
          element.getDimensions();
          expect(scene.boundsAndShadowDirty).to.be.false;
          expect(scene.boundingBox.max.x).to.be.greaterThan(oldMaxX);
        });
  });

  suite('animation duration syncing', () => {
    test(
        'duration reflects the longest animation across all models',
        async () => {
          element.loading = 'eager';
          element.src = CUBE_GLB_PATH;  // Base model has no animation

          const extra = document.createElement('extra-model');
          extra.setAttribute('src', assetPath('models/Horse.glb'));
          extra.setAttribute('animation-name', 'horse_A_');
          element.appendChild(extra);

          await waitForEvent(element, 'load');
          element.play();
          await timePasses();  // Allow play state to initialize
                               // AnimationActions

          expect(element.duration)
              .to.be.greaterThan(0);  // Should be ~1 second (Horse animation)
        });
  });

  suite('hotspot attachment', () => {
    test(
        'data-model-index forces hotspot attachment to extra model',
        async () => {
          element.loading = 'eager';
          element.src = CUBE_GLB_PATH;

          const extra = document.createElement('extra-model');
          extra.setAttribute('src', CUBE_GLB_PATH);
          extra.setAttribute('offset', '5 0 0');
          element.appendChild(extra);

          const hotspot = document.createElement('button');
          hotspot.slot = 'hotspot-test';
          hotspot.setAttribute('data-model-index', '1');
          // Legacy 8-number string implies index 0 (base model). It should be
          // overridden!
          hotspot.setAttribute('data-surface', '0 0 10 11 12 0.3 0.3 0.4');
          element.appendChild(hotspot);

          await waitForEvent(element, 'load');

          const scene = (element as any)[$scene];

          // Find the internal Hotspot instance by checking children for the
          // annotation wrapper class
          const hotspotNode = scene._models[1].children.find(
              (c: any) => c.element &&
                  c.element.classList.contains('annotation-wrapper'));

          // Assert it is reparented to the extra model, NOT the base model
          expect(hotspotNode).to.be.ok;
          expect(hotspotNode.parent).to.equal(scene._models[1]);

          // Assert the internal modelIndex was coerced
          expect(hotspotNode.modelIndex).to.equal(1);
        });
  });
});
