/**
 * @license
 * Copyright 2021 Google LLC. All Rights Reserved.
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
export const styles: CSSResult = css`
.outer-container {
  align-items: center;
  background-color: #efefef;
  display: flex;
  overflow: auto;
  padding: 10px;
  white-space: nowrap;
}

.inner-container {
  align-items: center;
  display: flex;
  margin-left: auto;
  margin-right: auto;
  opacity: 1;
  text-decoration: none;
}

.inner-container:hover {
  opacity: .5;
}

.icon-button {
  background-image: url(https://modelviewer.dev/shared-assets/icons/ic_modelviewer.svg);
  background-position: 50% 50%;
  background-repeat: no-repeat;
  background-size: 34px;
  cursor: pointer;
  display: inline-block;
  height: 34px;
  margin-left: -4px;
  margin-right: 8px;
  width: 34px;
}

.attribute {
  align-items: center;
  color: black;
  display: flex;
  font-family: 'Roboto Mono', monospace;
  font-size: 1.4em;
  white-space: pre-wrap !important;
}
`;
