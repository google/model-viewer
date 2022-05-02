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
  --material-color-google-blue-500: #4285f4;
  --material-color-google-grey-300: #dadce0;
}

::slotted(paper-radio-button) {
  display: block;
  --paper-radio-button-unchecked-color: var(--material-color-google-grey-300);
  --paper-radio-button-unchecked-ink-color: var(--material-color-google-grey-300);
  --paper-radio-button-checked-color: var(--material-color-google-blue-500);
  --paper-radio-button-checked-ink-color: var(--material-color-google-blue-500);
  --paper-radio-button-label-color: var(--material-color-google-grey-300);
}
`;
