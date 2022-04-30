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
  color: #dadce0;  /* GOOGLE_GREY_300 */
  display: block;
  font-family: Roboto;
}

.SectionRow {
  display: flex;
  justify-content: space-between;
}

.RowLabel {
  font-size: 14px;
  flex-direction: row;
  font-weight: 500;
  justify-content: space-between;
  margin: auto 12px auto 0;
}

.RowContent {
  display: inline-flex;
  flex-grow: 1;
  margin: auto 0 auto auto;
  max-width: 240px;
}
`;
