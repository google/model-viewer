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
 * istributed under the License is distributed on an 'AS IS' BASIS,
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
import './components/animation_controls/animation_controls.js'; // from //vr/ads/editor/space_opera/components/animation_controls
import './components/camera_settings/camera_settings.js'; // from //vr/ads/editor/space_opera/components/camera_settings
import './components/download_button/download_button.js'; // from //vr/ads/editor/space_opera/components/download_button
import './components/file_modal/file_modal.js'; // from //vr/ads/editor/space_opera/components/file_modal
import './components/hotspot_panel/hotspot_panel.js'; // from //vr/ads/editor/space_opera/components/hotspot_panel
import './components/ibl_selector/ibl_selector.js'; // from //vr/ads/editor/space_opera/components/ibl_selector
import './components/materials_panel/materials_panel.js'; // from //vr/ads/editor/space_opera/components/materials_panel
import './components/open_button/open_button.js'; // from //vr/ads/editor/space_opera/components/open_button
import './components/model_editor/model_editor.js'; // from //vr/ads/editor/space_opera/components/model_editor
import './components/model_viewer_preview/model_viewer_preview.js'; // from //vr/ads/editor/space_opera/components/model_viewer_preview
import './components/model_viewer_snippet/model_viewer_snippet.js'; // from //vr/ads/editor/space_opera/components/model_viewer_snippet
import './components/inspector/inspector.js'; // from //vr/ads/editor/space_opera/components/inspector
import './components/shared/tabs/tabs.js'; // from //vr/ads/editor/space_opera/components/shared/tabs
