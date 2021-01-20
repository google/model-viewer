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

import {css, CSSResult} from 'lit-element';
export const styles: CSSResult = css`
.outer-container {
  background-color: black;
  padding: 10px;
  overflow: auto;
  white-space: nowrap;
  display: flex;
  align-items: center;
}

.inner-container {
  display: flex;
  align-items: center;
  margin-left: auto;
  margin-right: auto;
  opacity: 1;
  text-decoration: none;
}

.inner-container:hover {
  opacity: .5;
}

.icon-button {
  margin-left: -4px;
  margin-right: 8px;
  width: 34px;
  height: 34px;
  background-size: 34px;
  background-repeat: no-repeat;
  display: inline-block;
  cursor: pointer;
  background-position: 50% 50%;
  opacity: 1;
  background-image: url(./assets/ic_modelviewer.svg);
}

.attribute {
  display: flex;
  align-items: center;
  font-size: 1.1em;
  color: #FFFFFF;
  white-space: pre-wrap !important;
  font-family: 'Roboto Mono', monospace;
  opacity: 1;
}
`;
