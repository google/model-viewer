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
export const styles: CSSResult = css`/* Panel */
:host {
  --editor-panel-width: 360px;
  --body-font-size: 13px;
  /* Material color google grey 300 */
  --text-color: #dadce0;
}

/* Text */
.EditorViewRoot {
  font-size: var(--body-font-size);
  line-height: 1.25rem;
}

.EditorViewRoot .EditorLabel {
  color: var(--text-color);
  padding: 0;
}

.EditorHeaderLabel {
  color: #f8f9fa;
  font-family: 'Google Sans';
  font-size: 16px;
  letter-spacing: .1px;
  line-height: 48px;
  margin: 0 15px;
}

.Spacer {
  background-color: #2b2d30;
  display: flex;
  height: 2px;
}

.EditorPanel {
  width: var(--editor-panel-width);
}
`;
