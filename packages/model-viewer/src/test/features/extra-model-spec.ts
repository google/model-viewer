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
        await timePasses(); // coordinates sync internally
        
        expect(scene._models[1].position.x).to.equal(5);
    });
  });
});
