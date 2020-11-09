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
  background: var(--card-background-color);

  display: inline-flex;
  flex-grow: 1;
  margin: auto 0 10px auto;
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
  font-size: 12px;
  color: var(--title-color);
}

.upload {
  --mdc-icon-button-size: 32px;
  margin: 0;
}


.card:hover {
  box-shadow: 0 1px 4px 3px rgba(255, 255, 255, .15);
}

.container {
  padding: 4px 4px;
  width: 100%;
}

.content-container {
  padding: 5px 10px 5px 10px;
}
`;