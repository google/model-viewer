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
  --google-grey-300: #dadce0;
  --google-grey-800: #3c4043;
  display: block;
}

.Container {
  display: flex;
  flex-direction: row;
  width: 100%;
}

.Slider {
  align-items: center;
  display: flex;
  flex: auto;
  margin-right: 12px;
}

paper-slider {
  --paper-slider-knob-color: var(--google-grey-300);
  --paper-slider-active-color: var(--google-grey-300);
  --paper-slider-knob-start-color: var(--google-grey-300);
  --paper-slider-knob-start-border-color: var(--google-grey-300);
}

.InputArea {
  display: flex;
  flex: none;
  margin: auto;
}

.InputContainer {
  background: var(--google-grey-800);
  border-radius: 4px;
  display: inline-flex;
  justify-content: space-between;
  max-width: 60px;
  overflow: hidden;
  padding: 6px 12px;
}

.InlineInput {
  color: var(--google-grey-300);
  -moz-appearance:textfield;
  background: transparent;
  border: none;
  border-style: unset;
  font-size: 13px;
  cursor: pointer;
  outline: none;
  width: 100%;
}
`;
