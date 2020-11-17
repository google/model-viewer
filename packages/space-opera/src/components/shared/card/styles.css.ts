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
.card {
  transition: 0.3s;
  width: 100%;
  border-radius: 5px;
  background: var(--expandable-section-background);
  border: 1px solid var(--card-border-color);

  display: inline-flex;
  flex-grow: 1;
}

.header-container {
  white-space: nowrap;
  display: flex;
  align-items: center;
  padding-bottom: 5px;
}

.header {
  margin-top: 0;
  margin-right: 5px;
  font-size: 16px;
  color: var(--expandable-section-text);
}

.upload {
  --mdc-icon-button-size: 32px;
  margin: 0;
}

.container {
  padding: 4px 4px;
  width: 100%;
}

.noPad {
  padding-bottom: 0px;
}

.content-container {
  padding: 0px 10px 0px 0px;
}

.error {
  border: 1px solid #E53935;
  background: #EF5350;
}
`;