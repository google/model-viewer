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
export const styles: CSSResult = css`
:host {
  --me-theme-container-background: #2b2d30;
}

.TabHeader{
  cursor: pointer;
  display: flex;
  font-size: 14px;
  font-weight: 500;
  justify-content: space-between;
  line-height: 40px;
  padding: 0 16px;
  color: #5F5F5F;
  background-color: white;
}

.DisabledTabHeader {
  color: #888;
}

.TabLabel {
  position: relative;
  color: #5F5F5F;
}

.TabLabel .exportInfoIcon {
  position: relative;
  top: 3px;
}

.IconArea {
  display: inline;
  height: 20px;
  pointer-events: none;
  position: relative;
}

.ArrowIcon {
  left: -24px;
  position: absolute;
  top: 10px;
}

.ArrowIcon.isVisible {
  display: inherit;
}

.ArrowIcon.isHidden {
  display: none;
}

.TabContent,
.SectionContent {
  max-height: 0;
  overflow: hidden;
  padding: 0 20px;
  transition: max-height 500ms ease-in-out;
  background-color: white;
}

.TabContent[open],
.SectionContent[open] {
  background-color: white;
  padding: 20px;
  overflow: unset;
  max-height: none;
  transition: max-height 500ms ease-in-out;
}

.RadioButtonExpandableContent {
  max-height: 0;
  overflow: hidden;
  padding: 0;
}

.RadioButtonExpandableContent[open] {
  background-color: white;
  padding: 0;
  overflow: unset;
  max-height: none;
}

.CheckboxHeader {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
  padding-bottom: 8px;
}

.Spacer {
  background-color: white;
  display: flex;
  height: 2px;
}

.expandableTab {
  border-top: 1px solid #5F5F5F;
}

.sticky {
  position: sticky;
  z-index: 100;
  top: 0;
  cursor: default;
  border-bottom: 2px solid #5F5F5F;
}
`;
