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

import {css, CSSResult} from 'lit-element';

export const cameraSettingsStyles: CSSResult = css`
.SaveCameraButton,
me-camera-orbit-editor,
me-camera-target-input {
  margin-top: 10px;
}

.note {
  color: var(--text-on-expandable-background);
  margin-left: 15px;
}

.Orbit {
  border-radius: 4px;
  display: inline-flex;
  justify-content: space-between;
  padding: 6px 12px;
  overflow: hidden;
  background: var(--number-input-background);
  min-width: 60px;
  color: var(--text-on-expandable-background);
}

.error {
  color: #FFEBEE;
  margin-top: 5px;
}

.initialError {
  border: 1px solid #E53935;
  background: #EF5350;
}
`;

export const zoomStyles: CSSResult = css`
.ZoomTitle {
  color: var(--text-on-expandable-background);
}

.max {
  padding-top: 10px;
}
`;

export const fileModalStyles: CSSResult = css`
input[type="file"] {
  display: none;
}
`;

export const hotspotEditorStyles: CSSResult = css`
:host {
  border-radius: 3px;
  border: 1px solid rgba(218,220,224,0.122);
  padding: 5px;
  display: block;
  margin-bottom: 10px;
}

textarea {
  outline: none;
  resize: vertical;
  width: 100%;
}
`;

export const iblSelectorStyles: CSSResult = css`
.HeaderLabel {
  font-size: 14px;
  font-weight: 500;
}

.defaultError {
  margin-top: 0;
  margin-left: 15px;
  color: #FFFFFF;
}

.EnvironmnetImageDropdown,
.UploadButton,
.Row {
  margin-top: 10px;
}
`;

export const posterControlsStyles: CSSResult = css`
.PosterButton {
  margin-bottom: 10px;
  display: block;
}

.PosterHelperButtons {
  padding-left: 30px;
}

mwc-button {
  --mdc-button-disabled-fill-color: #ddd;
  --mdc-button-disabled-ink-color: #fff;
}
`;

export const modelViewerPreviewStyles: CSSResult = css`
model-viewer {
  cursor: -webkit-grab;
  cursor: -moz-grab;
  display: flex;
  height: 100%;
  width: 100%;
  overflow: hidden;
  position: relative;
  user-select: none;
  width: 100%;
}

.ScreenShotButton {
  border-radius: 50%;
  border: 1px #4285f4 solid;
  bottom: 25px;
  color: #4285f4; /* MATERIAL_COLOR_GOOGLE_BLUE_500 */;
  position: absolute;
  right: 25px;
}

.HelpText {
  font-family: Roboto;
  font-size: 20pt;
  text-align: center;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.HelpText small {
  font-size: 12pt;
}

.ErrorText {
  font-family: Roboto;
  color: darkred;
  font-size: 20pt;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
`;

export const openModalStyles: CSSResult = css`
paper-dialog {
  background: var(--expandable-section-background);
  top: 20%;
}

.SnippetModal {
  min-width: 800px;
}

.FileModalContainer {
  height: auto;
  max-width: 800px;
  margin-top: 20px;
  margin-bottom: 20px;
}

.FileModalHeader {
  font-size: 24px;
  color: var(--expandable-section-text);
  margin-bottom: 20px;
}

.SaveButton {
  margin-right: 5px;
}

.FileModalCancel {
  position: absolute;
  top: 10px;
  right: 24px;
  margin: 0;
  padding: 0;
}

input[type="file"] {
  display: none;
}

#mv-input {
  width: 100%;
}

.InnerSnippetModal {
  padding-top: 10px;
  width: 100%;
}
`;

// https://www.w3schools.com/howto/howto_js_snackbar.asp
export const toastStyles: CSSResult = css`
#snackbar {
  visibility: hidden;
  min-width: 250px;
  margin-left: -125px;
  background-color: #FF9800;
  color: white;
  text-align: center;
  border-radius: 2px;
  padding: 16px;
  position: fixed;
  z-index: 20;
  left: 20%;
  bottom: 30px;
  font-size: 17px;
}

#snackbar.show {
  visibility: visible;
  -webkit-animation: fadein 0.5s, fadeout 0.5s 3.5s;
  animation: fadein 0.5s, fadeout 0.5s 3.5s;
}

@-webkit-keyframes fadein {
  from {bottom: 0; opacity: 0;} 
  to {bottom: 30px; opacity: 1;}
}

@keyframes fadein {
  from {bottom: 0; opacity: 0;}
  to {bottom: 30px; opacity: 1;}
}

@-webkit-keyframes fadeout {
  from {bottom: 30px; opacity: 1;} 
  to {bottom: 0; opacity: 0;}
}

@keyframes fadeout {
  from {bottom: 30px; opacity: 1;}
  to {bottom: 0; opacity: 0;}
}
`