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


import {css, CSSResult} from 'lit';
export const styles: CSSResult = css`:host {
  --input-background: #3c4043;
  --input-font-color: #dadce0;
  display: block;
}

.EditorDropdown {
  width: 100%;
  border-radius: 4px;
  background-color: var(--input-background);
  --primary-text-color: #f8f9fa;
  --primary-background-color: var(--input-background);
  --paper-input-container-shared-input-style_-_padding: 0 5px;
  --paper-input-container-shared-input-style_-_line-height: 24px;
  --paper-input-container-underline-color: none;
  --paper-input-container-underline-focus-color: none;
}

/* @overrideSelector {quantum.wiz.menu.paperselect} */
.EditorDropdown .exportSelectPopup {
  border-radius: 4px;
  overflow: none;
}

::slotted(paper-item) {
  font-weight: normal;
  color: var(--input-font-color);
  padding: 6px 24px;
  --primary-background-color: var(--input-background);
  --paper-item-min-height: none;
}
`;
