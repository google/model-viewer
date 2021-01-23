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

import ModelViewerElementBase from '../../model-viewer-base.js';
import {$evictionPolicy, CachingGLTFLoader} from '../../three-components/CachingGLTFLoader.js';
import {ModelViewerGLTFInstance} from '../../three-components/gltf-instance/ModelViewerGLTFInstance.js';
import {assetPath} from '../helpers.js';

const expect = chai.expect;

const ModelViewerElement = class extends ModelViewerElementBase {
  static get is() {
    return 'model-viewer-loader';
  }
};

customElements.define('model-viewer-loader', ModelViewerElement);

const ASTRONAUT_GLB_PATH = assetPath('models/Astronaut.glb');

suite('CachingGLTFLoader', () => {
  suite('when loading a glTF', () => {
    let loader: CachingGLTFLoader;
    let element: ModelViewerElementBase;

    setup(() => {
      loader = new CachingGLTFLoader(ModelViewerGLTFInstance);
      element = new ModelViewerElement();
    });

    teardown(() => {
      CachingGLTFLoader.clearCache();
    });

    suite('before glTF is loaded', () => {
      test('reports that it has not finished loading', async () => {
        const fileLoads = loader.load(ASTRONAUT_GLB_PATH, element);
        try {
          expect(CachingGLTFLoader.hasFinishedLoading(ASTRONAUT_GLB_PATH))
              .to.be.false;
        } finally {
          await fileLoads;
        }
      });
    });

    suite('after glTF is loaded', () => {
      test('reports that it has finished loading', async () => {
        await loader.load(ASTRONAUT_GLB_PATH, element);
        expect(CachingGLTFLoader.hasFinishedLoading(ASTRONAUT_GLB_PATH))
            .to.be.true;
      });
    });

    test('synchronously populates the cache', async () => {
      const fileLoads = loader.load(ASTRONAUT_GLB_PATH, element);
      try {
        expect(CachingGLTFLoader.has(ASTRONAUT_GLB_PATH)).to.be.true;
      } finally {
        await fileLoads;
      }
    });

    test('yields a promise that resolves a group', async () => {
      const {scene} = await loader.load(ASTRONAUT_GLB_PATH, element);
      expect(scene).to.be.ok;
      expect(scene!.type).to.be.equal('Group');
    });

    suite('with items outside of the eviction threshold', () => {
      let naturalEvictionThreshold: number;

      setup(() => {
        naturalEvictionThreshold = loader[$evictionPolicy].evictionThreshold;
        loader[$evictionPolicy].evictionThreshold = 0;
      });

      teardown(() => {
        loader[$evictionPolicy].evictionThreshold = naturalEvictionThreshold;
      });

      test('deletinates them when they are fully released', async () => {
        const gltf = await loader.load(ASTRONAUT_GLB_PATH, element);

        expect(CachingGLTFLoader.has(ASTRONAUT_GLB_PATH)).to.be.true;
        gltf.dispose();
        expect(CachingGLTFLoader.has(ASTRONAUT_GLB_PATH)).to.be.false;
      });
    });
  });
});
