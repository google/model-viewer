/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
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
 *
 */

import '../../components/model_viewer_preview/model_viewer_preview.js';

import {GlTf, GltfModel} from '@google/model-viewer-editing-adapter/lib/main.js'
import {createSafeObjectUrlFromArrayBuffer} from '@google/model-viewer-editing-adapter/lib/util/create_object_url.js';

import {getModelViewer} from '../../components/model_viewer_preview/model_viewer.js';
import {ModelViewerPreview} from '../../components/model_viewer_preview/model_viewer_preview.js';
import {getGltfModel} from '../../components/model_viewer_preview/reducer.js';
import {dispatchGltfUrl} from '../../components/model_viewer_preview/reducer.js';
import {reduxStore} from '../../space_opera_base.js';
import {until} from '../utils/test_utils.js';

xdescribe('ModelViewerPreview', () => {
  let preview: ModelViewerPreview;

  beforeEach(async () => {
    expect(getModelViewer()).toBeUndefined();
    preview = new ModelViewerPreview();
    document.body.appendChild(preview);
    await preview.updateComplete;
  });

  afterEach(async () => {
    document.body.removeChild(preview);
  });

  it('registers a model viewer element to state', () => {
    expect(getModelViewer()).toBeTruthy();
  });

  it('updates ', async () => {
    const gltfJson = {
      asset: {'generator': 'FBX2glTF', 'version': '2.0'},
    } as GlTf;
    const gltf = new GltfModel(gltfJson, null);
    const url =
        createSafeObjectUrlFromArrayBuffer(await gltf.packGlb()).unsafeUrl;
    await preview.updateComplete;
    expect(getGltfModel(reduxStore.getState())).toBeUndefined();
    reduxStore.dispatch(dispatchGltfUrl(url));
    // It may be several event loops before the preview downloads the model, so
    // loop until it happens. This will timeout if there is a bug.
    await until(() => getGltfModel(reduxStore.getState()) !== undefined);
  });
});
