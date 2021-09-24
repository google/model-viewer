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

/**
 * @fileoverview Model editor for uploading, parsing, modifying GLTF/GLB files.
 */

import '@material/mwc-button';
import '@polymer/paper-dialog/paper-dialog';
// The order of imports is important, as this is the order in which their
// stateChanged() methods will be called. We put the preview first to apply
// changes to the <model-viewer> element in case they need to be queried by
// subsequent components. Keep in mind that those will still have to await
// updateComplete since rendering is async in Lit Element.
import './components/model_viewer_preview/model_viewer_preview.js';
import './components/animation_controls/animation_controls.js';
import './components/camera_settings/camera_settings.js';
import './components/model_viewer_snippet/components/download_button.js';
import './components/hotspot_panel/hotspot_panel.js';
import './components/ibl_selector/ibl_selector.js';
import './components/materials_panel/materials_panel.js';
import './components/model_viewer_snippet/components/open_button.js';
import './components/model_viewer_snippet/components/validation.js';
import './components/model_editor/model_editor.js';
import './components/model_viewer_snippet/model_viewer_snippet.js';
import './components/inspector/inspector.js';
import './components/shared/tabs/tabs.js';
import './components/shared/mv_link/mv_link.js';
import './components/mobile_view/mobile_view.js';
import './components/mobile_view/open_mobile_view.js';
import './components/mobile_view/components/mobile_modal.js';
import './components/mobile_view/components/mobile_expandable_section.js';
import './components/best_practices/best_practices.js';
