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
export const styles: CSSResult = css`.LabeledSwitchContainer {
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  line-height: 40px;
  margin: 0 16px;
}

mwc-switch {
  --mdc-theme-secondary: white;
}

.LabeledSwitch {
  align-self: center;
}

.SwitchLabel {
  font-size: 14px;
  font-weight: 500;
}

.Spacer {
  background-color: #2b2d30;
  display: flex;
  height: 2px;
}
`;
