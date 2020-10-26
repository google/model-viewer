// /**
//  * @license
//  * Copyright 2020 Google LLC. All Rights Reserved.
//  * Licensed under the Apache License, Version 2.0 (the 'License');
//  * you may not use this file except in compliance with the License.
//  * You may obtain a copy of the License at
//  *
//  *     http://www.apache.org/licenses/LICENSE-2.0
//  *
//  * Unless required by applicable law or agreed to in writing, software
//  * distributed under the License is distributed on an 'AS IS' BASIS,
//  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  * See the License for the specific language governing permissions and
//  * limitations under the License.
//  *
//  */

// import {GlTf, GltfModel} from
// '@google/model-viewer-editing-adapter/lib/main.js'
// import {createSafeObjectUrlFromArrayBuffer} from
// '@google/model-viewer-editing-adapter/lib/util/create_object_url.js' import *
// as Redux from 'redux';  // from
// //third_party/javascript/redux:redux_closurized

// import {ModelViewerPreview} from
// '../../components/model_viewer_preview/model_viewer_preview.js';
// import {dispatchGltfUrl} from
// '../../components/model_viewer_preview/reducer.js'; import {rootReducer} from
// '../../reducers.js'; import {until} from '../utils/test_utils.js';

// fdescribe('ModelViewerPreview', () => {
//   let preview: ModelViewerPreview;
//   let reduxStore: any;

//   beforeEach(async () => {
//     reduxStore = Redux.createStore(rootReducer);
//     expect(reduxStore.getState().modelViewerInfo.modelViewer).toBeUndefined();
//     preview = new ModelViewerPreview();
//     document.body.appendChild(preview);
//     await preview.updateComplete;
//   });

// afterEach(async () => {
//   document.body.removeChild(preview);
// });

//   it('registers a model viewer element to state', () => {
//     expect(reduxStore.getState().modelViewerInfo.modelViewer).toBeTruthy();
//   });

//   it('updates ', async () => {
//     const gltfJson = {
//       asset: {'generator': 'FBX2glTF', 'version': '2.0'},
//     } as GlTf;
//     const gltf = new GltfModel(gltfJson, null);
//     const url =
//         createSafeObjectUrlFromArrayBuffer(await gltf.packGlb()).unsafeUrl;
//     expect(reduxStore.getState().gltfInfo.gltf).toBeUndefined();
//     reduxStore.dispatch(dispatchGltfUrl(url));
//     // It may be several event loops before the preview downloads the
//     model,so
//     // loop until it happens. This will timeout if there is a bug.
//     await until(() => reduxStore.getState().gltfInfo.gltf !== undefined);
//   });
// });
