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
  --me-swatch-border-color: white;
  --material-color-google-grey-800: #3c4043;
  --material-color-google-grey-900: #202124;
}

.NullTextureSquare {
  background:linear-gradient(to top right,
             rgba(0,0,0,0) 0%,
             rgba(0,0,0,0) calc(50% - 0.8px),
             rgba(255,0,0,1) 50%,
             rgba(0,0,0,0) calc(50% + 0.8px),
             rgba(0,0,0,0) 100%);
  background-color: white;
  border-radius: 3px;
  border: 1px solid var(--me-swatch-border-color);
  cursor: pointer;
  height: calc(var(--me-swatch-size) - 2px);
  width: calc(var(--me-swatch-size) - 2px);
}

.NullTextureSquareInList{
    background:linear-gradient(to top right,
             rgba(0,0,0,0) 0%,
             rgba(0,0,0,0) calc(50% - 0.8px),
             rgba(255,0,0,1) 50%,
             rgba(0,0,0,0) calc(50% + 0.8px),
             rgba(0,0,0,0) 100%);
  background-color: white;
  cursor: pointer;
  height: calc(var(--me-swatch-size) - 2px);
  width: calc(var(--me-swatch-size) - 2px);
}

.PickerContentContainer {
  background: var(--material-color-google-grey-800);
  display: flex;
  flex-direction: column;
  width: 214px;
}

.TextureImage {
  background: 'https://ssl.gstatic.com/vr/poly/ui/transparent.svg';
  background-size: 51%;
  height: calc(var(--me-swatch-size) - 2px);
  width: calc(var(--me-swatch-size) - 2px);
  cursor: pointer;
}

.TextureList {
  align-content: flex-start;
  align-self: stretch;
  background-color: var(--material-color-google-grey-900);
  display: flex;
  flex-wrap: wrap;
  height: 150px;
  overflow-y: scroll;
}

.TextureOptionInput {
  display: none;
}

.TexturePanel {
  padding: 15px 15px 0;
}

.TextureSquare {
  background-color: white;
  border-radius: 3px;
  border: 1px solid var(--me-swatch-border-color);
  height: calc(var(--me-swatch-size) - 2px);
  width: calc(var(--me-swatch-size) - 2px);
}

.TextureSquare > .TextureImage {
  mix-blend-mode: multiply;
}
`;
