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
export const styles: CSSResult = css`.EditingMaterial {
  padding-bottom: 5px;
}

.MaterialInfo {
  display: flex;
  flex-direction: column;
  padding-left: 15px;
}

.TexturePickerContainer {
  width: 100%;
}

.RevertButton {
  float: right;
  --mdc-icon-button-size: 32px;
}

.TexturePickerContainer .RevertButton {
  padding: 9px 0;
}

.CheckboxContainer .RevertButton {
  padding: 4px 0;
}

.DropdownContainer .RevertButton {
  padding: 6px 0;
}

.MRSliderLabel {
  font-size: 14px;
  font-weight: 500;
}

.MRSlider {
  margin-left: -15px;
  width: calc(100% - 32px);
}

.MRSliders {
  display: flex;
  flex-direction: column;
  padding: 15px 0 5px 0;
}

.SectionLabel {
  font-size: 14px;
  font-weight: 500;
}

.DropdownContainer me-dropdown {
  width: calc(100% - 40px);
}

.TopMargin {
  margin-top: 10px;
}

.EditableSelector {
  display: flex;
}
`;
