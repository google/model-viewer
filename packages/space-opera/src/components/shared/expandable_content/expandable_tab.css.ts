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
export const styles: CSSResult = css`
:host {
  --me-theme-container-background: #202124;
}

.TabHeader{
  cursor: pointer;
  display: flex;
  font-size: 14px;
  justify-content: space-between;
  line-height: 40px;
  padding: 0 16px;
  color: var(--expandable-section-text);
  background-color: var(--me-theme-container-background);
  align-items: center;
  font-weight: 500;
}

.sticky-container {
  white-space: nowrap;
  display: flex;
  align-items: center;
  cursor: default;
  font-size: 14px;
  color: var(--expandable-section-text);
  background-color: var(--me-theme-container-background);
  padding: 2px 16px;
}

.StickyWithLineHeight {
  line-height: 40px;
  padding: 0px 16px;
}

.upload {
  --mdc-icon-button-size: 32px;
  margin: 0;
}

.DisabledTabHeader {
  color: #888;
}

.TabLabel {
  position: relative;
  color: var(--expandable-section-text);
}

.TabLabel .exportInfoIcon {
  position: relative;
  top: 3px;
}

.sticky-label {
  margin-right: 5px;
  font-size: 14px;
  color: var(--expandable-section-text);
}

.IconArea {
  display: inline;
  height: 20px;
  pointer-events: none;
  position: relative;
  margin-top: -5px;
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
  background-color: var(--me-theme-container-background);
}

.TabContent[open],
.SectionContent[open] {
  background-color: var(--me-theme-container-background);
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
  background-color: var(--me-theme-container-background);
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

.sticky {
  position: sticky;
  z-index: 10;
  top: 0;
  background-color: var(--me-theme-container-background);
  font-weight: 500;
}

`;
