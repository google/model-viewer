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
  --me-swatch-size: 48px;
  --material-color-google-grey-800: #3c4043;
}

.ColorPickerContent {
  width: 200px;
  display: block;
  background: var(--material-color-google-grey-800);
  padding: 10px;
}

.Thumbnail {
  height: calc(var(--me-swatch-size) - 2px);
  width: calc(var(--me-swatch-size) - 2px);
  border-radius: 3px;
  border: 1px solid white;
}

.HueSlider {
  -webkit-appearance: none;
  background: linear-gradient(to right,hsl(0,100%,50%),hsl(60,100%,50%),hsl(120,100%,50%),hsl(180,100%,50%),hsl(240,100%,50%),hsl(300,100%,50%),hsl(360,100%,50%));
  border-radius: 5px;
  height: 10px;
  margin-top: 10px;
  outline: none;
  width: 100%;
}

.HexInput {
  background: #202124;    /* GOOGLE GREY 900 */
  border-radius: 4px;
  border: none;
  color: #dadce0;         /* GOOGLE GREY 300 */
  font-size: 16px;
  height: 20px;
  margin-top: 18px;
  outline: none;
  padding: 5px 10px;
  width: calc(100% - 20px);
}
`;
