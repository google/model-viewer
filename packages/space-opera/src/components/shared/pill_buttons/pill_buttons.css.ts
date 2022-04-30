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
  --material-color-google-grey-300: #dadce0;
  --material-color-google-blue-500: #4285f4;
}

.PillButtons {
  display: flex;
}

::slotted(*:first-child) label {
  border-bottom-left-radius: 2px;
  border-top-left-radius: 2px;
  margin-left: 0px;
}

::slotted(*:last-child) label {
  border-bottom-right-radius: 2px;
  border-top-right-radius: 2px;
}

.PillRadio {
  flex: 1 1 50%;
}

.PillRadioInput {
  display: none;
}

.PillRadioInput + .RadioLabel {
  border: 1px solid transparentize(var(--material-color-google-grey-300), 0.88);
  box-sizing: border-box;
  color: var(--material-color-google-grey-300);
  cursor: pointer;
  display: inline-block;
  font-family: 'Google Sans';
  font-weight: 500;
  height: 35px;
  line-height: 33px;
  margin-bottom: 8px;
  margin-left: -1px;
  text-align: center;
  width: 100%;
}

.PillRadioInput:checked + .RadioLabel {
  border: 1px solid var(--material-color-google-blue-500);
  color: var(--material-color-google-grey-300);
}
`;
